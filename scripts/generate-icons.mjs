import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const palette = { forest: [24, 62, 50], light: [229, 237, 192], leaf: [166, 199, 126], cream: [244, 245, 221], gold: [230, 184, 95] };
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function ellipse(x, y, cx, cy, rx, ry, angle) {
  const a = (x - cx) * Math.cos(angle) + (y - cy) * Math.sin(angle);
  const b = -(x - cx) * Math.sin(angle) + (y - cy) * Math.cos(angle);
  return (a / rx) ** 2 + (b / ry) ** 2 <= 1;
}
function colorAt(x, y) {
  if (ellipse(x, y, 365, 351, 12, 12, 0)) return palette.gold;
  if (x >= 246 && x <= 267 && y >= 212 && y <= 369) return palette.cream;
  if (ellipse(x, y, 208, 242, 69, 34, .76)) return palette.leaf;
  if (ellipse(x, y, 303, 186, 75, 38, -.78)) return palette.light;
  return palette.forest;
}
function png(size, filename) {
  const rows = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    rows[row] = 0;
    for (let x = 0; x < size; x++) {
      const samples = [[.25, .25], [.75, .25], [.25, .75], [.75, .75]].map(([dx, dy]) => colorAt((x + dx) / size * 512, (y + dy) / size * 512));
      for (let channel = 0; channel < 3; channel++) rows[row + 1 + x * 3 + channel] = Math.round(samples.reduce((sum, color) => sum + color[channel], 0) / 4);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2;
  const buffer = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
  writeFileSync(fileURLToPath(new URL(`../public/${filename}`, import.meta.url)), buffer);
  console.log(`${filename}: ${size} × ${size}`);
}
png(192, 'icon-192.png');
png(512, 'icon-512.png');
png(512, 'icon-maskable.png');
png(180, 'apple-touch-icon.png');
