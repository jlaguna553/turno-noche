import type { NoteRecord, Snapshot } from '../game/core/bus';
import { NOTES } from '../game/logic/story';
import { formatTime } from './TitleScreen';

interface JournalProps {
  notes: NoteRecord[];
  snapshot: Snapshot;
  onClose: () => void;
}

export default function Journal({ notes, snapshot, onClose }: JournalProps) {
  const missing = NOTES.length - notes.length;

  return (
    <div className="overlay journal-overlay" role="dialog" aria-modal="true" aria-label="Diario de notas">
      <div className="overlay-card journal-card">
        <header className="journal-head">
          <div>
            <p className="kicker">DIARIO DEL TURNO · SECTOR 07</p>
            <h2>NOTAS RECUPERADAS</h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            CERRAR [TAB]
          </button>
        </header>

        <div className="journal-stats">
          <span>
            NOTAS <b>{notes.length}/{NOTES.length}</b>
          </span>
          <span>
            BREAKERS <b>{Object.values(snapshot.breakers).filter(Boolean).length}/3</b>
          </span>
          <span>
            SESIÓN <b>{formatTime(snapshot.elapsed)}</b>
          </span>
          <span>
            MUERTES <b>{snapshot.deaths}</b>
          </span>
        </div>

        <div className="journal-body">
          {notes.length === 0 && (
            <p className="dim">
              Todavía no ha recogido ninguna nota. Las hojas amarillas con tinta oscura se
              iluminan con la linterna.
            </p>
          )}
          {notes.map((note) => (
            <article key={note.id} className="note-card">
              <p className="note-meta">
                {note.zone.toUpperCase()} · {note.author}
              </p>
              <h3>{note.title}</h3>
              {note.lines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </article>
          ))}
          {missing > 0 && (
            <p className="tiny dim">
              Quedan {missing} notas en la planta. Algunas están en taquillas que no deberían estar
              abiertas.
            </p>
          )}

          <div className="note-card controls-card">
            <h3>CONTROLES</h3>
            <p>
              <kbd>WASD</kbd> mover · <kbd>SHIFT</kbd> correr · <kbd>CTRL</kbd> agacharse ·{' '}
              <kbd>E</kbd> interactuar / esconderse · <kbd>F</kbd> linterna · <kbd>TAB</kbd> diario ·{' '}
              <kbd>ESC</kbd> pausa
            </p>
            <p className="dim">
              Correr hace ruido. La linterna alarga su alcance visual. Las taquillas con la marca
              blanca sirven para esconderse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
