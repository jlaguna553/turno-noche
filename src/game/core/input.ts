export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'jump'
  | 'crouch'
  | 'sprint'
  | 'use'
  | 'flashlight'
  | 'journal';

const KEY_MAP: Record<string, Action> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  ControlLeft: 'crouch',
  ControlRight: 'crouch',
  KeyC: 'crouch',
  KeyE: 'use',
  KeyF: 'flashlight',
  Tab: 'journal',
};

const PREVENT_DEFAULT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

function isEditable(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}

/**
 * Entrada de teclado/mouse/tactil. Los eventos se acumulan y el juego los
 * consume en su propio loop: nada de estado de React en el camino caliente.
 */
export class Input {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private mouseDx = 0;
  private mouseDy = 0;
  private attached = false;
  private virtualStick = { x: 0, y: 0 };
  private virtualDown = new Set<Action>();
  enabled = true;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  attach(): void {
    if (this.attached) return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.reset);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('pointerlockchange', this.onPointerLock);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.reset);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('pointerlockchange', this.onPointerLock);
    this.attached = false;
    this.reset();
  }

  isDown(action: Action): boolean {
    return this.enabled && (this.down.has(action) || this.virtualDown.has(action));
  }

  /** Eje de avance analogico (-1..1): teclado o stick tactil. */
  moveForward(): number {
    if (!this.enabled) return 0;
    const keys = (this.down.has('forward') ? 1 : 0) - (this.down.has('back') ? 1 : 0);
    return Math.max(-1, Math.min(1, keys + this.virtualStick.y));
  }

  /** Eje lateral analogico (-1..1): +1 derecha. */
  moveStrafe(): number {
    if (!this.enabled) return 0;
    const keys = (this.down.has('right') ? 1 : 0) - (this.down.has('left') ? 1 : 0);
    return Math.max(-1, Math.min(1, keys + this.virtualStick.x));
  }

  setStick(x: number, y: number): void {
    this.virtualStick.x = Math.max(-1, Math.min(1, x));
    this.virtualStick.y = Math.max(-1, Math.min(1, y));
  }

  /** Mantiene pulsada una accion desde UI tactil (correr, agacharse...). */
  setVirtual(action: Action, held: boolean): void {
    if (held) {
      if (!this.virtualDown.has(action)) this.pressed.add(action);
      this.virtualDown.add(action);
    } else {
      this.virtualDown.delete(action);
    }
  }

  /** Pulsacion puntual desde UI tactil. */
  tapVirtual(action: Action): void {
    if (!this.enabled) return;
    this.pressed.add(action);
  }

  /** Movimiento de camara acumulado (raton o arrastre tactil). */
  addLook(dx: number, dy: number): void {
    if (!this.enabled) return;
    this.mouseDx += dx;
    this.mouseDy += dy;
  }

  consumePress(action: Action): boolean {
    if (!this.enabled) return false;
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  consumeMouse(): { dx: number; dy: number } {
    const dx = this.mouseDx;
    const dy = this.mouseDy;
    this.mouseDx = 0;
    this.mouseDy = 0;
    return { dx, dy };
  }

  clearPresses(): void {
    this.pressed.clear();
  }

  reset = (): void => {
    this.down.clear();
    this.pressed.clear();
    this.virtualDown.clear();
    this.virtualStick.x = 0;
    this.virtualStick.y = 0;
    this.mouseDx = 0;
    this.mouseDy = 0;
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (isEditable(event.target)) return;
    const action = KEY_MAP[event.code];
    if (!action) return;
    if (PREVENT_DEFAULT.has(event.code)) event.preventDefault();
    if (!this.enabled) return;
    if (!this.down.has(action)) this.pressed.add(action);
    this.down.add(action);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (isEditable(event.target)) return;
    const action = KEY_MAP[event.code];
    if (!action) return;
    this.down.delete(action);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.enabled) return;
    // Con pointer lock, movimiento libre. Sin el (navegador que lo rechaza),
    // arrastrar con el boton izquierdo sigue permitiendo mirar.
    const locked = document.pointerLockElement === this.canvas;
    if (!locked && event.buttons !== 1) return;
    this.mouseDx += event.movementX;
    this.mouseDy += event.movementY;
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (!this.enabled || event.button !== 0) return;
    if (document.pointerLockElement !== this.canvas) return;
    this.pressed.add('use');
  };

  private onPointerLock = (): void => {
    if (document.pointerLockElement !== this.canvas) this.reset();
  };
}
