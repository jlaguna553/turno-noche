import type { CSSProperties } from 'react';
import type { FocusInfo, Snapshot } from '../game/core/bus';
import { formatTime } from './TitleScreen';

interface SubtitleState {
  id: number;
  speaker: string;
  text: string;
  tone: 'vera' | 'self' | 'entity';
}

interface HudProps {
  snapshot: Snapshot;
  focus: FocusInfo | null;
  subtitle: SubtitleState | null;
  zone: string | null;
  waypoint: { x: number; z: number; label: string; distance: number } | null;
  pose: { x: number; z: number; yaw: number };
  danger: number;
  hidden: boolean;
  battery: { charge: number; on: boolean };
  fps: number;
  touch: boolean;
  onPause: () => void;
}

export default function Hud({
  snapshot,
  focus,
  subtitle,
  zone,
  waypoint,
  pose,
  danger,
  hidden,
  battery,
  fps,
  touch,
  onPause,
}: HudProps) {
  const objective = snapshot.objective;
  const compass = waypoint ? bearing(pose, waypoint) : null;
  const hearbeat = danger > 0.55 ? 'is-pounding' : danger > 0.28 ? 'is-tight' : '';
  const style = { '--danger': danger.toFixed(3) } as CSSProperties;
  const batteryLow = battery.charge < 18;

  return (
    <div className={`hud ${hearbeat}`} style={style}>
      <div className="danger-overlay" aria-hidden="true" />
      <div className={`danger-scan ${danger > 0.6 ? 'is-on' : ''}`} aria-hidden="true" />

      <header className="hud-objective panel">
        <p className="kicker">OBJETIVO · SECTOR 07</p>
        <h2>{objective.title}</h2>
        <p className="hud-detail">{objective.detail}</p>
        <div className="pips" aria-label={`${objective.progress} de ${objective.total}`}>
          {Array.from({ length: objective.total }).map((_, index) => (
            <span key={index} className={index < objective.progress ? 'is-done' : ''} />
          ))}
          <b>
            {objective.progress}/{objective.total}
          </b>
        </div>
      </header>

      <aside className="hud-status">
        <div className="rec">
          <span className="rec-dot" /> REC {formatTime(snapshot.elapsed)}
        </div>
        <div className={`battery ${batteryLow ? 'is-low' : ''} ${battery.on ? 'is-on' : ''}`}>
          <span className="battery-label">
            LINTERNA {battery.on ? 'ON' : 'OFF'}
          </span>
          <span className="battery-bar">
            <i style={{ width: `${Math.max(0, Math.min(100, battery.charge))}%` }} />
          </span>
          <b>{Math.round(battery.charge)}%</b>
        </div>
        <div className="status-row">
          <span>NOTAS {snapshot.notes.length}/{snapshot.notesTotal}</span>
          <span>MUERTES {snapshot.deaths}</span>
        </div>
        <button type="button" className="hud-pause" onClick={onPause} aria-label="Pausa">
          II
        </button>
      </aside>

      {zone && !hidden && (
        <div className="zone-banner" key={zone}>
          <span aria-hidden="true" />
          {zone}
        </div>
      )}

      {waypoint && compass !== null && !hidden && (
        <div className="compass" style={{ '--bearing': `${compass}deg` } as CSSProperties}>
          <span className="compass-arrow" aria-hidden="true">
            ▲
          </span>
          <span className="compass-label">
            {waypoint.label} · {waypoint.distance} m
          </span>
        </div>
      )}

      <div className={`crosshair ${focus ? 'is-active' : ''}`} aria-hidden="true">
        <i />
      </div>

      {focus && !hidden && (
        <div className="focus-prompt">
          <span className="focus-key">[E]</span> {focus.prompt.replace('[E]', '').trim()} ·{' '}
          <em>{focus.label}</em>
        </div>
      )}

      {hidden && <div className="hide-mask" aria-hidden="true" />}

      {hidden && (
        <div className="hidden-prompt">
          <p>ESCONDIDO</p>
          <span>Respira despacio. [E] para salir.</span>
        </div>
      )}

      {subtitle && (
        <div className={`subtitle tone-${subtitle.tone}`} key={subtitle.id}>
          <span className="subtitle-speaker">{subtitle.speaker}</span>
          <p>{subtitle.text}</p>
        </div>
      )}

      <footer className="hud-foot">
        {touch ? (
          <span>STICK: MOVER · ARRASTRE: MIRAR · USAR: INTERACTUAR</span>
        ) : (
          <span>WASD MOVER · E INTERACTUAR · F LINTERNA · TAB DIARIO · ESC PAUSA</span>
        )}
        <span className="fps">{fps} FPS</span>
      </footer>
    </div>
  );
}

function bearing(
  pose: { x: number; z: number; yaw: number },
  point: { x: number; z: number },
): number {
  const dx = point.x - pose.x;
  const dz = point.z - pose.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.001) return 0;
  const nx = dx / length;
  const nz = dz / length;
  const rightX = Math.cos(pose.yaw);
  const rightZ = -Math.sin(pose.yaw);
  const forwardX = -Math.sin(pose.yaw);
  const forwardZ = -Math.cos(pose.yaw);
  const right = nx * rightX + nz * rightZ;
  const forward = nx * forwardX + nz * forwardZ;
  return Math.round((Math.atan2(right, forward) * 180) / Math.PI);
}
