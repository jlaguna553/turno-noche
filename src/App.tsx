import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EndingId, FocusInfo, Settings, Snapshot } from './game/core/bus';
import { bus } from './game/core/bus';
import type { Engine } from './game/engine';
import { clearSave, hasSave, loadRun, loadSettings, saveSettings } from './game/core/save';
import TitleScreen from './ui/TitleScreen';
import IntroSequence from './ui/IntroSequence';
import Hud from './ui/Hud';
import TouchControls from './ui/TouchControls';
import PauseMenu from './ui/PauseMenu';
import DeathScreen from './ui/DeathScreen';
import EndingChoice from './ui/EndingChoice';
import EndingScreen from './ui/EndingScreen';
import Journal from './ui/Journal';
import { NOTES } from './game/logic/story';

type Phase = 'boot' | 'title' | 'intro' | 'playing' | 'dead' | 'finished';

interface SubtitleState {
  id: number;
  speaker: string;
  text: string;
  tone: 'vera' | 'self' | 'entity';
}

interface ToastItem {
  id: number;
  kind: 'info' | 'warning' | 'note';
  title: string;
  body: string;
}

export default function App() {
  const touch = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches,
    [],
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const toastSeq = useRef(0);
  const timers = useRef<number[]>([]);
  const overlayRef = useRef(false);
  const phaseRef = useRef<Phase>('boot');

  const [phase, setPhase] = useState<Phase>('boot');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [saved, setSaved] = useState(() => loadRun() !== null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [focus, setFocus] = useState<FocusInfo | null>(null);
  const [subtitle, setSubtitle] = useState<SubtitleState | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [waypoint, setWaypoint] = useState<{ x: number; z: number; label: string; distance: number } | null>(null);
  const [pose, setPose] = useState({ x: 0, z: 0, yaw: 0 });
  const [battery, setBattery] = useState({ charge: 68, on: false });
  const [danger, setDanger] = useState(0.08);
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const [journal, setJournal] = useState(false);
  const [death, setDeath] = useState<{ cause: string; deaths: number } | null>(null);
  const [endingReady, setEndingReady] = useState(false);
  const [ending, setEnding] = useState<EndingId | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [fps, setFps] = useState(0);

  phaseRef.current = phase;

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const refreshSnapshot = useCallback(() => {
    setSnapshot(engineRef.current?.getSnapshot() ?? null);
  }, []);

  const pushToast = useCallback(
    (item: Omit<ToastItem, 'id'>) => {
      toastSeq.current += 1;
      const id = toastSeq.current;
      setToasts((current) => [...current.slice(-3), { ...item, id }]);
      after(5200, () => setToasts((current) => current.filter((toast) => toast.id !== id)));
    },
    [after],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let engine: Engine | null = null;

    const unsubscribers: Array<() => void> = [
      bus.on('focus:change', ({ focus: next }) => setFocus(next)),
      bus.on('player:pose', (next) => setPose(next)),
      bus.on('perf', ({ fps: value }) => setFps(value)),
      bus.on('battery:change', (next) => setBattery({ charge: next.charge, on: next.on })),
      bus.on('danger:change', ({ danger: value }) => setDanger(value)),
      bus.on('hide:change', ({ hidden: value }) => setHidden(value)),
      bus.on('subtitle', (next) => setSubtitle(next)),
      bus.on('zone:enter', ({ name }) => {
        setZone(name);
        after(3900, () => setZone(null));
      }),
      bus.on('waypoint', ({ waypoint: next }) => setWaypoint(next)),
      bus.on('objective:change', () => refreshSnapshot()),
      bus.on('note:found', ({ note, total, max }) => {
        pushToast({ kind: 'note', title: note.title, body: `${note.author} · ${total}/${max}` });
        refreshSnapshot();
      }),
      bus.on('toast', (next) => pushToast(next)),
      bus.on('death', (next) => {
        overlayRef.current = true;
        setDeath(next);
        setPhase('dead');
        setPaused(false);
        setJournal(false);
        refreshSnapshot();
      }),
      bus.on('ending:ready', (next) => {
        overlayRef.current = true;
        setEndingReady(true);
        refreshSnapshot();
        void next;
      }),
      bus.on('ending:show', ({ ending: chosen }) => {
        setEnding(chosen);
        setEndingReady(false);
        setPhase('finished');
        setPaused(false);
        refreshSnapshot();
      }),
      bus.on('capture:change', ({ locked }) => {
        if (locked) return;
        if (phaseRef.current !== 'playing' || overlayRef.current) return;
        engineRef.current?.pause();
        setPaused(true);
      }),
      bus.on('settings:changed', ({ settings: next }) => setSettings(next)),
      bus.on('engine:error', ({ message }) => setError(message)),
    ];

    (async () => {
      try {
        const { Engine: EngineCtor } = await import('./game/engine');
        if (disposed) return;
        engine = new EngineCtor(canvas);
        engineRef.current = engine;
        await engine.init();
        if (disposed) return;
        setSnapshot(engine.getSnapshot());
        setSaved(hasSave());
        setPhase('title');
        setReady(true);
      } catch (cause) {
        if (disposed) return;
        setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el motor 3D');
        setPhase('title');
      }
    })();

    return () => {
      disposed = true;
      for (const off of unsubscribers) off();
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current = [];
      overlayRef.current = false;
      engine?.dispose();
      engineRef.current = null;
    };
  }, [after, pushToast, refreshSnapshot]);

  useEffect(() => {
    if (!subtitle) return;
    const id = window.setTimeout(() => {
      setSubtitle((current) => (current && current.id === subtitle.id ? null : current));
    }, 9200);
    return () => window.clearTimeout(id);
  }, [subtitle]);

  const applySettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.applySettings(next);
  }, []);

  const goFullscreen = useCallback(() => {
    if (!touch) return;
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const request = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
    request?.().catch(() => undefined);
    const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
    orientation?.lock?.('landscape').catch(() => undefined);
  }, [touch]);

  const beginRun = useCallback(() => {
    goFullscreen();
    overlayRef.current = false;
    setDeath(null);
    setEnding(null);
    setPaused(false);
    setJournal(false);
    setPhase('playing');
    engineRef.current?.startSession();
    refreshSnapshot();
  }, [goFullscreen, refreshSnapshot]);

  const startNew = useCallback(() => {
    goFullscreen();
    if (hasSave()) {
      clearSave();
      window.location.reload();
      return;
    }
    setPhase('intro');
  }, [goFullscreen]);

  const continueRun = useCallback(() => {
    goFullscreen();
    beginRun();
  }, [beginRun, goFullscreen]);

  const openPause = useCallback(() => {
    if (phaseRef.current !== 'playing' || overlayRef.current) return;
    overlayRef.current = true;
    engineRef.current?.pause();
    setPaused(true);
    setJournal(false);
    refreshSnapshot();
  }, [refreshSnapshot]);

  const closePause = useCallback(() => {
    overlayRef.current = false;
    setPaused(false);
    engineRef.current?.resume();
  }, []);

  const openJournal = useCallback(() => {
    if (phaseRef.current !== 'playing' || overlayRef.current) return;
    overlayRef.current = true;
    engineRef.current?.pause();
    setJournal(true);
    setPaused(false);
    refreshSnapshot();
  }, [refreshSnapshot]);

  const closeJournal = useCallback(() => {
    overlayRef.current = false;
    setJournal(false);
    engineRef.current?.resume();
  }, []);

  const retry = useCallback(() => {
    overlayRef.current = false;
    setDeath(null);
    setPhase('playing');
    engineRef.current?.retry();
    refreshSnapshot();
  }, [refreshSnapshot]);

  const chooseEnding = useCallback((choice: EndingId) => {
    engineRef.current?.chooseEnding(choice);
  }, []);

  const toMenu = useCallback(() => {
    window.location.reload();
  }, []);

  const backToTitle = useCallback(() => {
    setPhase('title');
    setEnding(null);
    setEndingReady(false);
    setPaused(false);
    setDeath(null);
    overlayRef.current = false;
    setSnapshot(engineRef.current?.getSnapshot() ?? null);
    window.location.reload();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Tab') {
        if (phaseRef.current !== 'playing' || endingReady || death) return;
        event.preventDefault();
        if (journal) closeJournal();
        else openJournal();
        return;
      }
      if (event.code === 'Escape') {
        if (journal) {
          event.preventDefault();
          closeJournal();
          return;
        }
        if (paused) {
          event.preventDefault();
          closePause();
          return;
        }
        if (phaseRef.current === 'playing' && !endingReady && !death) {
          event.preventDefault();
          openPause();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeJournal, closePause, death, endingReady, journal, openPause, openJournal, paused]);

  const notes = useMemo(() => NOTES.filter((note) => snapshot?.notes.includes(note.id)), [snapshot?.notes]);

  return (
    <div className={`game-shell ${touch ? 'is-touch' : ''} phase-${phase}`}>
      <canvas ref={canvasRef} className="game-canvas" aria-label="Juego en primera persona" />

      {phase === 'playing' && snapshot && !endingReady && !death && (
        <Hud
          snapshot={snapshot}
          focus={focus}
          subtitle={subtitle}
          zone={zone}
          waypoint={waypoint}
          pose={pose}
          danger={danger}
          hidden={hidden}
          battery={battery}
          fps={fps}
          touch={touch}
          onPause={openPause}
        />
      )}

      {phase === 'playing' && !paused && !journal && !endingReady && !death && (
        <div className="crt-overlay" aria-hidden="true" />
      )}

      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.kind}`}>
              <strong>{toast.title}</strong>
              <span>{toast.body}</span>
            </div>
          ))}
        </div>
      )}

      {phase === 'boot' && (
        <TitleScreen
          ready={false}
          error={null}
          hasSave={false}
          settings={settings}
          snapshot={null}
          onStart={startNew}
          onContinue={continueRun}
          onSettings={applySettings}
        />
      )}

      {phase === 'title' && (
        <TitleScreen
          ready={ready}
          error={error}
          hasSave={saved}
          settings={settings}
          snapshot={snapshot}
          onStart={startNew}
          onContinue={continueRun}
          onSettings={applySettings}
        />
      )}

      {phase === 'intro' && <IntroSequence onFinish={beginRun} onSkip={beginRun} />}

      {phase === 'playing' && paused && !journal && !endingReady && !death && (
        <PauseMenu
          settings={settings}
          onResume={closePause}
          onSettings={applySettings}
          onJournal={openJournal}
          onMenu={toMenu}
        />
      )}

      {journal && snapshot && (
        <Journal
          notes={notes}
          snapshot={snapshot}
          onClose={closeJournal}
        />
      )}

      {phase === 'playing' && touch && !paused && !journal && !endingReady && !death && (
        <TouchControls
          hidden={hidden}
          flashlightOn={battery.on}
          onStick={(x, y) => engineRef.current?.setStick(x, y)}
          onLook={(dx, dy) => engineRef.current?.addLook(dx, dy)}
          onTap={(action) => engineRef.current?.tapButton(action)}
          onHold={(action, held) => engineRef.current?.setVirtualButton(action, held)}
          onJournal={openJournal}
          onPause={openPause}
        />
      )}

      {phase === 'playing' && endingReady && (
        <EndingChoice
          snapshot={snapshot}
          onChoose={chooseEnding}
        />
      )}

      {phase === 'dead' && death && <DeathScreen death={death} onRetry={retry} onMenu={toMenu} />}

      {phase === 'finished' && ending && snapshot && (
        <EndingScreen snapshot={snapshot} ending={ending} onMenu={backToTitle} onNewGame={startNew} />
      )}

      {touch && phase === 'playing' && !paused && !journal && !endingReady && !death && (
        <div className="rotate-hint" aria-hidden="true">
          <p>GIRA EL DISPOSITIVO</p>
          <span>TURNO NOCHE se juega en horizontal</span>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
