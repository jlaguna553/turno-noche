import * as THREE from 'three';
import { mulberry32 } from '../core/rng';

/**
 * Materiales y texturas 100% procedurales. Cero assets externos.
 *
 * Paleta: hormigon mojado, azulejo de desinfeccion, acero pintado, oxido y
 * sangre seca. Todo se dibuja en canvas al arrancar y se reutiliza.
 */

export type MaterialKey =
  | 'concreteFloor'
  | 'concreteWall'
  | 'tileWall'
  | 'metalPanel'
  | 'rust'
  | 'grate'
  | 'hazard'
  | 'door'
  | 'wood'
  | 'fabric'
  | 'pipe'
  | 'bone'
  | 'plastic'
  | 'lamp';

export interface MaterialSet {
  materials: Record<MaterialKey, THREE.MeshStandardMaterial>;
  blood: THREE.MeshBasicMaterial;
  grime: THREE.MeshBasicMaterial;
  water: THREE.MeshStandardMaterial;
  screenTexture(lines: string[], accent?: string): THREE.CanvasTexture;
  dispose(): void;
}

function makeCanvas(width: number, height = width): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D no disponible');
  return context;
}

/** Ruido fino teselado en los bordes para que el tile no muestre costuras. */
function speckle(
  context: CanvasRenderingContext2D,
  size: number,
  rng: () => number,
  count: number,
  maxAlpha: number,
  dark = true,
): void {
  for (let i = 0; i < count; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 0.4 + rng() * 2.4;
    const alpha = rng() * maxAlpha;
    context.fillStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        context.beginPath();
        context.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
}

/** Manchas humedas: radiales, teseladas, con borde irregular. */
function blotches(
  context: CanvasRenderingContext2D,
  size: number,
  rng: () => number,
  count: number,
  color: string,
  maxRadius: number,
  maxAlpha: number,
): void {
  for (let i = 0; i < count; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = maxRadius * (0.35 + rng() * 0.65);
    const alpha = maxAlpha * (0.25 + rng() * 0.75);
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const gradient = context.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
        gradient.addColorStop(0, color.replace('ALPHA', String(alpha)));
        gradient.addColorStop(1, color.replace('ALPHA', '0'));
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
}

function scratches(
  context: CanvasRenderingContext2D,
  size: number,
  rng: () => number,
  count: number,
  color: string,
): void {
  context.strokeStyle = color;
  context.lineWidth = 0.7;
  for (let i = 0; i < count; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const length = 4 + rng() * size * 0.18;
    const angle = rng() * Math.PI * 2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
}

function build(
  size: number,
  draw: (context: CanvasRenderingContext2D, size: number, rng: () => number) => void,
  seed: number,
): HTMLCanvasElement {
  const canvas = makeCanvas(size);
  const context = ctx2d(canvas);
  draw(context, size, mulberry32(seed));
  return canvas;
}

const SIZE = 256;

function drawConcreteFloor(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#2b2d2b';
      context.fillRect(0, 0, size, size);
      speckle(context, size, rng, 5200, 0.16);
      speckle(context, size, rng, 1200, 0.1, false);
      blotches(context, size, rng, 16, 'rgba(7,9,8,ALPHA)', 62, 0.55);
      blotches(context, size, rng, 7, 'rgba(52,44,32,ALPHA)', 40, 0.3);
      context.strokeStyle = 'rgba(6,7,7,0.7)';
      context.lineWidth = 1.2;
      for (let i = 0; i < 7; i += 1) {
        let x = rng() * size;
        let y = rng() * size;
        context.beginPath();
        context.moveTo(x, y);
        for (let step = 0; step < 5; step += 1) {
          x += (rng() - 0.5) * 54;
          y += (rng() - 0.5) * 54;
          context.lineTo(x, y);
        }
        context.stroke();
      }
      // juntas de solera
      context.fillStyle = 'rgba(10,11,11,0.55)';
      context.fillRect(0, size / 2 - 1, size, 2);
      context.fillRect(size / 2 - 1, 0, 2, size);
    },
    101,
  );
}

function drawConcreteWall(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#34342e';
      context.fillRect(0, 0, size, size);
      speckle(context, size, rng, 3800, 0.14);
      // regueros de agua desde arriba
      for (let i = 0; i < 24; i += 1) {
        const x = rng() * size;
        const width = 1 + rng() * 6;
        const height = 20 + rng() * size;
        const gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgba(9,12,10,${0.12 + rng() * 0.22})`);
        gradient.addColorStop(1, 'rgba(9,12,10,0)');
        context.fillStyle = gradient;
        context.fillRect(x, 0, width, height);
      }
      blotches(context, size, rng, 9, 'rgba(18,26,18,ALPHA)', 48, 0.35);
      // banda inferior sucia
      const band = context.createLinearGradient(0, size * 0.72, 0, size);
      band.addColorStop(0, 'rgba(5,6,5,0)');
      band.addColorStop(1, 'rgba(5,6,5,0.72)');
      context.fillStyle = band;
      context.fillRect(0, size * 0.72, size, size * 0.28);
      scratches(context, size, rng, 40, 'rgba(0,0,0,0.18)');
    },
    203,
  );
}

function drawTile(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#6c7066';
      context.fillRect(0, 0, size, size);
      const tile = size / 4;
      for (let ty = 0; ty < 4; ty += 1) {
        for (let tx = 0; tx < 4; tx += 1) {
          const shade = 118 + Math.floor(rng() * 26);
          context.fillStyle = `rgb(${shade},${shade + 4},${shade - 6})`;
          context.fillRect(tx * tile + 2, ty * tile + 2, tile - 4, tile - 4);
          // veta y grietas del esmalte
          if (rng() > 0.6) {
            context.strokeStyle = 'rgba(30,34,28,0.35)';
            context.beginPath();
            context.moveTo(tx * tile + 6 + rng() * 20, ty * tile + 6);
            context.lineTo(tx * tile + 10 + rng() * 30, ty * tile + tile - 8);
            context.stroke();
          }
        }
      }
      // lechada sucia y moho
      for (let i = 0; i < 70; i += 1) {
        context.fillStyle = `rgba(28,36,24,${0.15 + rng() * 0.4})`;
        context.fillRect(rng() * size, rng() * size, 1 + rng() * 4, 1 + rng() * 10);
      }
      blotches(context, size, rng, 10, 'rgba(20,30,18,ALPHA)', 30, 0.35);
      speckle(context, size, rng, 900, 0.12);
    },
    307,
  );
}

function drawMetalPanel(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#4b504c';
      context.fillRect(0, 0, size, size);
      speckle(context, size, rng, 2500, 0.12);
      // paneles remachados
      context.strokeStyle = 'rgba(12,14,13,0.75)';
      context.lineWidth = 2;
      context.strokeRect(4, 4, size - 8, size - 8);
      context.beginPath();
      context.moveTo(0, size / 2);
      context.lineTo(size, size / 2);
      context.stroke();
      for (let i = 0; i < 18; i += 1) {
        const x = 10 + rng() * (size - 20);
        const y = rng() > 0.5 ? 14 : size - 14;
        context.fillStyle = 'rgba(20,22,20,0.9)';
        context.beginPath();
        context.arc(x, y, 1.6, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(140,146,138,0.25)';
        context.beginPath();
        context.arc(x - 0.4, y - 0.4, 1, 0, Math.PI * 2);
        context.fill();
      }
      blotches(context, size, rng, 12, 'rgba(62,34,16,ALPHA)', 34, 0.45);
      scratches(context, size, rng, 70, 'rgba(190,190,180,0.06)');
      const band = context.createLinearGradient(0, size * 0.75, 0, size);
      band.addColorStop(0, 'rgba(0,0,0,0)');
      band.addColorStop(1, 'rgba(0,0,0,0.5)');
      context.fillStyle = band;
      context.fillRect(0, size * 0.75, size, size * 0.25);
    },
    409,
  );
}

function drawRust(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#3d2a1d';
      context.fillRect(0, 0, size, size);
      blotches(context, size, rng, 40, 'rgba(122,58,24,ALPHA)', 46, 0.55);
      blotches(context, size, rng, 20, 'rgba(58,30,14,ALPHA)', 30, 0.6);
      speckle(context, size, rng, 4200, 0.28);
      speckle(context, size, rng, 900, 0.12, false);
    },
    503,
  );
}

function drawGrate(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#232624';
      context.fillRect(0, 0, size, size);
      const step = 16;
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          context.fillStyle = 'rgba(4,5,5,0.85)';
          context.fillRect(x + 3, y + 3, step - 6, step - 6);
          context.fillStyle = 'rgba(120,124,118,0.16)';
          context.fillRect(x + 2, y + 2, step - 6, 1.5);
        }
      }
      blotches(context, size, rng, 12, 'rgba(50,32,16,ALPHA)', 26, 0.4);
      speckle(context, size, rng, 1400, 0.18);
    },
    601,
  );
}

function drawHazard(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#8f7c22';
      context.fillRect(0, 0, size, size);
      context.save();
      context.translate(size / 2, size / 2);
      context.rotate(Math.PI / 4);
      context.fillStyle = '#161715';
      for (let i = -size; i < size; i += 44) context.fillRect(i, -size, 22, size * 2);
      context.restore();
      speckle(context, size, rng, 3400, 0.22);
      blotches(context, size, rng, 18, 'rgba(40,28,14,ALPHA)', 32, 0.45);
      scratches(context, size, rng, 60, 'rgba(0,0,0,0.3)');
    },
    701,
  );
}

function drawDoor(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#39443c';
      context.fillRect(0, 0, size, size);
      context.strokeStyle = 'rgba(12,15,13,0.8)';
      context.lineWidth = 3;
      context.strokeRect(3, 3, size - 6, size - 6);
      context.strokeRect(16, 16, size - 32, size - 32);
      context.fillStyle = 'rgba(10,12,11,0.35)';
      context.fillRect(size / 2 - 1, 16, 2, size - 32);
      // placa y remaches
      context.fillStyle = '#5d6157';
      context.fillRect(size - 46, size * 0.44, 12, 26);
      context.fillStyle = 'rgba(8,9,8,0.9)';
      context.beginPath();
      context.arc(size - 40, size * 0.44 + 6, 2, 0, Math.PI * 2);
      context.fill();
      // estarcido 07
      context.save();
      context.globalAlpha = 0.55;
      context.fillStyle = '#c7c2ae';
      context.font = 'bold 44px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('07', size / 2, size * 0.33);
      context.restore();
      // oxido y golpes
      blotches(context, size, rng, 16, 'rgba(98,48,20,ALPHA)', 28, 0.36);
      scratches(context, size, rng, 50, 'rgba(200,200,190,0.06)');
      speckle(context, size, rng, 2200, 0.16);
      const band = context.createLinearGradient(0, size * 0.8, 0, size);
      band.addColorStop(0, 'rgba(0,0,0,0)');
      band.addColorStop(1, 'rgba(0,0,0,0.55)');
      context.fillStyle = band;
      context.fillRect(0, size * 0.8, size, size * 0.2);
    },
    809,
  );
}

function drawWood(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#3b2e22';
      context.fillRect(0, 0, size, size);
      for (let i = 0; i < 42; i += 1) {
        context.strokeStyle = `rgba(${60 + rng() * 30},${44 + rng() * 20},${28 + rng() * 14},${0.2 + rng() * 0.3})`;
        context.lineWidth = 0.6 + rng() * 1.6;
        context.beginPath();
        const y = rng() * size;
        context.moveTo(0, y);
        context.bezierCurveTo(size * 0.3, y + (rng() - 0.5) * 8, size * 0.7, y + (rng() - 0.5) * 8, size, y);
        context.stroke();
      }
      context.fillStyle = 'rgba(10,8,6,0.6)';
      for (let i = 1; i < 4; i += 1) context.fillRect(0, (size / 4) * i - 1, size, 2);
      speckle(context, size, rng, 1200, 0.16);
    },
    907,
  );
}

function drawFabric(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#3c3a32';
      context.fillRect(0, 0, size, size);
      for (let i = 0; i < size; i += 3) {
        context.fillStyle = `rgba(20,22,18,${0.06 + rng() * 0.08})`;
        context.fillRect(0, i, size, 1);
        context.fillRect(i, 0, 1, size);
      }
      blotches(context, size, rng, 12, 'rgba(30,18,10,ALPHA)', 34, 0.5);
      blotches(context, size, rng, 4, 'rgba(60,20,14,ALPHA)', 20, 0.5);
      speckle(context, size, rng, 2200, 0.15);
    },
    1009,
  );
}

function drawPipe(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#454b47';
      context.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 42) {
        context.fillStyle = 'rgba(14,16,15,0.7)';
        context.fillRect(0, y, size, 4);
        context.fillStyle = 'rgba(150,154,146,0.12)';
        context.fillRect(0, y + 4, size, 2);
      }
      context.fillStyle = 'rgba(186,188,178,0.08)';
      context.fillRect(0, 0, size, 10);
      speckle(context, size, rng, 1800, 0.14);
      blotches(context, size, rng, 10, 'rgba(80,42,18,ALPHA)', 26, 0.4);
    },
    1103,
  );
}

function drawBone(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#b9b3a2';
      context.fillRect(0, 0, size, size);
      blotches(context, size, rng, 30, 'rgba(96,92,80,ALPHA)', 40, 0.3);
      blotches(context, size, rng, 8, 'rgba(94,48,40,ALPHA)', 24, 0.35);
      speckle(context, size, rng, 2400, 0.18);
      speckle(context, size, rng, 700, 0.16, false);
      // venas finas
      context.strokeStyle = 'rgba(52,50,44,0.25)';
      for (let i = 0; i < 16; i += 1) {
        context.lineWidth = 0.6;
        context.beginPath();
        let x = rng() * size;
        let y = rng() * size;
        context.moveTo(x, y);
        for (let step = 0; step < 4; step += 1) {
          x += (rng() - 0.5) * 26;
          y += (rng() - 0.5) * 26;
          context.lineTo(x, y);
        }
        context.stroke();
      }
    },
    1201,
  );
}

function drawPlastic(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#8d928a';
      context.fillRect(0, 0, size, size);
      for (let i = 0; i < 42; i += 1) {
        context.strokeStyle = `rgba(255,255,255,${0.05 + rng() * 0.08})`;
        context.lineWidth = 1 + rng() * 2;
        context.beginPath();
        const x = rng() * size;
        context.moveTo(x, 0);
        context.bezierCurveTo(x + 20, size * 0.3, x - 20, size * 0.7, x + 6, size);
        context.stroke();
      }
      blotches(context, size, rng, 10, 'rgba(60,58,46,ALPHA)', 26, 0.3);
      speckle(context, size, rng, 600, 0.08);
    },
    1301,
  );
}

function drawLamp(): HTMLCanvasElement {
  return build(
    SIZE,
    (context, size, rng) => {
      context.fillStyle = '#d8d5c4';
      context.fillRect(0, 0, size, size);
      context.fillStyle = 'rgba(120,116,96,0.35)';
      for (let i = 0; i < size; i += 8) context.fillRect(i, 0, 1, size);
      blotches(context, size, rng, 22, 'rgba(90,70,40,ALPHA)', 30, 0.4);
      speckle(context, size, rng, 1600, 0.14);
      // mosquito muerto
      context.fillStyle = 'rgba(20,18,14,0.7)';
      context.fillRect(size * 0.63, size * 0.4, 3, 5);
    },
    1409,
  );
}

function drawBlood(): HTMLCanvasElement {
  return build(
    256,
    (context, size, rng) => {
      context.clearRect(0, 0, size, size);
      // charco central
      const gradient = context.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size * 0.34);
      gradient.addColorStop(0, 'rgba(58,9,7,0.92)');
      gradient.addColorStop(0.55, 'rgba(44,7,6,0.72)');
      gradient.addColorStop(1, 'rgba(24,4,3,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      // salpicaduras
      for (let i = 0; i < 90; i += 1) {
        const angle = rng() * Math.PI * 2;
        const distance = size * (0.1 + rng() * 0.36);
        const x = size / 2 + Math.cos(angle) * distance;
        const y = size / 2 + Math.sin(angle) * distance;
        const radius = 0.8 + rng() * 5.5;
        context.fillStyle = `rgba(${30 + rng() * 26},6,5,${0.35 + rng() * 0.55})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      // regueros
      context.strokeStyle = 'rgba(36,6,5,0.8)';
      for (let i = 0; i < 7; i += 1) {
        const x = size * (0.3 + rng() * 0.4);
        const length = size * (0.1 + rng() * 0.4);
        context.lineWidth = 1 + rng() * 4;
        context.beginPath();
        context.moveTo(x, size * 0.45);
        context.lineTo(x + (rng() - 0.5) * 20, size * 0.45 + length);
        context.stroke();
      }
    },
    1511,
  );
}

function drawGrime(): HTMLCanvasElement {
  return build(
    256,
    (context, size, rng) => {
      context.clearRect(0, 0, size, size);
      blotches(context, size, rng, 26, 'rgba(6,8,6,ALPHA)', 60, 0.55);
      speckle(context, size, rng, 2600, 0.3);
    },
    1601,
  );
}

export function createMaterialSet(maxAnisotropy = 8): MaterialSet {
  const anisotropy = Math.max(1, maxAnisotropy);
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  const fromCanvas = (canvas: HTMLCanvasElement, repeat = 1, srgb = true): THREE.CanvasTexture => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = anisotropy;
    texture.repeat.set(repeat, repeat);
    texture.needsUpdate = true;
    textures.push(texture);
    return texture;
  };

  const bumpCanvas = makeCanvas(256);
  const bumpCtx = ctx2d(bumpCanvas);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, 256, 256);
  const bumpRng = mulberry32(7717);
  for (let i = 0; i < 4200; i += 1) {
    const value = Math.floor(70 + bumpRng() * 120);
    bumpCtx.fillStyle = `rgb(${value},${value},${value})`;
    bumpCtx.fillRect(bumpRng() * 256, bumpRng() * 256, 1 + bumpRng() * 3, 1 + bumpRng() * 3);
  }
  const bumpTexture = fromCanvas(bumpCanvas, 4, false);

  const make = (params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const material = new THREE.MeshStandardMaterial(params);
    materials.push(material);
    return material;
  };

  const floorTex = fromCanvas(drawConcreteFloor(), 3);
  const wallTex = fromCanvas(drawConcreteWall(), 2);
  const tileTex = fromCanvas(drawTile(), 2);
  const metalTex = fromCanvas(drawMetalPanel(), 1);
  const rustTex = fromCanvas(drawRust(), 2);
  const grateTex = fromCanvas(drawGrate(), 2);
  const hazardTex = fromCanvas(drawHazard(), 1);
  const doorTex = fromCanvas(drawDoor(), 1);
  const woodTex = fromCanvas(drawWood(), 1);
  const fabricTex = fromCanvas(drawFabric(), 1);
  const pipeTex = fromCanvas(drawPipe(), 2);
  const boneTex = fromCanvas(drawBone(), 1);
  const plasticTex = fromCanvas(drawPlastic(), 1);
  const lampTex = fromCanvas(drawLamp(), 1);

  const base = { roughnessMap: bumpTexture, metalnessMap: bumpTexture };

  const set: Record<MaterialKey, THREE.MeshStandardMaterial> = {
    concreteFloor: make({
      ...base,
      map: floorTex,
      bumpMap: bumpTexture,
      bumpScale: 0.5,
      color: 0x9b9c93,
      roughness: 0.93,
      metalness: 0.04,
      envMapIntensity: 0.2,
    }),
    concreteWall: make({
      ...base,
      map: wallTex,
      bumpMap: bumpTexture,
      bumpScale: 0.42,
      color: 0xa8a79b,
      roughness: 0.95,
      metalness: 0.03,
      envMapIntensity: 0.15,
    }),
    tileWall: make({
      ...base,
      map: tileTex,
      bumpMap: bumpTexture,
      bumpScale: 0.32,
      color: 0xa9ada2,
      roughness: 0.72,
      metalness: 0.05,
      envMapIntensity: 0.25,
    }),
    metalPanel: make({
      ...base,
      map: metalTex,
      bumpMap: bumpTexture,
      bumpScale: 0.3,
      color: 0x9aa19b,
      roughness: 0.62,
      metalness: 0.52,
      envMapIntensity: 0.5,
    }),
    rust: make({
      ...base,
      map: rustTex,
      bumpMap: bumpTexture,
      bumpScale: 0.35,
      color: 0xa98a72,
      roughness: 0.88,
      metalness: 0.35,
      envMapIntensity: 0.3,
    }),
    grate: make({
      ...base,
      map: grateTex,
      bumpMap: bumpTexture,
      bumpScale: 0.4,
      color: 0x8f958f,
      roughness: 0.55,
      metalness: 0.7,
      envMapIntensity: 0.5,
    }),
    hazard: make({
      ...base,
      map: hazardTex,
      bumpMap: bumpTexture,
      bumpScale: 0.25,
      color: 0xa8a08a,
      roughness: 0.7,
      metalness: 0.25,
      envMapIntensity: 0.3,
    }),
    door: make({
      ...base,
      map: doorTex,
      bumpMap: bumpTexture,
      bumpScale: 0.3,
      color: 0x9da49b,
      roughness: 0.66,
      metalness: 0.4,
      envMapIntensity: 0.35,
    }),
    wood: make({
      ...base,
      map: woodTex,
      bumpMap: bumpTexture,
      bumpScale: 0.25,
      color: 0xa08a74,
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.12,
    }),
    fabric: make({
      ...base,
      map: fabricTex,
      bumpMap: bumpTexture,
      bumpScale: 0.2,
      color: 0x99968a,
      roughness: 0.98,
      metalness: 0,
      envMapIntensity: 0.08,
    }),
    pipe: make({
      ...base,
      map: pipeTex,
      bumpMap: bumpTexture,
      bumpScale: 0.2,
      color: 0x8f958f,
      roughness: 0.5,
      metalness: 0.75,
      envMapIntensity: 0.5,
    }),
    bone: make({
      ...base,
      map: boneTex,
      bumpMap: bumpTexture,
      bumpScale: 0.24,
      color: 0xd4cdb8,
      roughness: 0.82,
      metalness: 0.02,
      envMapIntensity: 0.2,
    }),
    plastic: make({
      map: plasticTex,
      color: 0xbfc4b6,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 0.4,
    }),
    lamp: make({
      map: lampTex,
      emissiveMap: lampTex,
      emissive: 0xfff2cf,
      emissiveIntensity: 1.6,
      color: 0x15140f,
      roughness: 0.4,
      metalness: 0,
    }),
  };

  const bloodTexture = fromCanvas(drawBlood(), 1);
  const blood = new THREE.MeshBasicMaterial({
    map: bloodTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  materials.push(blood);

  const grimeTexture = fromCanvas(drawGrime(), 1);
  const grime = new THREE.MeshBasicMaterial({
    map: grimeTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.7,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  materials.push(grime);

  const water = make({
    color: 0x0b1412,
    roughness: 0.08,
    metalness: 0.55,
    transparent: true,
    opacity: 0.62,
    envMapIntensity: 0.8,
  });

  return {
    materials: set,
    blood,
    grime,
    water,
    screenTexture(lines: string[], accent = '#9fd6b4'): THREE.CanvasTexture {
      const canvas = makeCanvas(512, 256);
      const context = ctx2d(canvas);
      context.fillStyle = '#04100a';
      context.fillRect(0, 0, 512, 256);
      context.fillStyle = 'rgba(120, 255, 180, 0.06)';
      for (let y = 0; y < 256; y += 4) context.fillRect(0, y, 512, 1);
      context.font = 'bold 22px monospace';
      context.textBaseline = 'top';
      lines.forEach((line, index) => {
        context.fillStyle = index === 0 ? '#d8ffe4' : accent;
        context.globalAlpha = index === 0 ? 1 : 0.86;
        context.fillText(line.slice(0, 30), 24, 22 + index * 32);
      });
      context.globalAlpha = 0.18;
      context.fillStyle = accent;
      context.fillRect(0, 236, 512, 2);
      context.globalAlpha = 1;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      textures.push(texture);
      return texture;
    },
    dispose(): void {
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
      textures.length = 0;
      materials.length = 0;
    },
  };
}

/** Clona un material ajustando la repeticion de su textura (muros de distinta longitud). */
export function repeatMaterial(
  material: THREE.MeshStandardMaterial,
  repeatX: number,
  repeatY: number,
): THREE.MeshStandardMaterial {
  const clone = material.clone();
  if (clone.map) {
    clone.map = clone.map.clone();
    clone.map.repeat.set(repeatX, repeatY);
    clone.map.needsUpdate = true;
  }
  if (clone.bumpMap) {
    clone.bumpMap = clone.bumpMap.clone();
    clone.bumpMap.repeat.set(repeatX, repeatY);
    clone.bumpMap.needsUpdate = true;
  }
  clone.needsUpdate = true;
  return clone;
}
