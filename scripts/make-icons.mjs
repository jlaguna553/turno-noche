/**
 * Genera los iconos PNG de la PWA sin dependencias (encoder PNG minimo).
 * Arte procedural: una cara palida en la oscuridad, sin assets externos.
 *
 * Uso: node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Elipse con borde suave; devuelve cobertura 0..1. */
function ellipse(x, y, cx, cy, rx, ry, soft = 0.012) {
  const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return 1 - smooth(1 - soft, 1 + soft, d);
}

function draw(size, maskable) {
  const pixels = Buffer.alloc(size * size * 4);
  const s = maskable ? 0.72 : 1;
  const cx = 0.5;
  const cy = 0.465;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const x = (px + 0.5) / size;
      const y = (py + 0.5) / size;
      const nx = (x - 0.5) / s + 0.5;
      const ny = (y - 0.5) / s + 0.5;

      // Fondo: placa metalica oscura con vineta y un rescoldo rojo abajo.
      const rad = Math.hypot(x - 0.5, y - 0.52);
      let r = 9 - rad * 9;
      let g = 10 - rad * 10;
      let b = 12 - rad * 11;
      const glow = Math.max(0, 1 - Math.hypot(x - 0.5, y - 0.92) * 3.4);
      r += glow * 26;
      g += glow * 5;
      b += glow * 3;

      // Cara palida.
      const head = ellipse(nx, ny, cx, cy, 0.205, 0.258, 0.016);
      const jaw = ellipse(nx, ny, cx, cy + 0.175, 0.128, 0.13, 0.016) * 0.9;
      const chin = ellipse(nx, ny, cx, cy + 0.245, 0.085, 0.075, 0.02) * 0.8;
      const face = Math.min(1, head + jaw + chin);
      const grain = (Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1;
      const skin = 0.78 + grain * 0.06;
      r = r * (1 - face) + 205 * skin * face;
      g = g * (1 - face) + 194 * skin * face;
      b = b * (1 - face) + 172 * skin * face;

      // Cuencas.
      const eyeL = ellipse(nx, ny, cx - 0.083, cy - 0.035, 0.052, 0.068, 0.02);
      const eyeR = ellipse(nx, ny, cx + 0.083, cy - 0.035, 0.052, 0.068, 0.02);
      const socket = Math.min(1, eyeL + eyeR);
      r = r * (1 - socket) + 5 * socket;
      g = g * (1 - socket) + 6 * socket;
      b = b * (1 - socket) + 8 * socket;

      // Fosas nasales.
      const nose = ellipse(nx, ny, cx, cy + 0.062, 0.017, 0.03, 0.025);
      r = r * (1 - nose) + 12 * nose;
      g = g * (1 - nose) + 11 * nose;
      b = b * (1 - nose) + 10 * nose;

      // Boca: rendija negra con dientes.
      const mouth = ellipse(nx, ny, cx, cy + 0.165, 0.078, 0.052, 0.018);
      const teeth = Math.abs(Math.sin(ny * 190)) > 0.62 ? 0.55 : 0;
      const mouthDark = mouth * (1 - teeth * 0.7);
      r = r * (1 - mouthDark) + 6 * mouthDark;
      g = g * (1 - mouthDark) + 6 * mouthDark;
      b = b * (1 - mouthDark) + 7 * mouthDark;

      // Grieta vertical y reguero rojo desde la boca.
      const crack = ellipse(nx, ny, cx + 0.088, cy - 0.13, 0.008, 0.16, 0.008) * 0.9;
      r = r * (1 - crack) + 24 * crack;
      g = g * (1 - crack) + 10 * crack;
      b = b * (1 - crack) + 9 * crack;

      const drip = ellipse(nx, ny, cx - 0.012, cy + 0.285, 0.008, 0.075, 0.02);
      r = r * (1 - drip) + 122 * drip;
      g = g * (1 - drip) + 16 * drip;
      b = b * (1 - drip) + 12 * drip;

      // Rayado de escaneo sutil.
      const scan = py % 3 === 0 ? 0.94 : 1;
      const i = (py * size + px) * 4;
      pixels[i] = Math.max(0, Math.min(255, r * scan));
      pixels[i + 1] = Math.max(0, Math.min(255, g * scan));
      pixels[i + 2] = Math.max(0, Math.min(255, b * scan));
      pixels[i + 3] = 255;
    }
  }
  return encodePng(size, size, pixels);
}

mkdirSync(join(root, 'public', 'icons'), { recursive: true });
writeFileSync(join(root, 'public', 'icons', 'icon-192.png'), draw(192, false));
writeFileSync(join(root, 'public', 'icons', 'icon-512.png'), draw(512, false));
writeFileSync(join(root, 'public', 'icons', 'maskable-512.png'), draw(512, true));
console.log('Iconos generados en public/icons');
