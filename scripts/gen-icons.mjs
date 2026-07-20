/**
 * Generates the extension PNG icons.
 *
 * Written by hand with zlib + CRC32 so the repo needs no image dependency:
 * a rounded lemon-yellow tile with a dark "DL" glyph, rendered per size.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'icons');
const SIZES = [16, 32, 48, 128];

const BG = [250, 204, 21]; // lemon yellow
const FG = [23, 26, 32]; // near-black glyph

/** 5x7 bitmap font for the two glyphs we need. */
const GLYPHS = {
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
};

function renderPixels(size) {
  const px = (x, y) => (y * size + x) * 3;
  const data = new Uint8Array(size * size * 3);
  const radius = Math.round(size * 0.22);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const colour = insideRoundedSquare(x, y, size, radius) ? BG : [255, 255, 255];
      data.set(colour, px(x, y));
    }
  }

  // Centre "DL" as two 5x7 glyphs with a one-pixel gap, scaled to the tile.
  const scale = Math.max(1, Math.floor(size / 11));
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  const totalW = glyphW * 2 + scale;
  const originX = Math.round((size - totalW) / 2);
  const originY = Math.round((size - glyphH) / 2);

  ['D', 'L'].forEach((letter, index) => {
    const offsetX = originX + index * (glyphW + scale);
    GLYPHS[letter].forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit !== '1') return;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = offsetX + rx * scale + dx;
            const y = originY + ry * scale + dy;
            if (x >= 0 && y >= 0 && x < size && y < size) data.set(FG, px(x, y));
          }
        }
      });
    });
  });

  return data;
}

function insideRoundedSquare(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - 1 - radius);
  const cy = Math.min(Math.max(y, radius), size - 1 - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 || (x === cx && y === cy);
}

/* ------------------------------- PNG writer ------------------------------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, payload) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), payload]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function toPng(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  // Each scanline is prefixed with filter type 0 (None).
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgb.subarray(y * stride, (y + 1) * stride)).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = join(OUT_DIR, `icon${size}.png`);
  writeFileSync(file, toPng(size, renderPixels(size)));
  console.log(`icon${size}.png`);
}
