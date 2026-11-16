import type { Settings } from '../game/core/bus';
import SettingsPanel from './SettingsPanel';

interface PauseMenuProps {
  settings: Settings;
  onResume: () => void;
  onSettings: (settings: Settings) => void;
  onJournal: () => void;
  onMenu: () => void;
}

export default function PauseMenu({ settings, onResume, onSettings, onJournal, onMenu }: PauseMenuProps) {
  return (
    <div className="overlay pause-overlay" role="dialog" aria-modal="true" aria-label="Pausa">
      <div className="overlay-card pause-card">
        <p className="kicker">TURNO EN PAUSA</p>
        <h2>LA PLANTA ESPERA</h2>
        <p className="dim">
          Nada se mueve mientras el parte está abierto. Aproveche para revisar notas o ajustar el
          sonido.
        </p>
        <div className="overlay-actions">
          <button type="button" className="btn btn-primary" onClick={onResume}>
            CONTINUAR
          </button>
          <button type="button" className="btn" onClick={onJournal}>
            DIARIO DE NOTAS
          </button>
          <button type="button" className="btn btn-ghost" onClick={onMenu}>
            ABANDONAR TURNO
          </button>
        </div>
        <div className="pause-settings">
          <p className="kicker">AJUSTES</p>
          <SettingsPanel settings={settings} onChange={onSettings} />
        </div>
      </div>
    </div>
  );
}
