import type { EndingId, Snapshot } from '../game/core/bus';
import { ENDINGS } from '../game/logic/story';
import { formatTime } from './TitleScreen';

interface EndingChoiceProps {
  snapshot: Snapshot | null;
  onChoose: (ending: EndingId) => void;
}

export default function EndingChoice({ snapshot, onChoose }: EndingChoiceProps) {
  return (
    <div className="overlay ending-choice" role="dialog" aria-modal="true" aria-label="Decisión final">
      <div className="overlay-card ending-card">
        <p className="kicker">MONTACARGAS OPERATIVO · ELECCIÓN FINAL</p>
        <h2>NO HAY UNA SALIDA LIMPIA</h2>
        <p className="dim">
          La puerta está abierta. El panel de B3 sigue respondiendo. Lo que haga ahora decide qué
          queda dentro de la planta.
        </p>

        <div className="choice-grid">
          <button
            type="button"
            className="choice-card"
            data-action="ascend"
            onClick={() => onChoose('ascend')}
          >
            <span className="choice-index">A</span>
            <strong>{ENDINGS.ascend.title}</strong>
            <span className="choice-sub">{ENDINGS.ascend.subtitle}</span>
            <p>Sube y cierra la puerta. La planta queda encendida, esperando al siguiente turno.</p>
          </button>

          <button
            type="button"
            className="choice-card is-danger"
            data-action="flood"
            onClick={() => onChoose('flood')}
          >
            <span className="choice-index">B</span>
            <strong>{ENDINGS.flood.title}</strong>
            <span className="choice-sub">{ENDINGS.flood.subtitle}</span>
            <p>Abre la válvula de fondo. El pozo sube. Usted no sale. Él tampoco.</p>
          </button>

          {snapshot?.secretUnlocked ? (
            <button
              type="button"
              className="choice-card is-secret"
              data-action="stay"
              onClick={() => onChoose('stay')}
            >
              <span className="choice-index">C</span>
              <strong>{ENDINGS.stay.title}</strong>
              <span className="choice-sub">{ENDINGS.stay.subtitle}</span>
              <p>Cierra la puerta desde dentro. Devuelve la llave. La planta le reconoce como relevo.</p>
            </button>
          ) : (
            <div className="choice-card is-locked" aria-disabled="true">
              <span className="choice-index">C</span>
              <strong>???</strong>
              <span className="choice-sub">SALIDA BLOQUEADA</span>
              <p>Requiere las 3 placas de tripulación y los 3 fusibles de emergencia.</p>
            </div>
          )}
        </div>

        {snapshot && (
          <p className="tiny dim ending-stats">
            NOTAS {snapshot.notes.length}/{snapshot.notesTotal} · FICHAS {snapshot.tags.length}/{snapshot.tagsTotal} ·
            FUSIBLES {snapshot.fuses.length}/{snapshot.fusesTotal} · SESIÓN {formatTime(snapshot.elapsed)} · MUERTES{' '}
            {snapshot.deaths} · BREAKERS {Object.values(snapshot.breakers).filter(Boolean).length}/3
          </p>
        )}
        <p className="tiny dim">La decisión se guarda. No se puede deshacer sin empezar un turno nuevo.</p>
      </div>
    </div>
  );
}
