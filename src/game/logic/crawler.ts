/**
 * Cerebro de las crias de la cisterna. Puro y testeable.
 *
 * No matan: se lanzan a la cara, chillan y delatan tu posicion. La luz directa
 * las ahuyenta; el ruido las atrae. Cuando se cuelgan, hay que arrancarlas.
 */
export type CrawlerState = 'idle' | 'alert' | 'chase' | 'latch' | 'flee';

export interface CrawlerSenses {
  distance: number;
  hasLOS: boolean;
  hidden: boolean;
  lightOn: boolean;
}

export interface CrawlerDecision {
  state: CrawlerState;
  speed: number;
  /** Chilla al detectar: delata al jugador. */
  screech: boolean;
  /** Debe engancharse a la camara. */
  latch: boolean;
}

export class CrawlerBrain {
  state: CrawlerState = 'idle';
  private timer = 0;
  private lostFor = 0;

  reset(): void {
    this.state = 'idle';
    this.timer = 0;
    this.lostFor = 0;
  }

  /** Un ruido o una luz la sobresalta: pasa a alerta. */
  startle(): void {
    if (this.state === 'latch' || this.state === 'flee') return;
    this.state = 'alert';
    this.timer = 0.3;
    this.lostFor = 0;
  }

  /** El jugador se la quita de encima: huye unos segundos. */
  shakeOff(): void {
    this.state = 'flee';
    this.timer = 2.8;
    this.lostFor = 0;
  }

  update(dt: number, senses: CrawlerSenses): CrawlerDecision {
    let screech = false;
    let latch = false;

    if (this.state === 'latch') {
      this.timer -= dt;
      return { state: this.state, speed: 0, screech: false, latch: true };
    }

    if (this.state === 'flee') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'idle';
      return { state: this.state, speed: 4.2, screech: false, latch: false };
    }

    if (senses.hidden) {
      this.lostFor += dt;
      if (this.lostFor > 2.2) this.state = 'idle';
      return { state: this.state === 'chase' ? 'idle' : this.state, speed: 1.4, screech: false, latch: false };
    }

    if (this.state === 'idle') {
      if (senses.hasLOS && senses.distance < 11) {
        this.state = 'alert';
        this.timer = 0.35;
        screech = true;
        this.lostFor = 0;
      }
      return { state: this.state, speed: 1.1, screech, latch };
    }

    if (this.state === 'alert') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'chase';
      return { state: this.state, speed: 0.6, screech: false, latch };
    }

    // chase
    if (!senses.hasLOS || senses.distance > 16) {
      this.lostFor += dt;
      if (this.lostFor > 3) {
        this.state = 'idle';
        this.lostFor = 0;
      }
    } else {
      this.lostFor = 0;
    }

    if (senses.lightOn && senses.distance < 5.5) {
      this.state = 'flee';
      this.timer = 2.4;
      return { state: this.state, speed: 4.2, screech: false, latch: false };
    }

    if (senses.distance < 1.15 && senses.hasLOS) {
      this.state = 'latch';
      this.timer = 0;
      latch = true;
      screech = true;
    }

    return { state: this.state, speed: 3.1, screech, latch };
  }
}
