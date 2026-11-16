import { useState } from 'react';
import type { Settings, Snapshot } from '../game/core/bus';
import { GAME_SUBTITLE, GAME_TAGLINE, GAME_TITLE, NOTES } from '../game/logic/story';
import SettingsPanel from './SettingsPanel';

interface TitleScreenProps {
  ready: boolean;
  error: string | null;
  hasSave: boolean;
  settings: Settings;
  snapshot: Snapshot | null;
  onStart: () => void;
  onContinue: () => void;
  onSettings: (settings: Settings) => void;
}

type Tab = 'brief' | 'controls' | 'settings' | 'credits';

export default function TitleScreen({
  ready,
  error,
  hasSave,
  settings,
  snapshot,
  onStart,
  onContinue,
  onSettings,
}: TitleScreenProps) {
  const [tab, setTab] = useState<Tab>('brief');
  const [confirmNew, setConfirmNew] = useState(false);
  const pulled = snapshot ? Object.values(snapshot.breakers).filter(Boolean).length : 0;

  return (
    <div className="title-screen">
      <div className="title-noise" aria-hidden="true" />
      <header className="title-head">
        <p className="kicker">ESTACIÓN DE BOMBEO · SECTOR 07 · 03:47</p>
        <h1 className="game-title" data-text={GAME_TITLE}>
          {GAME_TITLE}
        </h1>
        <p className="title-sub">{GAME_SUBTITLE}</p>
        <p className="title-tagline">{GAME_TAGLINE}</p>
      </header>

      <div className="title-grid">
        <section className="title-warning" aria-label="Advertencia de contenido">
          <p className="kicker">AVISO AL OPERARIO</p>
          <p>
            Terror psicológico. Sustos repentinos. Luces intermitentes y sonido de alta intensidad.
            Se recomienda jugar con auriculares y con la luz apagada.
          </p>
          <p className="tiny">No apto para personas sensibles a la oscuridad, al ruido o a las taquillas cerradas.</p>
        </section>

        <section className="title-panel">
          <nav className="tabs" aria-label="Secciones">
            {(
              [
                ['brief', 'PARTE'],
                ['controls', 'CONTROLES'],
                ['settings', 'AJUSTES'],
                ['credits', 'CRÉDITOS'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'is-selected' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="title-content">
            {tab === 'brief' && (
              <>
                <p className="kicker">PARTE DE TURNO</p>
                {snapshot && hasSave ? (
                  <ul className="mono-list">
                    <li>
                      BREAKERS <span>{pulled}/3</span>
                    </li>
                    <li>
                      NOTAS <span>{snapshot.notes.length}/{NOTES.length}</span>
                    </li>
                    <li>
                      FICHAS <span>{snapshot.tags.length}/{snapshot.tagsTotal}</span>
                    </li>
                    <li>
                      FUSIBLES <span>{snapshot.fuses.length}/{snapshot.fusesTotal}</span>
                    </li>
                    <li>
                      BOTELLAS <span>{snapshot.bottles}</span>
                    </li>
                    <li>
                      MUERTES <span>{snapshot.deaths}</span>
                    </li>
                    <li>
                      SESIÓN <span>{formatTime(snapshot.elapsed)}</span>
                    </li>
                    <li>
                      ESTADO <span>{snapshot.ending ? 'TURNO CERRADO' : 'EN CURSO'}</span>
                    </li>
                  </ul>
                ) : (
                  <>
                    <p className="lede">
                      Once meses cerrada. Usted es el contratista del turno de noche. Rearme los tres
                      breakers, encuentre el montacargas y no se quede quieto.
                    </p>
                    <p className="tiny dim">
                      10 notas · 3 placas de tripulación · 3 fusibles · 3 salidas · 2 tipos de criatura
                    </p>
                  </>
                )}
                <p className="tiny dim">
                  {error
                    ? error
                    : ready
                      ? 'La partida se guarda en este navegador. La PWA funciona sin conexión tras la primera carga.'
                      : 'Encendiendo generador...'}
                </p>
              </>
            )}

            {tab === 'controls' && (
              <ul className="mono-list controls-list">
                <li>
                  <kbd>WASD</kbd> <span>moverse</span>
                </li>
                <li>
                  <kbd>SHIFT</kbd> <span>correr (hace ruido)</span>
                </li>
                <li>
                  <kbd>CTRL</kbd> <span>agacharse (silencio)</span>
                </li>
                <li>
                  <kbd>E</kbd> <span>interactuar / esconderse</span>
                </li>
                <li>
                  <kbd>F</kbd> <span>linterna</span>
                </li>
                <li>
                  <kbd>Q</kbd> <span>lanzar botella (ruido)</span>
                </li>
                <li>
                  <kbd>TAB</kbd> <span>diario de notas</span>
                </li>
                <li>
                  <kbd>ESC</kbd> <span>pausa</span>
                </li>
              </ul>
            )}

            {tab === 'settings' && <SettingsPanel settings={settings} onChange={onSettings} />}

            {tab === 'credits' && (
              <div className="credits">
                <p className="kicker">PRODUCCIÓN</p>
                <p>
                  Código, geometría, texturas, audio y narrativa originales. Todo se genera por
                  procedimientos en el navegador: no se incluye ningún asset, modelo, sonido o marca
                  de Valve, de Half-Life ni de terceros.
                </p>
                <p className="tiny dim">
                  Inspiración estética: shooters de finales de los 90 y terror analógico. El parecido
                  es de género, no de material.
                </p>
                <ul className="mono-list">
                  <li>
                    RENDER <span>THREE.JS · WEBGL2</span>
                  </li>
                  <li>
                    FÍSICA <span>RAPIER · WASM</span>
                  </li>
                  <li>
                    UI <span>REACT 19</span>
                  </li>
                  <li>
                    AUDIO <span>WEBAUDIO PROCEDURAL</span>
                  </li>
                  <li>
                    PWA <span>SERVICE WORKER</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="title-actions">
            {hasSave && (
              <button type="button" className="btn btn-primary" disabled={!ready} onClick={onContinue}>
                {snapshot?.ending ? 'VER EL FINAL DEL TURNO' : 'CONTINUAR TURNO'}
              </button>
            )}
            <button
              type="button"
              className={`btn ${hasSave ? 'btn-ghost' : 'btn-primary'}`}
              disabled={!ready}
              onClick={() => {
                if (hasSave && !confirmNew) {
                  setConfirmNew(true);
                  return;
                }
                onStart();
              }}
            >
              {confirmNew ? 'CONFIRMAR: BORRAR PARTIDA' : hasSave ? 'NUEVA PARTIDA' : 'DESCENDER'}
            </button>
          </div>
          {!ready && !error && (
            <div className="boot-bar" role="progressbar" aria-label="Cargando motor">
              <span />
            </div>
          )}
        </section>
      </div>

      <footer className="title-foot">
        <span>TURNO NOCHE · v1.0</span>
        <span>PWA · OFFLINE · MÓVIL / ESCRITORIO</span>
        <span>HEADPHONES RECOMENDADOS</span>
      </footer>
    </div>
  );
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
