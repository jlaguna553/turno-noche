import type { EndingId, Snapshot } from '../game/core/bus';
import { ENDINGS } from '../game/logic/story';
import { formatTime } from './TitleScreen';

interface EndingScreenProps {
  snapshot: Snapshot;
  ending: EndingId;
  onMenu: () => void;
  onNewGame: () => void;
}

export default function EndingScreen({ snapshot, ending, onMenu, onNewGame }: EndingScreenProps) {
  const def = ENDINGS[ending];

  return (
    <div className={`ending-screen ending-${ending}`}>
      <div className="ending-vignette" aria-hidden="true" />
      <p className="kicker">TURNO NOCHE · {def.subtitle}</p>
      <h1 className="ending-title">{def.title}</h1>
      <div className="ending-lines">
        {def.lines.map((line, index) => (
          <p key={index} style={{ animationDelay: `${0.25 + index * 0.55}s` }}>
            {line}
          </p>
        ))}
      </div>

      <div className="ending-summary">
        <div>
          <span>NOTAS</span>
          <b>
            {snapshot.notes.length}/{snapshot.notesTotal}
          </b>
        </div>
        <div>
          <span>FICHAS</span>
          <b>
            {snapshot.tags.length}/{snapshot.tagsTotal}
          </b>
        </div>
        <div>
          <span>FUSIBLES</span>
          <b>
            {snapshot.fuses.length}/{snapshot.fusesTotal}
          </b>
        </div>
        <div>
          <span>BREAKERS</span>
          <b>{Object.values(snapshot.breakers).filter(Boolean).length}/3</b>
        </div>
        <div>
          <span>TIEMPO</span>
          <b>{formatTime(snapshot.elapsed)}</b>
        </div>
        <div>
          <span>MUERTES</span>
          <b>{snapshot.deaths}</b>
        </div>
      </div>

      <div className="overlay-actions">
        <button type="button" className="btn btn-primary" onClick={onNewGame}>
          EMPEZAR OTRO TURNO
        </button>
        <button type="button" className="btn btn-ghost" onClick={onMenu}>
          MENÚ PRINCIPAL
        </button>
      </div>
      <p className="tiny dim">
        Si encontró menos notas de las que hay, la planta todavía guarda puertas que no abrió.
      </p>
    </div>
  );
}
