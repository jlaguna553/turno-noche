import { useCallback, useEffect, useRef, useState } from 'react';

interface TouchControlsProps {
  hidden: boolean;
  flashlightOn: boolean;
  bottles: number;
  onStick: (x: number, y: number) => void;
  onLook: (dx: number, dy: number) => void;
  onTap: (action: 'use' | 'flashlight' | 'throw') => void;
  onHold: (action: 'sprint' | 'crouch', held: boolean) => void;
  onJournal: () => void;
  onPause: () => void;
}

const STICK_RADIUS = 46;

/** Controles tactiles: stick a la izquierda, arrastre de camara y acciones. */
export default function TouchControls({
  hidden,
  flashlightOn,
  bottles,
  onStick,
  onLook,
  onTap,
  onHold,
  onJournal,
  onPause,
}: TouchControlsProps) {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const stickPointer = useRef<number | null>(null);
  const lookPointer = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const [sprint, setSprint] = useState(false);
  const [crouch, setCrouch] = useState(false);

  useEffect(() => {
    onHold('sprint', sprint);
    onHold('crouch', crouch);
  }, [crouch, onHold, sprint]);

  const moveStick = useCallback(
    (clientX: number, clientY: number) => {
      const element = stickRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      let dx = clientX - (rect.left + rect.width / 2);
      let dy = clientY - (rect.top + rect.height / 2);
      const length = Math.hypot(dx, dy);
      if (length > STICK_RADIUS) {
        dx = (dx / length) * STICK_RADIUS;
        dy = (dy / length) * STICK_RADIUS;
      }
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      onStick(dx / STICK_RADIUS, -dy / STICK_RADIUS);
    },
    [onStick],
  );

  const resetStick = useCallback(() => {
    stickPointer.current = null;
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
    onStick(0, 0);
  }, [onStick]);

  return (
    <div className="touch-ui">
      <div
        className="stick"
        ref={stickRef}
        onPointerDown={(event) => {
          event.preventDefault();
          stickPointer.current = event.pointerId;
          moveStick(event.clientX, event.clientY);
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // punteros sinteticos de QA
          }
        }}
        onPointerMove={(event) => {
          if (stickPointer.current !== event.pointerId) return;
          event.preventDefault();
          moveStick(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (stickPointer.current !== event.pointerId) return;
          event.preventDefault();
          resetStick();
        }}
        onPointerCancel={resetStick}
      >
        <div className="stick-ring" />
        <div className="stick-knob" ref={knobRef} />
      </div>

      <div
        className="look-zone"
        onPointerDown={(event) => {
          event.preventDefault();
          lookPointer.current = event.pointerId;
          lookLast.current = { x: event.clientX, y: event.clientY };
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // idem
          }
        }}
        onPointerMove={(event) => {
          if (lookPointer.current !== event.pointerId) return;
          event.preventDefault();
          const dx = event.clientX - lookLast.current.x;
          const dy = event.clientY - lookLast.current.y;
          lookLast.current = { x: event.clientX, y: event.clientY };
          onLook(dx * 1.7, dy * 1.7);
        }}
        onPointerUp={() => {
          lookPointer.current = null;
        }}
        onPointerCancel={() => {
          lookPointer.current = null;
        }}
      />

      <div className="touch-actions">
        <button
          type="button"
          className="touch-btn touch-btn-primary"
          onPointerDown={(event) => {
            event.preventDefault();
            onTap('use');
          }}
        >
          {hidden ? 'SALIR' : 'USAR'}
        </button>
        <div className="touch-row">
          <button
            type="button"
            className={`touch-btn ${sprint ? 'is-on' : ''}`}
            onPointerDown={(event) => {
              event.preventDefault();
              setSprint((value) => !value);
            }}
          >
            CORRER
          </button>
          <button
            type="button"
            className={`touch-btn ${crouch ? 'is-on' : ''}`}
            onPointerDown={(event) => {
              event.preventDefault();
              setCrouch((value) => !value);
            }}
          >
            AGACHAR
          </button>
          <button
            type="button"
            className={`touch-btn ${flashlightOn ? 'is-on' : ''}`}
            onPointerDown={(event) => {
              event.preventDefault();
              onTap('flashlight');
            }}
          >
            LINTERNA
          </button>
        </div>
        <div className="touch-row">
          <button
            type="button"
            className={`touch-btn touch-btn-small ${bottles === 0 ? 'is-disabled' : ''}`}
            onPointerDown={(event) => {
              event.preventDefault();
              onTap('throw');
            }}
          >
            LANZAR {bottles}
          </button>
          <button
            type="button"
            className="touch-btn touch-btn-small"
            onPointerDown={(event) => {
              event.preventDefault();
              onJournal();
            }}
          >
            DIARIO
          </button>
          <button
            type="button"
            className="touch-btn touch-btn-small"
            onPointerDown={(event) => {
              event.preventDefault();
              onPause();
            }}
          >
            II
          </button>
        </div>
      </div>
    </div>
  );
}
