import { useState } from 'react';
import type { NoteRecord, Snapshot } from '../game/core/bus';
import { BESTIARY, CREW_TAGS, FUSES, NOTES } from '../game/logic/story';
import { formatTime } from './TitleScreen';

interface JournalProps {
  notes: NoteRecord[];
  snapshot: Snapshot;
  onClose: () => void;
}

type Tab = 'notes' | 'crew' | 'bestiary' | 'controls';

export default function Journal({ notes, snapshot, onClose }: JournalProps) {
  const [tab, setTab] = useState<Tab>('notes');
  const missing = NOTES.length - notes.length;
  const collectedTags = new Set(snapshot.tags);
  const collectedFuses = new Set(snapshot.fuses);
  const bestiaryUnlocked = (unlock: 'notes' | 'tags' | 'fuses'): boolean =>
    unlock === 'notes' ? notes.length >= 2 : unlock === 'tags' ? snapshot.tags.length >= 1 : snapshot.fuses.length >= 1;

  return (
    <div className="overlay journal-overlay" role="dialog" aria-modal="true" aria-label="Diario del turno">
      <div className="overlay-card journal-card">
        <header className="journal-head">
          <div>
            <p className="kicker">DIARIO DEL TURNO · SECTOR 07</p>
            <h2>ARCHIVO DEL OPERARIO</h2>
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
            FICHAS <b>{snapshot.tags.length}/{snapshot.tagsTotal}</b>
          </span>
          <span>
            FUSIBLES <b>{snapshot.fuses.length}/{snapshot.fusesTotal}</b>
          </span>
          <span>
            BREAKERS <b>{Object.values(snapshot.breakers).filter(Boolean).length}/3</b>
          </span>
          <span>
            SESIÓN <b>{formatTime(snapshot.elapsed)}</b>
          </span>
        </div>

        <nav className="journal-tabs" aria-label="Secciones del archivo">
          {(
            [
              ['notes', 'NOTAS'],
              ['crew', 'TRIPULACIÓN'],
              ['bestiary', 'BESTIARIO'],
              ['controls', 'CONTROLES'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'is-selected' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>

        <div className="journal-body">
          {tab === 'notes' && (
            <>
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
                  Quedan {missing} notas en la planta. Algunas están en taquillas que no deberían
                  estar abiertas.
                </p>
              )}
            </>
          )}

          {tab === 'crew' && (
            <>
              <div className="crew-section">
                <p className="kicker">PLACAS DEL TURNO 07/11</p>
                <div className="crew-grid">
                  {CREW_TAGS.map((tag) => {
                    const found = collectedTags.has(tag.id);
                    return (
                      <article key={tag.id} className={`crew-card ${found ? 'is-found' : ''}`}>
                        <p className="note-meta">
                          {found ? tag.zone.toUpperCase() : 'PLACA NO RECUPERADA'}
                        </p>
                        <h3>{tag.name}</h3>
                        <span className="crew-role">{tag.role}</span>
                        {found ? (
                          tag.lines.map((line, index) => <p key={index}>{line}</p>)
                        ) : (
                          <p className="dim">Busque en {tag.zone}. La placa pesa más de lo que debería.</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="crew-section">
                <p className="kicker">FUSIBLES DE EMERGENCIA</p>
                <div className="fuse-row">
                  {FUSES.map((fuse) => {
                    const found = collectedFuses.has(fuse.id);
                    return (
                      <div key={fuse.id} className={`fuse-chip ${found ? 'is-found' : ''}`}>
                        <span>{found ? '■' : '□'}</span>
                        <div>
                          <b>{fuse.label}</b>
                          <em>{fuse.zone}</em>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="tiny dim">
                  Los tres fusibles restauran el alumbrado de emergencia. Junto a las tres placas
                  habilitan una tercera salida en el montacargas.
                </p>
              </div>
            </>
          )}

          {tab === 'bestiary' && (
            <>
              <div className="crew-section">
                <p className="kicker">ESPECÍMENES REGISTRADOS</p>
                <div className="bestiary-grid">
                  {BESTIARY.map((entry) => {
                    const unlocked = bestiaryUnlocked(entry.unlock);
                    return (
                      <article key={entry.id} className={`bestiary-card ${unlocked ? 'is-found' : ''}`}>
                        <p className="note-meta">{unlocked ? entry.subtitle : 'EXPEDIENTE BLOQUEADO'}</p>
                        <h3>{unlocked ? entry.title : '??????'}</h3>
                        {unlocked ? (
                          entry.body.map((line, index) => <p key={index}>{line}</p>)
                        ) : (
                          <p className="dim">
                            Recoja más notas, placas o fusibles para completar el expediente.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
              <p className="tiny dim">
                El bestiario se completa con lo que la planta deja ver. No todo lo que registra
                sigue vivo.
              </p>
            </>
          )}

          {tab === 'controls' && (
            <div className="note-card controls-card">
              <h3>CONTROLES</h3>
              <p>
                <kbd>WASD</kbd> mover · <kbd>SHIFT</kbd> correr · <kbd>CTRL</kbd> agacharse ·{' '}
                <kbd>E</kbd> interactuar / esconderse / arrancar cría · <kbd>F</kbd> linterna ·{' '}
                <kbd>Q</kbd> lanzar botella · <kbd>TAB</kbd> diario · <kbd>ESC</kbd> pausa
              </p>
              <p className="dim">
                Correr hace ruido. La linterna alarga el alcance visual de la criatura y ahuyenta a
                las crías. Las taquillas con la marca blanca sirven para esconderse. Las botellas
                hacen ruido lejos de usted.
              </p>
              <p className="dim">
                Las placas de tripulación y los fusibles son opcionales. Los tres de cada tipo abren
                una tercera salida en el montacargas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
