// Draws the toolbar and store icons as PNGs into icons/. Run with `npm run icons`.
// Shapes follow the mockup's 24-unit glyphs, drawn with supersampled distance tests so no image library is needed.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { COLORS } from '../src/shared/brand.ts';

type RGB = [number, number, number];
type Shape = (x: number, y: number) => boolean;
interface Layer {
  shape: Shape;
  color: RGB;
}

const WHITE: RGB = [255, 255, 255];
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function roundedSquare(size: number, radius: number): Shape {
  return (x, y) => {
    const qx = Math.abs(x - size / 2) - (size / 2 - radius);
    const qy = Math.abs(y - size / 2) - (size / 2 - radius);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) <= radius;
  };
}

// Glyph primitives in the 24-unit viewBox, mapped onto the tile.
function glyphSpace(size: number) {
  const scale = size <= 16 ? 0.92 : size <= 32 ? 0.8 : 0.62;
  const half = size <= 16 ? 1.9 : size <= 32 ? 1.6 : 1.2; // half the stroke width, in viewBox units
  const g = size * scale;
  const offset = (size - g) / 2;
  const toVb = (p: number) => ((p - offset) / g) * 24;
  return {
    ring: (cx: number, cy: number, r: number): Shape => (x, y) =>
      Math.abs(Math.hypot(toVb(x) - cx, toVb(y) - cy) - r) <= half,
    line: (ax: number, ay: number, bx: number, by: number, extra = 0): Shape => (x, y) =>
      segmentDistance(toVb(x), toVb(y), ax, ay, bx, by) <= half + extra,
  };
}

const union = (...shapes: Shape[]): Shape => (x, y) => shapes.some((s) => s(x, y));

function logo(size: number): Shape {
  const g = glyphSpace(size);
  return union(g.ring(12, 12, 8), g.line(6.5, 17.5, 17.5, 6.5));
}

function alert(size: number): Shape {
  const g = glyphSpace(size);
  return union(g.ring(12, 12, 9), g.line(12, 7.5, 12, 12.5), g.line(12, 16.6, 12, 16.6));
}

function render(size: number, layers: Layer[]): Uint8Array {
  const samples = 6;
  const out = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = px + (sx + 0.5) / samples;
          const y = py + (sy + 0.5) / samples;
          for (let i = layers.length - 1; i >= 0; i--) {
            if (layers[i].shape(x, y)) {
              [r, g, b] = [r + layers[i].color[0], g + layers[i].color[1], b + layers[i].color[2]];
              a++;
              break;
            }
          }
        }
      }
      const o = (py * size + px) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round((a / (samples * samples)) * 255);
      }
    }
  }
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const tile = (size: number) => roundedSquare(size, size * 0.28);

const icons: Record<string, (size: number) => Layer[]> = {
  rejected: (s) => [
    { shape: tile(s), color: rgb(COLORS.accent) },
    { shape: logo(s), color: WHITE },
  ],
  hidden: (s) => [
    { shape: tile(s), color: rgb(COLORS.hidden) },
    { shape: logo(s), color: WHITE },
  ],
  none: (s) => [
    { shape: tile(s), color: rgb(COLORS.neutralTile) },
    { shape: logo(s), color: rgb(COLORS.secondary) },
  ],
  missed: (s) => [
    { shape: tile(s), color: rgb(COLORS.missed) },
    { shape: alert(s), color: WHITE },
  ],
  // Paused: the grey mark, faded, with a slash across it in the opposite direction to the logo's own.
  paused: (s) => {
    const g = glyphSpace(s);
    return [
      { shape: tile(s), color: rgb(COLORS.neutralTile) },
      { shape: logo(s), color: rgb('#A7B1AC') },
      { shape: g.line(4, 4, 20, 20, s <= 16 ? 1.4 : 1.2), color: rgb(COLORS.neutralTile) },
      { shape: g.line(4, 4, 20, 20), color: rgb(COLORS.secondary) },
    ];
  },
};

const dir = new URL('../icons/', import.meta.url);
mkdirSync(dir, { recursive: true });

for (const [state, layers] of Object.entries(icons)) {
  for (const size of [16, 32]) {
    writeFileSync(new URL(`${state}-${size}.png`, dir), encodePng(size, render(size, layers(size))));
  }
}
for (const size of [16, 32, 48, 128]) {
  writeFileSync(new URL(`icon-${size}.png`, dir), encodePng(size, render(size, icons.rejected(size))));
}
console.log('Icons written to icons/');
