import { DEATH_LINES } from '../game/logic/story';

interface DeathScreenProps {
  death: { cause: string; deaths: number };
  onRetry: () => void;
  onMenu: () => void;
}

export default function DeathScreen({ death, onRetry, onMenu }: DeathScreenProps) {
  const line = DEATH_LINES[(death.deaths - 1) % DEATH_LINES.length] ?? DEATH_LINES[0];

  return (
    <div className="death-screen" role="dialog" aria-modal="true" aria-label="Derrota">
      <div className="death-hands" aria-hidden="true" />
      <p className="kicker">SEÑAL PERDIDA · CÁMARA 07</p>
      <h1 className="death-title" data-text="TE ENCONTRÓ">
        TE ENCONTRÓ
      </h1>
      <p className="death-line">{line}</p>
      <p className="death-cause">{death.cause}</p>
      <p className="death-count">MUERTE {String(death.deaths).padStart(2, '0')}</p>
      <div className="overlay-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          VOLVER A INTENTARLO
        </button>
        <button type="button" className="btn btn-ghost" onClick={onMenu}>
          ABANDONAR
        </button>
      </div>
      <p className="tiny dim">La partida se reanuda en la garita. Los breakers rearmados se conservan.</p>
    </div>
  );
}
