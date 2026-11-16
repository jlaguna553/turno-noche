import type { NavGraph } from './nav';
import type { MaterialKey } from '../render/materials';

export interface RoomSpec {
  id: string;
  name: string;
  banner: string;
  min: [number, number];
  max: [number, number];
  floorY: number;
  ceilingY: number;
  wallMaterial: MaterialKey;
  floorMaterial: MaterialKey;
}

export interface Opening {
  center: number;
  width: number;
  bottom: number;
  top: number;
}

export interface WallSpec {
  id: string;
  axis: 'x' | 'z';
  from: number;
  to: number;
  at: number;
  height: number;
  /** Altura de arranque (para dinteles sobre bocas de pasillo). */
  bottom?: number;
  thickness: number;
  material: MaterialKey;
  openings?: Opening[];
}

export type PropKind =
  | 'light'
  | 'pump'
  | 'valve'
  | 'barrel'
  | 'crate'
  | 'locker'
  | 'hideLocker'
  | 'breaker'
  | 'note'
  | 'battery'
  | 'radio'
  | 'lift'
  | 'desk'
  | 'chair'
  | 'bench'
  | 'shelf'
  | 'body'
  | 'puddle'
  | 'blood'
  | 'pipe'
  | 'hangingLamp'
  | 'plasticSheet'
  | 'extinguisher'
  | 'transformer'
  | 'cables'
  | 'drain'
  | 'mirror'
  | 'bulkhead'
  | 'filingCabinet'
  | 'safe'
  | 'mapBoard'
  | 'typewriter'
  | 'boiler'
  | 'gauge'
  | 'steamVent'
  | 'chain'
  | 'bodyBag'
  | 'tag'
  | 'fuse'
  | 'bottle'
  | 'pool'
  | 'wellValve'
  | 'crawlerNest';

export interface PropSpec {
  id: string;
  kind: PropKind;
  x: number;
  y?: number;
  z: number;
  rotationY?: number;
  size?: number;
  length?: number;
  axis?: 'x' | 'z';
  noteId?: string;
  breakerId?: string;
  tagId?: string;
  fuseId?: string;
  label?: string;
  color?: number;
  intensity?: number;
  /** 0 = fija; 1 = parpadeo violento. */
  flicker?: number;
  broken?: boolean;
  variant?: string;
}

export interface Layout {
  spawn: { x: number; y: number; z: number; yaw: number };
  rooms: RoomSpec[];
  walls: WallSpec[];
  props: PropSpec[];
  nav: NavGraph;
}

export const FLOOR_Y = 0;

export const LAYOUT: Layout = {
  spawn: { x: 0, y: FLOOR_Y, z: -7.4, yaw: Math.PI },
  rooms: [
    {
      id: 'guardia',
      name: 'GARITA DE GUARDIA',
      banner: 'GARITA DE GUARDIA',
      min: [-5, -11],
      max: [5, -5],
      floorY: FLOOR_Y,
      ceilingY: 3.2,
      wallMaterial: 'concreteWall',
      floorMaterial: 'tileWall',
    },
    {
      id: 'pasillo-norte',
      name: 'PASILLO NORTE',
      banner: 'PASILLO NORTE',
      min: [-15, -5],
      max: [15, -1.8],
      floorY: FLOOR_Y,
      ceilingY: 2.7,
      wallMaterial: 'metalPanel',
      floorMaterial: 'grate',
    },
    {
      id: 'sala-bombas',
      name: 'SALA DE BOMBAS',
      banner: 'SALA DE BOMBAS · B1',
      min: [-30, -11],
      max: [-15, 3],
      floorY: FLOOR_Y,
      ceilingY: 6.2,
      wallMaterial: 'concreteWall',
      floorMaterial: 'concreteFloor',
    },
    {
      id: 'taller',
      name: 'TALLER DE MANTENIMIENTO',
      banner: 'TALLER · B2',
      min: [15, -11],
      max: [30, 3],
      floorY: FLOOR_Y,
      ceilingY: 4.1,
      wallMaterial: 'concreteWall',
      floorMaterial: 'concreteFloor',
    },
    {
      id: 'pasillo-sur',
      name: 'PASILLO SUR',
      banner: 'PASILLO SUR',
      min: [-1.8, -1.8],
      max: [1.8, 14],
      floorY: FLOOR_Y,
      ceilingY: 2.7,
      wallMaterial: 'tileWall',
      floorMaterial: 'grate',
    },
    {
      id: 'vestuario',
      name: 'VESTUARIO',
      banner: 'VESTUARIO',
      min: [1.8, 4.5],
      max: [10, 10],
      floorY: FLOOR_Y,
      ceilingY: 3.0,
      wallMaterial: 'tileWall',
      floorMaterial: 'tileWall',
    },
    {
      id: 'subestacion',
      name: 'SUBESTACIÓN',
      banner: 'SUBESTACIÓN · B3',
      min: [-8, 14],
      max: [8, 22],
      floorY: FLOOR_Y,
      ceilingY: 5.2,
      wallMaterial: 'metalPanel',
      floorMaterial: 'concreteFloor',
    },
    {
      id: 'archivo',
      name: 'ARCHIVO',
      banner: 'ARCHIVO · TURNO 07/11',
      min: [15, -18],
      max: [27, -11],
      floorY: FLOOR_Y,
      ceilingY: 3.4,
      wallMaterial: 'tileWall',
      floorMaterial: 'wood',
    },
    {
      id: 'calderas',
      name: 'SALA DE CALDERAS',
      banner: 'CALDERAS',
      min: [-42, -9],
      max: [-30, 3],
      floorY: FLOOR_Y,
      ceilingY: 5.0,
      wallMaterial: 'metalPanel',
      floorMaterial: 'concreteFloor',
    },
    {
      id: 'cisterna',
      name: 'CISTERNA · POZO 1',
      banner: 'CISTERNA · POZO 1',
      min: [-30, 3],
      max: [-15, 15],
      floorY: FLOOR_Y,
      ceilingY: 4.6,
      wallMaterial: 'concreteWall',
      floorMaterial: 'grate',
    },
  ],
  walls: [
    // GARITA
    { id: 'g-n', axis: 'x', from: -5, to: 5, at: -11, height: 3.2, thickness: 0.3, material: 'concreteWall' },
    {
      id: 'g-s',
      axis: 'x',
      from: -5,
      to: 5,
      at: -5,
      height: 3.2,
      thickness: 0.3,
      material: 'concreteWall',
      openings: [{ center: 0, width: 2.2, bottom: 0, top: 2.4 }],
    },
    { id: 'g-w', axis: 'z', from: -11, to: -5, at: -5, height: 3.2, thickness: 0.3, material: 'concreteWall' },
    { id: 'g-e', axis: 'z', from: -11, to: -5, at: 5, height: 3.2, thickness: 0.3, material: 'concreteWall' },

    // PASILLO NORTE
    { id: 'pn-n-w', axis: 'x', from: -15, to: -5, at: -5, height: 2.7, thickness: 0.26, material: 'metalPanel' },
    { id: 'pn-n-e', axis: 'x', from: 5, to: 15, at: -5, height: 2.7, thickness: 0.26, material: 'metalPanel' },
    {
      id: 'pn-s',
      axis: 'x',
      from: -15,
      to: 15,
      at: -1.8,
      height: 2.7,
      thickness: 0.26,
      material: 'metalPanel',
      openings: [{ center: 0, width: 2.2, bottom: 0, top: 2.4 }],
    },

    // SALA DE BOMBAS
    { id: 'sb-n', axis: 'x', from: -30, to: -15, at: -11, height: 6.2, thickness: 0.4, material: 'concreteWall' },
    { id: 'sb-s', axis: 'x', from: -30, to: -15, at: 3, height: 6.2, thickness: 0.4, material: 'concreteWall', openings: [{ center: -22, width: 2.2, bottom: 0, top: 2.4 }] },
    { id: 'sb-w', axis: 'z', from: -11, to: 3, at: -30, height: 6.2, thickness: 0.4, material: 'concreteWall', openings: [{ center: -3, width: 2.2, bottom: 0, top: 2.4 }] },
    { id: 'sb-e-n', axis: 'z', from: -11, to: -5, at: -15, height: 6.2, thickness: 0.4, material: 'concreteWall' },
    { id: 'sb-e-s', axis: 'z', from: -1.8, to: 3, at: -15, height: 6.2, thickness: 0.4, material: 'concreteWall' },
    {
      id: 'sb-e-lintel',
      axis: 'z',
      from: -5,
      to: -1.8,
      at: -15,
      bottom: 2.7,
      height: 6.2,
      thickness: 0.4,
      material: 'concreteWall',
    },

    // TALLER
    { id: 't-n', axis: 'x', from: 15, to: 30, at: -11, height: 4.1, thickness: 0.4, material: 'concreteWall', openings: [{ center: 21, width: 2.2, bottom: 0, top: 2.4 }] },
    { id: 't-s', axis: 'x', from: 15, to: 30, at: 3, height: 4.1, thickness: 0.4, material: 'concreteWall' },
    { id: 't-e', axis: 'z', from: -11, to: 3, at: 30, height: 4.1, thickness: 0.4, material: 'concreteWall' },
    { id: 't-w-n', axis: 'z', from: -11, to: -5, at: 15, height: 4.1, thickness: 0.4, material: 'concreteWall' },
    { id: 't-w-s', axis: 'z', from: -1.8, to: 3, at: 15, height: 4.1, thickness: 0.4, material: 'concreteWall' },
    {
      id: 't-w-lintel',
      axis: 'z',
      from: -5,
      to: -1.8,
      at: 15,
      bottom: 2.7,
      height: 4.1,
      thickness: 0.4,
      material: 'concreteWall',
    },

    // PASILLO SUR
    { id: 'ps-w', axis: 'z', from: -1.8, to: 14, at: -1.8, height: 2.7, thickness: 0.26, material: 'tileWall' },
    {
      id: 'ps-e',
      axis: 'z',
      from: -1.8,
      to: 14,
      at: 1.8,
      height: 2.7,
      thickness: 0.26,
      material: 'tileWall',
      openings: [{ center: 6.5, width: 1.8, bottom: 0, top: 2.3 }],
    },
    {
      id: 'ps-s',
      axis: 'x',
      from: -1.8,
      to: 1.8,
      at: 14,
      height: 2.7,
      thickness: 0.26,
      material: 'tileWall',
      openings: [{ center: 0, width: 2.2, bottom: 0, top: 2.4 }],
    },

    // VESTUARIO
    { id: 'v-n', axis: 'x', from: 1.8, to: 10, at: 4.5, height: 3.0, thickness: 0.26, material: 'tileWall' },
    { id: 'v-s', axis: 'x', from: 1.8, to: 10, at: 10, height: 3.0, thickness: 0.26, material: 'tileWall' },
    { id: 'v-e', axis: 'z', from: 4.5, to: 10, at: 10, height: 3.0, thickness: 0.26, material: 'tileWall' },

    // SUBESTACION
    {
      id: 'se-n',
      axis: 'x',
      from: -8,
      to: 8,
      at: 14,
      height: 5.2,
      thickness: 0.36,
      material: 'metalPanel',
      openings: [{ center: 0, width: 2.2, bottom: 0, top: 2.4 }],
    },
    { id: 'se-s', axis: 'x', from: -8, to: 8, at: 22, height: 5.2, thickness: 0.36, material: 'metalPanel' },
    { id: 'se-w', axis: 'z', from: 14, to: 22, at: -8, height: 5.2, thickness: 0.36, material: 'metalPanel' },
    { id: 'se-e', axis: 'z', from: 14, to: 22, at: 8, height: 5.2, thickness: 0.36, material: 'metalPanel' },
    // ARCHIVO
    { id: 'a-n', axis: 'x', from: 15, to: 27, at: -18, height: 3.4, thickness: 0.3, material: 'tileWall' },
    { id: 'a-w', axis: 'z', from: -18, to: -11, at: 15, height: 3.4, thickness: 0.3, material: 'tileWall' },
    { id: 'a-e', axis: 'z', from: -18, to: -11, at: 27, height: 3.4, thickness: 0.3, material: 'tileWall' },

    // CALDERAS
    { id: 'b-n', axis: 'x', from: -42, to: -30, at: -9, height: 5.0, thickness: 0.36, material: 'metalPanel' },
    { id: 'b-s', axis: 'x', from: -42, to: -30, at: 3, height: 5.0, thickness: 0.36, material: 'metalPanel' },
    { id: 'b-w', axis: 'z', from: -9, to: 3, at: -42, height: 5.0, thickness: 0.36, material: 'metalPanel' },

    // CISTERNA
    { id: 'c-w', axis: 'z', from: 3, to: 15, at: -30, height: 4.6, thickness: 0.36, material: 'concreteWall' },
    { id: 'c-e', axis: 'z', from: 3, to: 15, at: -15, height: 4.6, thickness: 0.36, material: 'concreteWall' },
    { id: 'c-s', axis: 'x', from: -30, to: -15, at: 15, height: 4.6, thickness: 0.36, material: 'concreteWall' },
  ],
  props: [
    // ---- GARITA ----
    { id: 'lift', kind: 'lift', x: 0, y: 0, z: -10.55, rotationY: 0 },
    { id: 'light-guardia', kind: 'light', x: -1, y: 3.05, z: -8.2, intensity: 13, color: 0xcfe0c6, flicker: 0.4 },
    { id: 'light-guardia-2', kind: 'light', x: 3.4, y: 3.05, z: -6.2, intensity: 5, color: 0xffb066, flicker: 0.15 },
    { id: 'desk-guardia', kind: 'desk', x: -3.1, y: 0, z: -9.6, rotationY: 0.1 },
    { id: 'chair-guardia', kind: 'chair', x: -3.0, y: 0, z: -8.5, rotationY: 3.0 },
    { id: 'radio', kind: 'radio', x: -3.1, y: 0.78, z: -9.2, rotationY: 0.1 },
    { id: 'note-parte', kind: 'note', x: -2.25, y: 0.94, z: -9.16, rotationY: 0.3, noteId: 'parte-incidencia' },
    { id: 'locker-g1', kind: 'locker', x: 4.45, y: 0, z: -10.1, rotationY: -Math.PI / 2 },
    { id: 'locker-g2', kind: 'locker', x: 4.45, y: 0, z: -9.1, rotationY: -Math.PI / 2 },
    { id: 'bed-guardia', kind: 'bench', x: 3.0, y: 0, z: -7.0, rotationY: 0, variant: 'cot' },
    { id: 'blood-g1', kind: 'blood', x: 1.2, y: 0.012, z: -6.2, rotationY: 0.4, size: 1.5 },
    { id: 'crate-g1', kind: 'crate', x: -4.2, y: 0.4, z: -6.1, size: 0.8 },
    { id: 'extinguisher-g1', kind: 'extinguisher', x: 4.6, y: 0, z: -7.4, rotationY: -Math.PI / 2 },
    { id: 'drain-g1', kind: 'drain', x: 0.0, y: 0.01, z: -8.9 },

    // ---- PASILLO NORTE ----
    { id: 'light-pn-1', kind: 'light', x: -12.5, y: 2.55, z: -3.4, intensity: 9, color: 0xbcd2c0, flicker: 0.55 },
    { id: 'light-pn-2', kind: 'light', x: -7.5, y: 2.55, z: -3.4, intensity: 7, color: 0xc9d8c9, flicker: 0.2 },
    { id: 'light-pn-3', kind: 'light', x: -2.2, y: 2.55, z: -3.4, intensity: 8, color: 0xffc489, flicker: 0.35 },
    { id: 'light-pn-4', kind: 'light', x: 3.4, y: 2.55, z: -3.4, intensity: 4, color: 0x8fae9a, flicker: 0.7 },
    { id: 'light-pn-5', kind: 'light', x: 9.2, y: 2.55, z: -3.4, intensity: 2, color: 0x6d7a6d, broken: true },
    { id: 'light-pn-6', kind: 'light', x: 13.4, y: 2.55, z: -3.4, intensity: 8, color: 0xcfe0c6, flicker: 0.3 },
    { id: 'pipe-pn-1', kind: 'pipe', x: 0, y: 2.35, z: -4.72, axis: 'x', length: 29 },
    { id: 'pipe-pn-2', kind: 'pipe', x: 0, y: 0.42, z: -4.8, axis: 'x', length: 29, size: 0.07 },
    { id: 'puddle-pn-1', kind: 'puddle', x: -4.5, y: 0.02, z: -2.6, size: 1.6 },
    { id: 'puddle-pn-2', kind: 'puddle', x: 8.2, y: 0.02, z: -3.9, size: 1.2 },
    { id: 'blood-pn', kind: 'blood', x: 6.1, y: 0.012, z: -2.2, rotationY: 1.2, size: 1.1 },
    { id: 'lamp-pn', kind: 'hangingLamp', x: 6.2, y: 2.7, z: -3.4, broken: true },
    { id: 'cables-pn', kind: 'cables', x: -10.5, y: 2.5, z: -4.6, length: 3.4 },
    { id: 'drain-pn', kind: 'drain', x: -1.0, y: 0.01, z: -3.0 },
    { id: 'bulkhead-pn-1', kind: 'bulkhead', x: -15.0, y: 0, z: -3.4 },
    { id: 'bulkhead-pn-2', kind: 'bulkhead', x: 15.0, y: 0, z: -3.4 },

    // ---- SALA DE BOMBAS ----
    { id: 'pump-1', kind: 'pump', x: -22.5, y: 0, z: -6.4, rotationY: 0.2, size: 1.5 },
    { id: 'pump-2', kind: 'pump', x: -26.0, y: 0, z: -1.2, rotationY: -0.4, size: 1.8 },
    { id: 'pump-3', kind: 'pump', x: -19.2, y: 0, z: -1.0, rotationY: 0.6, size: 1.3 },
    { id: 'valve-1', kind: 'valve', x: -24.2, y: 1.1, z: -4.0, rotationY: 0.6 },
    { id: 'valve-2', kind: 'valve', x: -17.0, y: 1.4, z: 1.4, rotationY: -1.2 },
    { id: 'light-sb-1', kind: 'light', x: -18.2, y: 5.7, z: -4.4, intensity: 16, color: 0xc6d8c4, flicker: 0.45 },
    { id: 'light-sb-2', kind: 'light', x: -24.8, y: 5.7, z: -7.4, intensity: 10, color: 0xffbd7a, flicker: 0.2 },
    { id: 'light-sb-3', kind: 'light', x: -23.6, y: 5.7, z: 1.1, intensity: 0, color: 0x9aa89a, broken: true },
    { id: 'light-sb-red', kind: 'light', x: -29.1, y: 3.6, z: -2.0, intensity: 6, color: 0xff2c1c, flicker: 0.8 },
    { id: 'light-sb-work', kind: 'light', x: -20.0, y: 3.1, z: -6.2, intensity: 11, color: 0xd6e2cc, flicker: 0.3 },
    { id: 'light-sb-work-2', kind: 'light', x: -26.4, y: 3.2, z: 0.4, intensity: 8, color: 0xffc58a, flicker: 0.15 },
    { id: 'breaker-b1', kind: 'breaker', x: -15.35, y: 1.35, z: 0.4, rotationY: -Math.PI / 2, breakerId: 'b1' },
    { id: 'locker-b1', kind: 'hideLocker', x: -15.45, y: 0, z: -9.8, rotationY: -Math.PI / 2 },
    { id: 'locker-b2', kind: 'locker', x: -15.45, y: 0, z: -8.8, rotationY: -Math.PI / 2 },
    { id: 'note-pozo', kind: 'note', x: -23.4, y: 0.86, z: -3.2, rotationY: 0.8, noteId: 'registro-pozo' },
    { id: 'crate-sb-1', kind: 'crate', x: -23.0, y: 0.4, z: -3.2, size: 0.8 },
    { id: 'crate-sb-2', kind: 'crate', x: -18.0, y: 0.4, z: -8.8, size: 1.0 },
    { id: 'battery-sb', kind: 'battery', x: -19.6, y: 0.18, z: 1.7 },
    { id: 'body-sb', kind: 'body', x: -27.4, y: 0.12, z: -8.2, rotationY: 1.1 },
    { id: 'puddle-sb-1', kind: 'puddle', x: -21.0, y: 0.02, z: 0.6, size: 2.4 },
    { id: 'puddle-sb-2', kind: 'puddle', x: -27.6, y: 0.02, z: -4.2, size: 1.8 },
    { id: 'blood-sb', kind: 'blood', x: -24.6, y: 0.012, z: -8.0, rotationY: 2.1, size: 2.2 },
    { id: 'pipe-sb-1', kind: 'pipe', x: -22.5, y: 4.6, z: -10.7, axis: 'x', length: 14 },
    { id: 'pipe-sb-2', kind: 'pipe', x: -29.6, y: 2.2, z: -4.0, axis: 'z', length: 12 },
    { id: 'plastic-sb-1', kind: 'plasticSheet', x: -16.6, y: 0, z: -5.4, rotationY: 0.3, length: 2.4 },
    { id: 'plastic-sb-2', kind: 'plasticSheet', x: -20.4, y: 0, z: 2.2, rotationY: 1.4, length: 2.8 },
    { id: 'cables-sb', kind: 'cables', x: -17.6, y: 2.4, z: -7.6, length: 4.0 },
    { id: 'drain-sb', kind: 'drain', x: -22.0, y: 0.01, z: -2.0, size: 1.4 },
    { id: 'barrel-sb-1', kind: 'barrel', x: -19.4, y: 0.55, z: -9.4 },
    { id: 'barrel-sb-2', kind: 'barrel', x: -20.4, y: 0.55, z: -9.6 },

    // ---- TALLER ----
    { id: 'light-t-1', kind: 'light', x: 18.5, y: 3.9, z: -6.2, intensity: 12, color: 0xd2ddc4, flicker: 0.5 },
    { id: 'light-t-2', kind: 'light', x: 24.0, y: 3.9, z: -1.2, intensity: 6, color: 0xffb877, flicker: 0.25 },
    { id: 'light-t-3', kind: 'light', x: 27.0, y: 3.9, z: -8.0, intensity: 0, color: 0xaab4a6, broken: true },
    { id: 'light-t-work', kind: 'light', x: 21.6, y: 3.1, z: -5.6, intensity: 9, color: 0xd6e2cc, flicker: 0.35 },
    { id: 'breaker-b2', kind: 'breaker', x: 15.35, y: 1.35, z: 0.4, rotationY: Math.PI / 2, breakerId: 'b2' },
    { id: 'bench-t-1', kind: 'bench', x: 22.0, y: 0, z: -6.6, rotationY: 0, variant: 'workbench' },
    { id: 'bench-t-2', kind: 'bench', x: 22.0, y: 0, z: 0.8, rotationY: Math.PI, variant: 'workbench' },
    { id: 'shelf-t', kind: 'shelf', x: 29.4, y: 0, z: -4.2, rotationY: -Math.PI / 2 },
    { id: 'locker-t1', kind: 'hideLocker', x: 29.35, y: 0, z: -9.7, rotationY: -Math.PI / 2 },
    { id: 'locker-t2', kind: 'locker', x: 29.35, y: 0, z: -8.7, rotationY: -Math.PI / 2 },
    { id: 'note-taller', kind: 'note', x: 21.2, y: 1.18, z: -6.4, rotationY: 0.5, noteId: 'cuaderno-taller' },
    { id: 'battery-t', kind: 'battery', x: 26.4, y: 0.18, z: 1.6 },
    { id: 'barrel-t1', kind: 'barrel', x: 17.2, y: 0.55, z: 1.8 },
    { id: 'barrel-t2', kind: 'barrel', x: 18.2, y: 0.55, z: 1.9 },
    { id: 'crate-t', kind: 'crate', x: 25.6, y: 0.4, z: -9.4, size: 0.9 },
    { id: 'puddle-t', kind: 'puddle', x: 24.0, y: 0.02, z: -2.6, size: 1.9 },
    { id: 'blood-t', kind: 'blood', x: 17.8, y: 0.012, z: -8.6, rotationY: 0.6, size: 1.7 },
    { id: 'pipe-t', kind: 'pipe', x: 22.5, y: 3.4, z: -10.6, axis: 'x', length: 14 },
    { id: 'extinguisher-t', kind: 'extinguisher', x: 29.6, y: 0, z: -1.6, rotationY: -Math.PI / 2 },
    { id: 'drain-t', kind: 'drain', x: 22.0, y: 0.01, z: -3.0 },
    { id: 'bulkhead-t', kind: 'bulkhead', x: 15.0, y: 0, z: -3.4 },

    // ---- PASILLO SUR ----
    { id: 'light-ps-1', kind: 'light', x: 0, y: 2.55, z: 0.6, intensity: 6, color: 0xbccbb8, flicker: 0.6 },
    { id: 'light-ps-2', kind: 'light', x: 0, y: 2.55, z: 4.8, intensity: 5, color: 0xffb878, flicker: 0.3 },
    { id: 'light-ps-3', kind: 'light', x: 0, y: 2.55, z: 9.4, intensity: 2, color: 0x7f8f7f, broken: true },
    { id: 'light-ps-4', kind: 'light', x: 0, y: 2.55, z: 12.9, intensity: 5, color: 0xc6d8c4, flicker: 0.5 },
    { id: 'pipe-ps-1', kind: 'pipe', x: -1.55, y: 2.2, z: 6.0, axis: 'z', length: 15.6 },
    { id: 'puddle-ps-1', kind: 'puddle', x: 0, y: 0.02, z: 3.2, size: 1.4 },
    { id: 'puddle-ps-2', kind: 'puddle', x: 0.4, y: 0.02, z: 10.8, size: 1.7 },
    { id: 'blood-ps', kind: 'blood', x: -0.6, y: 0.012, z: 7.6, rotationY: 0.3, size: 1.4 },
    { id: 'drain-ps', kind: 'drain', x: 0, y: 0.01, z: 5.8 },
    { id: 'cables-ps', kind: 'cables', x: 0.4, y: 2.35, z: 11.0, length: 3.0 },

    // ---- VESTUARIO ----
    { id: 'light-v-1', kind: 'light', x: 5.9, y: 2.86, z: 7.2, intensity: 7, color: 0xd6e2cf, flicker: 0.55 },
    { id: 'light-v-2', kind: 'light', x: 8.6, y: 2.86, z: 5.6, intensity: 0, color: 0xff3a24, broken: true },
    { id: 'locker-v1', kind: 'hideLocker', x: 3.0, y: 0, z: 5.05, rotationY: 0 },
    { id: 'locker-v2', kind: 'locker', x: 4.0, y: 0, z: 5.05, rotationY: 0 },
    { id: 'locker-v3', kind: 'hideLocker', x: 5.0, y: 0, z: 5.05, rotationY: 0 },
    { id: 'locker-v4', kind: 'locker', x: 6.0, y: 0, z: 5.05, rotationY: 0 },
    { id: 'locker-v5', kind: 'locker', x: 7.0, y: 0, z: 5.05, rotationY: 0 },
    { id: 'locker-v6', kind: 'locker', x: 8.0, y: 0, z: 5.05, rotationY: 0 },
    { id: 'bench-v', kind: 'bench', x: 5.4, y: 0, z: 7.8, rotationY: Math.PI / 2, variant: 'bench' },
    { id: 'mirror-v', kind: 'mirror', x: 9.85, y: 1.7, z: 7.4, rotationY: -Math.PI / 2 },
    { id: 'note-ta-quilla', kind: 'note', x: 8.4, y: 1.15, z: 5.44, rotationY: -0.5, noteId: 'taquilla-17' },
    { id: 'body-v', kind: 'body', x: 4.4, y: 0.12, z: 8.7, rotationY: 2.6 },
    { id: 'puddle-v', kind: 'puddle', x: 5.8, y: 0.02, z: 6.2, size: 1.8 },
    { id: 'blood-v', kind: 'blood', x: 3.4, y: 0.012, z: 8.9, rotationY: 1.4, size: 1.6 },
    { id: 'drain-v', kind: 'drain', x: 5.8, y: 0.01, z: 8.4 },

    // ---- SUBESTACION ----
    { id: 'light-se-1', kind: 'light', x: -4.2, y: 4.7, z: 16.0, intensity: 12, color: 0xc8d6c2, flicker: 0.35 },
    { id: 'light-se-2', kind: 'light', x: 4.2, y: 4.7, z: 19.6, intensity: 8, color: 0xffb577, flicker: 0.25 },
    { id: 'light-se-3', kind: 'light', x: 0, y: 4.7, z: 21.0, intensity: 3, color: 0xff3222, flicker: 0.85 },
    { id: 'light-se-work', kind: 'light', x: 0, y: 3.1, z: 17.4, intensity: 11, color: 0xd2dfc7, flicker: 0.25 },
    { id: 'breaker-b3', kind: 'breaker', x: 0, y: 1.35, z: 21.65, rotationY: Math.PI, breakerId: 'b3' },
    { id: 'transformer-1', kind: 'transformer', x: -3.6, y: 0, z: 17.4, rotationY: 0 },
    { id: 'transformer-2', kind: 'transformer', x: 3.6, y: 0, z: 17.4, rotationY: 0 },
    { id: 'transformer-3', kind: 'transformer', x: -3.2, y: 0, z: 20.6, rotationY: Math.PI },
    { id: 'transformer-4', kind: 'transformer', x: 3.2, y: 0, z: 20.6, rotationY: Math.PI },
    { id: 'note-protocolo', kind: 'note', x: -3.2, y: 1.24, z: 19.86, rotationY: 0.2, noteId: 'protocolo-inundacion' },
    { id: 'battery-se', kind: 'battery', x: 6.6, y: 0.18, z: 20.2 },
    { id: 'puddle-se-1', kind: 'puddle', x: 0, y: 0.02, z: 17.8, size: 2.6 },
    { id: 'puddle-se-2', kind: 'puddle', x: -5.8, y: 0.02, z: 19.6, size: 1.6 },
    { id: 'blood-se', kind: 'blood', x: 1.2, y: 0.012, z: 19.2, rotationY: 0.9, size: 1.9 },
    { id: 'cables-se-1', kind: 'cables', x: -6.2, y: 3.2, z: 18.0, length: 4.2 },
    { id: 'cables-se-2', kind: 'cables', x: 6.4, y: 2.4, z: 16.8, length: 3.4 },
    { id: 'pipe-se', kind: 'pipe', x: -7.6, y: 4.0, z: 18.0, axis: 'z', length: 7.4 },
    { id: 'extinguisher-se', kind: 'extinguisher', x: 7.6, y: 0, z: 14.8, rotationY: -Math.PI / 2 },
    { id: 'drain-se', kind: 'drain', x: 0, y: 0.01, z: 18.6, size: 1.5 },
    // ---- ARCHIVO ----
    { id: 'light-arch-1', kind: 'light', x: 18.2, y: 3.2, z: -14.4, intensity: 12, color: 0xc8d8c4, flicker: 0.35 },
    { id: 'light-arch-2', kind: 'light', x: 24.2, y: 3.2, z: -16.2, intensity: 6, color: 0xffb877, flicker: 0.2 },
    { id: 'light-arch-3', kind: 'light', x: 21.0, y: 3.2, z: -12.2, intensity: 0, color: 0xaab4a6, broken: true },
    { id: 'desk-arch-1', kind: 'desk', x: 18.4, y: 0, z: -13.4, rotationY: 0.05 },
    { id: 'desk-arch-2', kind: 'desk', x: 23.9, y: 0, z: -13.4, rotationY: -0.06 },
    { id: 'chair-arch-1', kind: 'chair', x: 18.4, y: 0, z: -12.4, rotationY: Math.PI },
    { id: 'chair-arch-2', kind: 'chair', x: 23.9, y: 0, z: -12.4, rotationY: Math.PI },
    { id: 'chair-archivo', kind: 'chair', x: 21.4, y: 0, z: -16.8, rotationY: 0.4 },
    { id: 'typewriter-arch', kind: 'typewriter', x: 18.9, y: 0.82, z: -13.4, rotationY: 0.05 },
    { id: 'cab-1', kind: 'filingCabinet', x: 16.6, y: 0, z: -17.5, rotationY: 0 },
    { id: 'cab-2', kind: 'filingCabinet', x: 19.2, y: 0, z: -17.5, rotationY: 0 },
    { id: 'cab-3', kind: 'filingCabinet', x: 21.8, y: 0, z: -17.5, rotationY: 0 },
    { id: 'cab-4', kind: 'filingCabinet', x: 24.4, y: 0, z: -17.5, rotationY: 0 },
    { id: 'safe-arch', kind: 'safe', x: 26.25, y: 0, z: -16.4, rotationY: -Math.PI / 2 },
    { id: 'shelf-arch', kind: 'shelf', x: 26.3, y: 0, z: -12.7, rotationY: -Math.PI / 2 },
    { id: 'map-arch', kind: 'mapBoard', x: 20.8, y: 1.7, z: -17.82, rotationY: 0 },
    { id: 'note-archivo', kind: 'note', x: 18.2, y: 0.98, z: -12.86, rotationY: 0.2, noteId: 'archivo-turno' },
    { id: 'note-psico', kind: 'note', x: 23.2, y: 0.98, z: -12.88, rotationY: -0.2, noteId: 'informe-psicologico' },
    { id: 'body-arch', kind: 'body', x: 16.8, y: 0.12, z: -12.1, rotationY: 0.5 },
    { id: 'tag-rios', kind: 'tag', x: 16.5, y: 0.55, z: -12.0, tagId: 'tag-rios' },
    { id: 'fuse-arch', kind: 'fuse', x: 15.35, y: 1.3, z: -15.2, rotationY: Math.PI / 2, fuseId: 'fuse-archivo' },
    { id: 'bottle-arch', kind: 'bottle', x: 22.4, y: 0.2, z: -17.0 },
    { id: 'blood-arch', kind: 'blood', x: 17.2, y: 0.012, z: -11.9, rotationY: 0.8, size: 1.6 },
    { id: 'puddle-arch', kind: 'puddle', x: 21.0, y: 0.02, z: -15.2, size: 1.4 },
    { id: 'ext-arch', kind: 'extinguisher', x: 26.5, y: 0, z: -11.6, rotationY: -Math.PI / 2 },

    // ---- CALDERAS ----
    { id: 'light-boiler-1', kind: 'light', x: -35.0, y: 4.6, z: -3.0, intensity: 12, color: 0xc6d8c4, flicker: 0.4 },
    { id: 'light-boiler-2', kind: 'light', x: -39.8, y: 4.6, z: -6.2, intensity: 8, color: 0xffbd7a, flicker: 0.2 },
    { id: 'light-boiler-3', kind: 'light', x: -32.2, y: 4.6, z: 1.2, intensity: 0, color: 0xaab4a6, broken: true },
    { id: 'light-boiler-work', kind: 'light', x: -33.4, y: 3.0, z: -1.4, intensity: 10, color: 0xd6e2cc, flicker: 0.3 },
    { id: 'boiler-1', kind: 'boiler', x: -36.4, y: 0, z: -5.6, rotationY: 0.2, size: 1.6 },
    { id: 'boiler-2', kind: 'boiler', x: -38.8, y: 0, z: -1.2, rotationY: -0.4, size: 1.3 },
    { id: 'boiler-3', kind: 'boiler', x: -33.2, y: 0, z: -6.9, rotationY: 0.6, size: 1.0 },
    { id: 'gauge-1', kind: 'gauge', x: -36.4, y: 1.5, z: -4.6, rotationY: 0 },
    { id: 'gauge-2', kind: 'gauge', x: -38.8, y: 1.4, z: -0.2, rotationY: 0 },
    { id: 'steam-vent-1', kind: 'steamVent', x: -39.9, y: 0, z: -7.6 },
    { id: 'steam-vent-2', kind: 'steamVent', x: -33.4, y: 0, z: 2.2 },
    { id: 'chain-1', kind: 'chain', x: -35.0, y: 4.7, z: -2.0, length: 3.6 },
    { id: 'chain-2', kind: 'chain', x: -40.2, y: 4.7, z: 1.4, length: 4.0 },
    { id: 'bodybag-1', kind: 'bodyBag', x: -40.6, y: 0.1, z: -7.4, rotationY: 0.6 },
    { id: 'bodybag-2', kind: 'bodyBag', x: -32.4, y: 0.1, z: 1.4, rotationY: 2.2 },
    { id: 'note-calderas', kind: 'note', x: -36.4, y: 0.9, z: -2.6, rotationY: 0.4, noteId: 'calderas-presion' },
    { id: 'crate-boiler', kind: 'crate', x: -36.4, y: 0.4, z: -2.6, size: 0.8 },
    { id: 'tag-vela', kind: 'tag', x: -40.2, y: 0.3, z: -7.1, tagId: 'tag-vela' },
    { id: 'fuse-boiler', kind: 'fuse', x: -30.35, y: 1.3, z: -6.4, rotationY: -Math.PI / 2, fuseId: 'fuse-calderas' },
    { id: 'bottle-boiler', kind: 'bottle', x: -32.2, y: 0.2, z: -4.0 },
    { id: 'nest-boiler', kind: 'crawlerNest', x: -41.0, y: 0.15, z: -7.6 },
    { id: 'puddle-boiler', kind: 'puddle', x: -37.0, y: 0.02, z: 1.8, size: 1.8 },
    { id: 'blood-boiler', kind: 'blood', x: -39.8, y: 0.012, z: -6.4, rotationY: 0.7, size: 1.4 },
    { id: 'pipe-boiler-1', kind: 'pipe', x: -36.0, y: 4.4, z: -8.7, axis: 'x', length: 11 },
    { id: 'pipe-boiler-2', kind: 'pipe', x: -41.7, y: 2.2, z: -3.0, axis: 'z', length: 11 },
    { id: 'locker-boiler', kind: 'hideLocker', x: -30.7, y: 0, z: -8.2, rotationY: -Math.PI / 2 },
    { id: 'ext-boiler', kind: 'extinguisher', x: -41.6, y: 0, z: 2.2, rotationY: Math.PI / 2 },

    // ---- CISTERNA ----
    { id: 'light-cistern-1', kind: 'light', x: -27.0, y: 4.2, z: 7.0, intensity: 10, color: 0xc6d8c4, flicker: 0.5 },
    { id: 'light-cistern-2', kind: 'light', x: -17.0, y: 4.2, z: 11.2, intensity: 7, color: 0xffbd7a, flicker: 0.3 },
    { id: 'light-cistern-3', kind: 'light', x: -22.0, y: 4.2, z: 13.8, intensity: 0, color: 0xaab4a6, broken: true },
    { id: 'pool-cistern', kind: 'pool', x: -22.5, y: 0.03, z: 9.0, size: 8.2 },
    { id: 'well-valve', kind: 'wellValve', x: -29.6, y: 1.2, z: 9.0, rotationY: Math.PI / 2 },
    { id: 'chain-3', kind: 'chain', x: -22.5, y: 4.4, z: 9.0, length: 4.2 },
    { id: 'chain-4', kind: 'chain', x: -18.5, y: 4.4, z: 12.2, length: 3.6 },
    { id: 'chain-5', kind: 'chain', x: -26.5, y: 4.4, z: 5.2, length: 3.0 },
    { id: 'bodybag-3', kind: 'bodyBag', x: -27.9, y: 0.1, z: 10.8, rotationY: 0.8 },
    { id: 'tag-duarte', kind: 'tag', x: -27.4, y: 0.3, z: 10.4, tagId: 'tag-duarte' },
    { id: 'fuse-cistern', kind: 'fuse', x: -15.35, y: 1.3, z: 12.0, rotationY: -Math.PI / 2, fuseId: 'fuse-cisterna' },
    { id: 'note-cisterna', kind: 'note', x: -17.0, y: 0.9, z: 5.4, rotationY: 0.3, noteId: 'cisterna-cadena' },
    { id: 'crate-cistern-1', kind: 'crate', x: -17.0, y: 0.4, z: 5.4, size: 0.8 },
    { id: 'note-carta', kind: 'note', x: -27.0, y: 0.9, z: 13.8, rotationY: -0.3, noteId: 'carta-sin-firma' },
    { id: 'crate-cistern-2', kind: 'crate', x: -27.0, y: 0.4, z: 13.8, size: 0.8 },
    { id: 'nest-cistern-1', kind: 'crawlerNest', x: -26.5, y: 0.15, z: 7.2 },
    { id: 'nest-cistern-2', kind: 'crawlerNest', x: -18.2, y: 0.15, z: 11.0 },
    { id: 'nest-cistern-3', kind: 'crawlerNest', x: -24.0, y: 0.15, z: 13.2 },
    { id: 'bottle-cistern', kind: 'bottle', x: -18.5, y: 0.2, z: 5.0 },
    { id: 'locker-cistern', kind: 'hideLocker', x: -29.1, y: 0, z: 4.4, rotationY: Math.PI / 2 },
    { id: 'puddle-cistern-1', kind: 'puddle', x: -20.0, y: 0.02, z: 4.8, size: 1.6 },
    { id: 'puddle-cistern-2', kind: 'puddle', x: -27.0, y: 0.02, z: 13.0, size: 1.4 },
    { id: 'blood-cistern', kind: 'blood', x: -25.5, y: 0.012, z: 11.8, rotationY: 0.9, size: 1.8 },
    { id: 'pipe-cistern', kind: 'pipe', x: -22.5, y: 4.1, z: 14.7, axis: 'x', length: 14 },
    { id: 'cables-cistern', kind: 'cables', x: -19.0, y: 4.0, z: 9.5, length: 4.0 },
    { id: 'drain-cistern', kind: 'drain', x: -22.5, y: 0.01, z: 9.0, size: 1.6 },
    { id: 'ext-cistern', kind: 'extinguisher', x: -29.5, y: 0, z: 13.5, rotationY: Math.PI / 2 },
  ],
  nav: {
    nodes: [
      { id: 'g0', x: 0, z: -7.6 },
      { id: 'g1', x: 0, z: -5.0 },
      { id: 'c-3', x: -13.0, z: -3.4 },
      { id: 'c-2', x: -8.6, z: -3.4 },
      { id: 'c-1', x: -4.2, z: -3.4 },
      { id: 'c0', x: 0, z: -3.4 },
      { id: 'c1', x: 4.2, z: -3.4 },
      { id: 'c2', x: 8.6, z: -3.4 },
      { id: 'c3', x: 13.0, z: -3.4 },
      { id: 'p0', x: -17.0, z: -3.4 },
      { id: 'p1', x: -21.0, z: -7.4 },
      { id: 'p2', x: -25.4, z: -4.0 },
      { id: 'p3', x: -26.0, z: 0.6 },
      { id: 'p4', x: -19.6, z: 1.2 },
      { id: 'p5', x: -17.4, z: -0.8 },
      { id: 'w0', x: 17.0, z: -3.4 },
      { id: 'w1', x: 21.0, z: -7.4 },
      { id: 'w2', x: 25.0, z: -4.0 },
      { id: 'w3', x: 25.8, z: 0.8 },
      { id: 'w4', x: 19.6, z: 1.4 },
      { id: 'w5', x: 17.4, z: -0.8 },
      { id: 's0', x: 0, z: -1.0 },
      { id: 's1', x: 0, z: 3.8 },
      { id: 's2', x: 0, z: 8.4 },
      { id: 's3', x: 0, z: 12.4 },
      { id: 'v0', x: 1.8, z: 6.5 },
      { id: 'v1', x: 4.2, z: 7.0 },
      { id: 'v2', x: 8.0, z: 7.4 },
      { id: 'e0', x: 0, z: 16.0 },
      { id: 'e1', x: -4.4, z: 18.2 },
      { id: 'e2', x: 4.4, z: 18.2 },
      { id: 'e3', x: 0, z: 20.6 },
      { id: 'a0', x: 21.0, z: -12.6 },
      { id: 'a1', x: 17.2, z: -15.5 },
      { id: 'a2', x: 24.8, z: -15.5 },
      { id: 'a3', x: 24.8, z: -12.4 },
      { id: 'b0', x: -31.4, z: -3.0 },
      { id: 'b1', x: -35.5, z: -6.5 },
      { id: 'b2', x: -39.5, z: -2.0 },
      { id: 'b3', x: -35.5, z: 1.2 },
      { id: 'qdoor', x: -22.0, z: 3.6 },
      { id: 'q0', x: -22.0, z: 4.6 },
      { id: 'q1', x: -27.8, z: 6.8 },
      { id: 'q2', x: -16.2, z: 6.8 },
      { id: 'q3', x: -27.8, z: 12.2 },
      { id: 'q4', x: -16.2, z: 12.2 },
      { id: 'q5', x: -22.0, z: 13.8 },
    ],
    edges: [
      ['g0', 'g1'],
      ['g1', 'c0'],
      ['c-3', 'c-2'],
      ['c-2', 'c-1'],
      ['c-1', 'c0'],
      ['c0', 'c1'],
      ['c1', 'c2'],
      ['c2', 'c3'],
      ['c-3', 'p0'],
      ['p0', 'p1'],
      ['p1', 'p2'],
      ['p2', 'p3'],
      ['p3', 'p4'],
      ['p4', 'p5'],
      ['p5', 'p0'],
      ['c3', 'w0'],
      ['w0', 'w1'],
      ['w1', 'w2'],
      ['w2', 'w3'],
      ['w3', 'w4'],
      ['w4', 'w5'],
      ['w5', 'w0'],
      ['c0', 's0'],
      ['s0', 's1'],
      ['s1', 's2'],
      ['s2', 's3'],
      ['s1', 'v0'],
      ['v0', 'v1'],
      ['v1', 'v2'],
      ['s2', 'v0'],
      ['s3', 'e0'],
      ['e0', 'e1'],
      ['e0', 'e2'],
      ['e0', 'e3'],
      ['e1', 'e3'],
      ['e2', 'e3'],
      ['g1', 'g0'],
      ['c0', 'g1'],
      ['c-2', 'c-3'],
      ['c-1', 'c-2'],
      ['c0', 'c-1'],
      ['c1', 'c0'],
      ['c2', 'c1'],
      ['c3', 'c2'],
      ['p0', 'c-3'],
      ['p1', 'p0'],
      ['p2', 'p1'],
      ['p3', 'p2'],
      ['p4', 'p3'],
      ['p5', 'p4'],
      ['p0', 'p5'],
      ['w0', 'c3'],
      ['w1', 'w0'],
      ['w2', 'w1'],
      ['w3', 'w2'],
      ['w4', 'w3'],
      ['w5', 'w4'],
      ['w0', 'w5'],
      ['s0', 'c0'],
      ['s1', 's0'],
      ['s2', 's1'],
      ['s3', 's2'],
      ['v0', 's1'],
      ['v1', 'v0'],
      ['v2', 'v1'],
      ['v0', 's2'],
      ['e0', 's3'],
      ['e1', 'e0'],
      ['e2', 'e0'],
      ['e3', 'e0'],
      ['e3', 'e1'],
      ['e3', 'e2'],
      ['a0', 'a1'],
      ['a1', 'a2'],
      ['a2', 'a3'],
      ['a3', 'a0'],
      ['a1', 'a0'],
      ['a2', 'a1'],
      ['a3', 'a2'],
      ['a0', 'a3'],
      ['a0', 'w1'],
      ['w1', 'a0'],
      ['b0', 'b1'],
      ['b1', 'b2'],
      ['b2', 'b3'],
      ['b3', 'b0'],
      ['b1', 'b0'],
      ['b2', 'b1'],
      ['b3', 'b2'],
      ['b0', 'b3'],
      ['b0', 'p2'],
      ['p2', 'b0'],
      ['qdoor', 'q0'],
      ['q0', 'qdoor'],
      ['qdoor', 'p4'],
      ['p4', 'qdoor'],
      ['qdoor', 'p3'],
      ['p3', 'qdoor'],
      ['q0', 'q1'],
      ['q1', 'q0'],
      ['q1', 'q3'],
      ['q3', 'q1'],
      ['q3', 'q5'],
      ['q5', 'q3'],
      ['q5', 'q4'],
      ['q4', 'q5'],
      ['q4', 'q2'],
      ['q2', 'q4'],
      ['q2', 'q0'],
      ['q0', 'q2'],
    ],
  },
};

export interface ZoneBox {
  id: string;
  name: string;
  banner: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const ZONE_BOXES: ZoneBox[] = LAYOUT.rooms.map((room) => ({
  id: room.id,
  name: room.name,
  banner: room.banner,
  minX: room.min[0],
  maxX: room.max[0],
  minZ: room.min[1],
  maxZ: room.max[1],
}));

export function zoneAt(x: number, z: number): ZoneBox | undefined {
  return ZONE_BOXES.find((zone) => x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ);
}

/** Puntos guionizados de aparicion de la criatura (sustos y patrulla). */
export const MONSTER_SETPIECES = {
  pumpGlimpse: { x: -27.6, z: -8.8, yaw: 0.2 },
  corridorPass: { x: -11.4, z: -3.4, yaw: Math.PI / 2 },
  lockerRoom: { x: 6.8, z: 7.4, yaw: Math.PI },
  substation: { x: 4.4, z: 18.2, yaw: -1.2 },
  archivePeek: { x: 19.4, z: -16.4, yaw: 0.4 },
  boilerPeek: { x: -36.2, z: -5.2, yaw: 1.2 },
  cisternEmerge: { x: -22.5, z: 9.0, yaw: 0.1 },
  start: { x: -22.5, z: -7.0, yaw: 0 },
};
