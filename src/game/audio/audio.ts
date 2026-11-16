/**
 * Audio 100% procedural (WebAudio). Sin ficheros: drones, respiracion,
 * latidos, pasos, metal, agua y una voz sintetica para VERA.
 *
 * La criatura se mezcla con paneo estereo segun su direccion relativa y su
 * cercania: es el principal canal de informacion (y de miedo) del juego.
 */

type CtxCtor = typeof AudioContext;

export type SfxName =
  | 'click'
  | 'breaker'
  | 'door'
  | 'slam'
  | 'metalGroan'
  | 'drip'
  | 'whisper'
  | 'pickup'
  | 'radio'
  | 'growl'
  | 'scream'
  | 'death'
  | 'locker'
  | 'lightOff'
  | 'gasp'
  | 'error';

export interface AudioState {
  danger: number;
  hidden: boolean;
  moving: boolean;
  sprinting: boolean;
  crouched: boolean;
}

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private monsterGain: GainNode | null = null;
  private monsterFilter: BiquadFilterNode | null = null;
  private monsterPan: StereoPannerNode | null = null;
  private volume = 0.7;
  private tension = 0;
  private heartTimer = 0;
  private breathTimer = 0;
  private started = false;

  get ready(): boolean {
    return this.ctx !== null;
  }

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const ctor: CtxCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: CtxCtor }).webkitAudioContext;
    if (!ctor) return;

    this.ctx = new ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.noise = this.makeNoise(2.4);
    this.startAmbient();
    this.started = true;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.06);
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx;
    if (!ctx) throw new Error('audio sin contexto');
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      // ruido rosa barato: media movil + blanco
      last = (last + 0.035 * white) / 1.035;
      data[i] = last * 3.1 + white * 0.12;
    }
    return buffer;
  }

  private startAmbient(): void {
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    if (!ctx || !master || !noise || this.started) return;

    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 190;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = 0.055;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    this.ambientFilter = filter;
    this.ambientGain = gain;

    // Dos drones disonantes muy graves + zumbido electrico.
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.035;
    droneGain.connect(master);
    this.droneGain = droneGain;
    for (const [freq, type, level] of [
      [41.2, 'sine', 0.05],
      [55.0, 'triangle', 0.026],
      [82.6, 'sine', 0.012],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const oscGain = ctx.createGain();
      oscGain.gain.value = level;
      osc.connect(oscGain);
      oscGain.connect(droneGain);
      osc.start();
    }

    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 50;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 180;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.012;
    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(master);
    hum.start();

    // Capa de la criatura: respiracion filtrada con paneo.
    const monsterSource = ctx.createBufferSource();
    monsterSource.buffer = noise;
    monsterSource.loop = true;
    const monsterFilter = ctx.createBiquadFilter();
    monsterFilter.type = 'bandpass';
    monsterFilter.frequency.value = 240;
    monsterFilter.Q.value = 1.4;
    const monsterGain = ctx.createGain();
    monsterGain.gain.value = 0;
    const pan = ctx.createStereoPanner();
    pan.pan.value = 0;
    monsterSource.connect(monsterFilter);
    monsterFilter.connect(monsterGain);
    monsterGain.connect(pan);
    pan.connect(master);
    monsterSource.start();
    this.monsterFilter = monsterFilter;
    this.monsterGain = monsterGain;
    this.monsterPan = pan;

    this.started = true;
  }

  /** 0 = calma, 1 = planta despierta. Solo mueve el ambiente. */
  setTension(value: number): void {
    this.tension = Math.max(0, Math.min(1, value));
    const ctx = this.ctx;
    if (!ctx) return;
    this.ambientFilter?.frequency.setTargetAtTime(180 + this.tension * 320, ctx.currentTime, 1.2);
    this.droneGain?.gain.setTargetAtTime(0.035 + this.tension * 0.05, ctx.currentTime, 1.2);
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(0.045 + this.tension * 0.03, ctx.currentTime, 1.2);
    }
  }

  /** Paneo y cercania de la criatura. pan -1 (izquierda) .. 1 (derecha). */
  setMonster(pan: number, proximity: number, hunting: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const clamped = Math.max(0, Math.min(1, proximity));
    const target = clamped * clamped * (hunting ? 0.4 : 0.16);
    this.monsterGain?.gain.setTargetAtTime(target, ctx.currentTime, 0.18);
    this.monsterFilter?.frequency.setTargetAtTime(210 + clamped * 420, ctx.currentTime, 0.3);
    this.monsterPan?.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, 0.12);
  }

  update(dt: number, state: AudioState): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const danger = Math.max(0, Math.min(1, state.danger));
    if (danger > 0.12) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.heartTimer = 1.12 - danger * 0.64;
        this.thump(0.06 + danger * 0.16, 44 - danger * 8);
        this.thump(0.035 + danger * 0.1, 38 - danger * 6, 0.15);
      }
    } else {
      this.heartTimer = Math.min(this.heartTimer, 0.2);
    }

    if (danger > 0.35) {
      this.breathTimer -= dt;
      if (this.breathTimer <= 0) {
        this.breathTimer = (state.hidden ? 2.2 : 3.5) - danger * 1.1;
        this.breath(state.hidden ? 0.02 : 0.03 + danger * 0.05, state.hidden ? 0.34 : 0.5);
      }
    } else {
      this.breathTimer = 0;
    }
  }

  private breath(level: number, duration: number): void {
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    if (!ctx || !master || !noise) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.linearRampToValueAtTime(620, now + duration * 0.6);
    filter.frequency.linearRampToValueAtTime(300, now + duration);
    filter.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
    source.stop(now + duration + 0.05);
  }

  private thump(level: number, freq: number, delay = 0): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  private tone(freq: number, duration: number, type: OscillatorType, level: number, endFreq?: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  private burst(duration: number, level: number, frequency: number, q = 1.2, type: BiquadFilterType = 'bandpass'): void {
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    if (!ctx || !master || !noise) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  footstep(surface: 'concrete' | 'metal' | 'grate', sprinting: boolean, crouched: boolean): void {
    if (!this.ctx) return;
    const level = crouched ? 0.02 : sprinting ? 0.075 : 0.045;
    const frequency = surface === 'metal' ? 780 : surface === 'grate' ? 1200 : 380;
    this.burst(0.075, level, frequency, surface === 'concrete' ? 0.8 : 1.8);
    this.tone(surface === 'grate' ? 96 : 72, 0.06, 'sine', level * 0.55, 44);
  }

  play(name: SfxName): void {
    if (!this.ctx) return;
    switch (name) {
      case 'click':
        this.tone(820, 0.04, 'square', 0.035);
        break;
      case 'breaker':
        this.burst(0.09, 0.16, 1600, 1.4);
        this.tone(58, 0.5, 'sawtooth', 0.14, 32);
        this.burst(0.34, 0.12, 2600, 2.2, 'highpass');
        break;
      case 'door':
        this.tone(54, 1.4, 'sawtooth', 0.09, 38);
        this.burst(1.1, 0.07, 260, 0.7);
        break;
      case 'slam':
        this.burst(0.3, 0.22, 220, 0.6);
        this.tone(46, 0.42, 'sine', 0.2, 26);
        break;
      case 'metalGroan':
        this.tone(96, 1.8, 'sawtooth', 0.05, 58);
        this.burst(1.8, 0.03, 700, 5);
        break;
      case 'drip':
        this.tone(920, 0.09, 'sine', 0.055, 520);
        window.setTimeout(() => this.tone(780, 0.07, 'sine', 0.025, 430), 210);
        break;
      case 'whisper':
        this.burst(0.9, 0.045, 820, 2.2);
        window.setTimeout(() => this.burst(0.7, 0.03, 1150, 3), 320);
        break;
      case 'pickup':
        this.tone(440, 0.09, 'triangle', 0.06);
        window.setTimeout(() => this.tone(660, 0.12, 'triangle', 0.05), 80);
        break;
      case 'radio':
        this.burst(0.12, 0.05, 2200, 1.4);
        this.tone(1180, 0.04, 'square', 0.022);
        window.setTimeout(() => this.tone(1320, 0.05, 'square', 0.018), 70);
        break;
      case 'growl': {
        this.tone(84, 1.4, 'sawtooth', 0.09, 44);
        this.burst(1.2, 0.08, 320, 1.1);
        break;
      }
      case 'scream': {
        const ctx = this.ctx;
        if (!ctx) break;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.22);
        osc.frequency.exponentialRampToValueAtTime(240, now + 1.1);
        const distortion = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i += 1) {
          const x = (i / 255) * 2 - 1;
          curve[i] = Math.tanh(x * 4);
        }
        distortion.curve = curve;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        osc.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.master as GainNode);
        osc.start(now);
        osc.stop(now + 1.25);
        this.burst(0.9, 0.1, 1800, 0.8, 'highpass');
        break;
      }
      case 'death':
        this.burst(0.5, 0.26, 120, 0.5);
        this.tone(38, 1.6, 'sawtooth', 0.16, 22);
        this.burst(1.4, 0.09, 900, 0.9, 'highpass');
        break;
      case 'locker':
        this.burst(0.16, 0.1, 900, 2.6);
        this.burst(0.3, 0.06, 500, 4);
        this.tone(120, 0.12, 'square', 0.04, 80);
        break;
      case 'lightOff':
        this.tone(1900, 0.03, 'square', 0.02);
        this.tone(60, 0.4, 'sine', 0.04, 40);
        break;
      case 'gasp':
        this.burst(0.35, 0.05, 600, 1.4);
        break;
      case 'error':
        this.tone(150, 0.18, 'sawtooth', 0.055, 96);
        break;
    }
  }

  /** Aviso de radio de VERA: estatica corta + dos pitidos. */
  radio(): void {
    this.play('radio');
  }

  dispose(): void {
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.master = null;
    this.started = false;
  }
}

export const audio = new GameAudio();
