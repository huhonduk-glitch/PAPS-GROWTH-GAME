// 앱 아이콘(PNG)을 만든다: 주황 바탕 + 픽셀 알. `npm run icons` → public/ 에 저장.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BG = [255, 138, 61], LCD = [185, 201, 160], EGG = [255, 214, 196], EDGE = [120, 52, 30], BAND = [236, 98, 62];
const N = 32; // 32×32 픽셀 그림을 키워서 쓴다

function grid(pad) { // pad = 가장자리 여백(maskable 은 넉넉히)
  const g = Array.from({ length: N }, () => Array(N).fill(BG));
  const r0 = pad, r1 = N - 1 - pad;
  for (let y = r0; y <= r1; y++) for (let x = r0; x <= r1; x++) {
    const cx = (x - r0) / (r1 - r0) * 2 - 1, cy = (y - r0) / (r1 - r0) * 2 - 1;
    if (cx * cx + cy * cy <= 1) g[y][x] = LCD; // 둥근 화면
  }
  const s = (r1 - r0) / 30, ox = N / 2, oy = N / 2 + s;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x + .5 - ox) / s, dy = (y + .5 - oy) / s;
    const k = dx * dx / (81 * (dy < 0 ? .8 : 1)) + dy * dy / 121;
    if (k <= 1) g[y][x] = k > .78 ? EDGE : EGG;
    if (k <= .78 && Math.abs(dy + 1 - (Math.round(dx / 2) % 2 ? 1 : 0)) < .9 && Math.abs(dx) < 7) g[y][x] = BAND;
  }
  return g;
}

function crc32(buf) {
  let c, crc = ~0;
  for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pad) {
  const g = grid(pad), raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const c = g[Math.floor(y * N / size)][Math.floor(x * N / size)];
      raw.set(c, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function svg() {
  const g = grid(2); let rects = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] !== BG) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="rgb(${g[y][x]})"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges"><rect width="${N}" height="${N}" rx="7" fill="rgb(${BG})"/>${rects}</svg>\n`;
}

writeFileSync('public/icon-192.png', png(192, 2));
writeFileSync('public/icon-512.png', png(512, 2));
writeFileSync('public/icon-maskable-512.png', png(512, 6));
writeFileSync('public/apple-touch-icon.png', png(180, 3));
writeFileSync('public/icon.svg', svg());
console.log('아이콘 5개를 public/ 에 만들었어요.');
