import { useCallback, useEffect, useRef, useState } from 'react';
import { INTRO } from '../game/logic/story';

interface IntroSequenceProps {
  onFinish: () => void;
  onSkip: () => void;
}

/**
 * Prólogo en DOM: negro, letra pequeña y una voz de radio. No bloquea el motor,
 * que sigue renderizando la garita detras a camara lenta.
 */
export default function IntroSequence({ onFinish, onSkip }: IntroSequenceProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [readyToEnter, setReadyToEnter] = useState(false);
  const entered = useRef(false);

  const enter = useCallback(
    (finish: boolean) => {
      if (entered.current) return;
      entered.current = true;
      if (finish) onFinish();
      else onSkip();
    },
    [onFinish, onSkip],
  );

  useEffect(() => {
    const beat = INTRO[index];
    if (!beat) return;
    setVisible(true);
    const hide = window.setTimeout(() => setVisible(false), Math.max(1600, beat.hold * 1000 - 380));
    const next = window.setTimeout(() => {
      if (index + 1 >= INTRO.length) {
        setReadyToEnter(true);
      } else {
        setIndex((value) => value + 1);
      }
    }, beat.hold * 1000);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(next);
    };
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' && event.code !== 'Space' && event.code !== 'Enter') return;
      event.preventDefault();
      if (readyToEnter) enter(true);
      else enter(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enter, readyToEnter]);

  const beat = INTRO[index];

  return (
    <div className="intro-screen">
      <div className="intro-bars" aria-hidden="true" />
      <div className={`intro-line ${visible ? 'is-visible' : ''}`}>
        {beat?.speaker && <p className="intro-speaker">{beat.speaker}</p>}
        <p className="intro-text">{beat?.text}</p>
      </div>
      <div className="intro-progress" aria-hidden="true">
        {INTRO.map((_, i) => (
          <span key={i} className={i <= index ? 'is-on' : ''} />
        ))}
      </div>
      {readyToEnter ? (
        <button type="button" className="intro-enter" onClick={() => enter(true)}>
          ENTRAR EN LA PLANTA
        </button>
      ) : (
        <button type="button" className="intro-skip" onClick={() => enter(false)}>
          SALTAR PRÓLOGO
        </button>
      )}
    </div>
  );
}
