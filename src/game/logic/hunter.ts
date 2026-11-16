import { MONSTER } from '../core/config';

export type HunterState = 'roam' | 'investigate' | 'hunt';

export interface Senses {
  /** Distancia horizontal al jugador, metros. */
  distance: number;
  /** Angulo absoluto entre la mirada de la criatura y el jugador, radianes. */
  angle: number;
  hasLOS: boolean;
  /** Ruido del jugador 0..1 (ver playerNoise). */
  noise: number;
  hidden: boolean;
  /** La linterna encendida multiplica su alcance visual. */
  flashlight: boolean;
}

export interface Decision {
  state: HunterState;
  /** Multiplicador de velocidad para el movimiento fisico. */
  speed: number;
  suspicion: number;
  /** La criatura acaba de detectar algo: el mundo emite gruñido. */
  alerted: boolean;
  /** Hay vision directa y esta cazando. */
  seesPlayer: boolean;
  /** Hacia donde investiga: el jugador o un ruido lanzado. */
  target: 'player' | 'lure';
}

export interface HunterTuning {
  /** 0 = patrulla tranquila; 1 = planta despierta (tras el tercer breaker). */
  aggression: number;
}

/**
 * Maquina de estados de la criatura. Pura, sin three ni Rapier: el mundo solo
 * le pasa los sentidos y ejecuta la decision. La memoria (sospecha, tiempo sin
 * verte) vive aqui, asi que es determinista y testeable.
 */
export class HunterBrain {
  state: HunterState = 'roam';
  suspicion = 0;
  aggression: number;
  private lostFor = 0;
  private investigateFor = 0;
  private lurePoint: { x: number; z: number } | null = null;
  private lureFor = 0;

  constructor(tuning: HunterTuning = { aggression: 0 }) {
    this.aggression = tuning.aggression;
  }

  reset(state: HunterState = 'roam', aggression = this.aggression): void {
    this.state = state;
    this.aggression = aggression;
    this.suspicion = 0;
    this.lostFor = 0;
    this.investigateFor = 0;
    this.lurePoint = null;
    this.lureFor = 0;
  }

  /**
   * Un ruido exterior (botella, chicharra, cria) fija un punto de
   * investigacion. El jugador puede usarlo para apartarla de su ruta.
   */
  hearNoise(x: number, z: number, strength = 1): void {
    const clamped = Math.max(0, Math.min(1, strength));
    this.lurePoint = { x, z };
    this.lureFor = 5.5 + clamped * 3;
    this.suspicion = Math.max(this.suspicion, 0.55 + clamped * 0.3);
    if (this.state !== 'hunt') this.state = 'investigate';
    this.investigateFor = 0;
  }

  get lure(): { x: number; z: number } | null {
    return this.lureFor > 0 ? this.lurePoint : null;
  }

  clearLure(): void {
    this.lureFor = 0;
    this.lurePoint = null;
  }

  private get viewRange(): number {
    return MONSTER.viewRange * (1 + this.aggression * 0.45);
  }

  private get gainRate(): number {
    return 1.05 + this.aggression * 0.85;
  }

  update(dt: number, senses: Senses): Decision {
    if (this.lureFor > 0) {
      this.lureFor = Math.max(0, this.lureFor - dt);
      if (this.lureFor === 0) this.lurePoint = null;
    }
    const fov = MONSTER.fovRadians + this.aggression * 0.25;
    const inCone = senses.angle <= fov && !senses.hidden;
    const range = this.viewRange * (senses.flashlight ? 1.55 : 1);
    const seen = inCone && senses.hasLOS && senses.distance <= range;
    const heard = !senses.hidden && senses.noise > 0.32 && senses.distance < 20;

    if (seen) {
      const proximity = 1 - Math.min(1, senses.distance / range);
      this.suspicion = Math.min(1, this.suspicion + dt * this.gainRate * (0.55 + proximity * 1.5));
      this.lostFor = 0;
    } else if (heard) {
      this.suspicion = Math.min(0.85, this.suspicion + dt * 0.75);
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * (this.state === 'hunt' ? 0.34 : 0.22));
    }

    let state = this.state;
    if (senses.hidden && this.state === 'hunt') {
      // Escondido y sin verte: busca un rato y vuelve a patrullar.
      this.lostFor += dt;
      if (this.lostFor > 6.5) state = 'investigate';
      this.investigateFor = 0;
    } else if (this.suspicion >= 0.92) {
      state = 'hunt';
      this.lostFor = 0;
    } else if (this.suspicion >= 0.38) {
      state = 'investigate';
    } else {
      state = 'roam';
    }

    if (state === 'hunt' && !seen) {
      this.lostFor += dt;
      if (this.lostFor > 6) {
        state = 'investigate';
        this.investigateFor = 0;
      }
    }

    if (state === 'investigate') {
      this.investigateFor += dt;
      if (this.investigateFor > 9) {
        state = 'roam';
        this.suspicion = Math.min(this.suspicion, 0.2);
      }
    } else {
      this.investigateFor = 0;
    }

    const alerted = state !== this.state && (state === 'hunt' || state === 'investigate');
    this.state = state;

    const base = MONSTER.patrolSpeed;
    const speed =
      state === 'hunt'
        ? MONSTER.huntSpeed * (1 + this.aggression * 0.12)
        : state === 'investigate'
          ? base * 1.75
          : base;

    const target: 'player' | 'lure' =
      state === 'investigate' && this.lure && !seen ? 'lure' : 'player';

    return {
      state,
      speed,
      suspicion: this.suspicion,
      alerted,
      seesPlayer: seen,
      target,
    };
  }
}
