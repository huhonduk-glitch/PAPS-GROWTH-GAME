// 픽셀 튼튼몬 그림 (72×54 캔버스). 게임 상태는 받기만 하고 고치지 않는다.
// 모양: 둥근 몸 + 큰 눈 + 날개 + 후광 (아기 천사 느낌). 계통마다 색과 장식이 다르다.
// 건강 원칙: 몸무게·체지방으로 체형을 바꾸지 않는다 (키만 ±8%).
import { LINES, stageOf, clamp, formLine } from './game.js';

export const W = 72, H = 54;
const GROUND = 50;
const INK = [44, 40, 60], BG = [185, 201, 160];
const WHITE = [255, 255, 255], CREAM = [255, 246, 228], PINK = [255, 150, 168], MOUTH = [150, 60, 78];
const NIGHT = [36, 44, 92], BLANKET = [120, 170, 228], BLANKET_L = [168, 204, 244];
const GOLD = [255, 210, 80], GOLD_D = [214, 150, 40], WING_S = [214, 226, 244], WING_O = [128, 148, 190];
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

/* ---------- 픽셀 도화지: 채운 모양 둘레에 저절로 테두리 ---------- */
class Layer {
  constructor() { this.p = new Array(W * H).fill(null); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) this.p[y * W + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? this.p[y * W + x] : null; }
  /** 타원 채우기. col 이 함수면 (dx,dy,k) → 색 */
  ell(cx, cy, rx, ry, col) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = x - cx, dy = y - cy, k = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (k <= 1) this.set(x, y, typeof col === 'function' ? col(dx, dy, k) : col);
    }
  }
  outline(c) {
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.set(x, y, c));
    return this;
  }
  onto(dst) { this.p.forEach((c, i) => { if (c) dst.p[i] = c; }); }
}

function palette(line, weak) {
  const L = LINES[line] || LINES.light;
  const b = mix(L.c, [160, 160, 156], weak * 0.7);
  return { b, s: mix(b, INK, 0.2), h: mix(b, WHITE, 0.5), o: mix(b, INK, 0.62), a: L.a };
}
/** 둥근 몸 칠하기: 왼쪽 위가 밝고 아래가 어둡다 */
const shade = (pal, rx, ry, soft) => (dx, dy, k) =>
  dx < -rx * 0.25 && dy < -ry * 0.3 && k < 0.7 ? pal.h : (soft ? k > 0.78 && dy > ry * 0.35 : dy > ry * 0.45 || (k > 0.8 && dy > 0)) ? pal.s : pal.b;

/* ---------- 얼굴 ---------- */
function face(L, cx, ey, gap, size, mood) {
  const { hp, cheer, blink, sleep } = mood;
  const ew = size >= 3 ? 3 : 2, eh = size + 1;
  [-1, 1].forEach(s => {
    const x0 = s < 0 ? cx - gap - ew + 1 : cx + gap; // 눈 왼쪽 끝
    const mid = x0 + (ew - 1) / 2;
    if (sleep) { // 푹 잠든 눈 ‿ (체력 낮을 때 감은 눈 — 일자 — 과 다름)
      L.set(x0, ey + eh - 2, INK); L.set(x0 + ew - 1, ey + eh - 2, INK);
      for (let i = ew === 3 ? 1 : 0; i < (ew === 3 ? 2 : ew); i++) L.set(x0 + i, ey + eh - 1, INK);
    } else if (cheer) { // 웃는 눈 ^^
      L.set(x0, ey + 2, INK); L.set(mid, ey + 1, INK); L.set(x0 + ew - 1, ey + 2, INK);
      if (ew === 3) { L.set(x0 + 0.6, ey + 1, INK); }
    } else if (blink || hp < 25) { // 감은 눈
      for (let i = 0; i < ew; i++) L.set(x0 + i, ey + eh - 1, INK);
    } else if (hp < 50) { // 졸린 눈 (반쯤 감김)
      for (let j = Math.ceil(eh / 2); j < eh; j++) for (let i = 0; i < ew; i++) L.set(x0 + i, ey + j, INK);
      for (let i = -1; i <= ew; i++) L.set(x0 + i, ey + Math.ceil(eh / 2) - 1, mix(INK, WHITE, 0.25));
    } else { // 반짝이는 큰 눈
      for (let j = 0; j < eh; j++) for (let i = 0; i < ew; i++) L.set(x0 + i, ey + j, j === eh - 1 && ew === 3 && i !== 1 ? mix(INK, [110, 120, 230], 0.45) : INK);
      L.set(x0, ey, WHITE);
      if (ew === 3) { L.set(x0 + 1, ey, WHITE); L.set(x0, ey + 1, WHITE); }
    }
    if (hp >= 40 || sleep) { const bx = s < 0 ? x0 - 1 : x0 + ew - 1; L.set(bx, ey + eh, PINK); L.set(bx + 1, ey + eh, PINK); }
  });
  const my = ey + eh;
  if (sleep) L.set(cx, my + 1, MOUTH); // 작은 입 o
  else if (cheer) { L.set(cx - 1, my, MOUTH); L.set(cx, my, MOUTH); L.set(cx + 1, my, MOUTH); L.set(cx, my + 1, PINK); }
  else if (hp >= 50) { L.set(cx - 1, my, MOUTH); L.set(cx, my + 1, MOUTH); L.set(cx + 1, my, MOUTH); }
  else if (hp >= 25) { L.set(cx - 1, my + 1, MOUTH); L.set(cx, my + 1, MOUTH); L.set(cx + 1, my + 1, MOUTH); }
  else { L.set(cx - 1, my + 1, MOUTH); L.set(cx, my, MOUTH); L.set(cx + 1, my + 1, MOUTH); }
}

/* ---------- 날개 · 후광 ---------- */
function wings(L, cx, ay, spread, size, flap, tip) {
  [-1, 1].forEach(s => {
    for (let i = 0; i < 3; i++) {
      const ex = cx + s * (spread + i * size * 0.42), ey = ay - i * size * 0.34 - flap * (i + 1) * 0.6;
      const rx = size * (0.62 - i * 0.1), ry = size * 0.3;
      L.ell(ex, ey, rx, ry, (dx, dy) => (dy > ry * 0.2 ? (i === 2 && tip ? tip : WING_S) : WHITE));
    }
  });
}
function halo(L, cx, y, rx) {
  for (let x = -rx; x <= rx; x++) {
    const t = Math.sqrt(Math.max(0, 1 - (x * x) / (rx * rx)));
    const dy = Math.round(t * rx * 0.28);
    L.set(cx + x, y - dy, Math.abs(x) > rx * 0.6 ? GOLD_D : GOLD);
    L.set(cx + x, y + dy, GOLD_D);
  }
}
function crown(L, cx, y) {
  for (let x = -3; x <= 3; x++) { L.set(cx + x, y, GOLD); L.set(cx + x, y + 1, GOLD_D); }
  [-3, 0, 3].forEach(x => { L.set(cx + x, y - 1, GOLD); L.set(cx + x, y - 2, x === 0 ? [255, 120, 140] : GOLD); });
  L.set(cx - 1, y - 1, GOLD); L.set(cx + 1, y - 1, GOLD);
}
function flower(L, cx, y, petal) {
  [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => L.set(cx + dx, y + dy, petal));
  L.set(cx, y, [255, 214, 80]);
}
function star(L, cx, y, c) {
  [[0, -2], [0, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [0, 1], [-1, 2], [1, 2]].forEach(([dx, dy]) => L.set(cx + dx, y + dy, c));
}

/** 계통 장식. big = 어른 이상 */
function gear(A, line, cx, topY, r, big) {
  if (line === 'wind') {
    const c = big ? [150, 214, 255] : WHITE;
    [[0, 0], [1, -1], [2, -2], [2, -3], [1, -4]].forEach(([dx, dy]) => A.set(cx + dx, topY + dy, c));
    if (big) [[-1, -1], [-2, -2], [-2, -3]].forEach(([dx, dy]) => A.set(cx + dx, topY + dy, c));
  } else if (line === 'rock') {
    if (big) { // 투구 띠
      for (let x = -r + 2; x <= r - 2; x++) A.set(cx + x, topY + 3, [176, 186, 206]);
      A.ell(cx, topY - 1, 2, 2, [176, 186, 206]); A.set(cx, topY - 1, WHITE);
    } else { A.ell(cx, topY - 1, 1.5, 1.5, [168, 174, 190]); }
  } else if (line === 'flower') {
    if (big) [-6, -3, 0, 3, 6].forEach((x, i) => flower(A, cx + x, topY + 2 - (i % 2), i % 2 ? [255, 255, 255] : [255, 130, 170]));
    else { flower(A, cx + 3, topY + 1, [255, 120, 160]); A.set(cx + 1, topY, [110, 190, 100]); }
  } else if (line === 'spark') {
    star(A, cx, topY - 2, big ? [255, 238, 120] : [255, 226, 90]);
  }
}

/* ---------- 단계별 몸 ---------- */
function drawEgg(F, pet, t, preview, still) {
  const pal = palette(pet.line, 0);
  const shake = still ? 0 : pet.xp >= 12 ? 2 : 1;
  const wob = Math.sin(t / (preview ? 420 : 240)) * shake;
  const cx = 36 + Math.round(wob * 0.6), cy = GROUND - 12;
  const E = new Layer();
  E.ell(cx, cy, 9, 11.5, (dx, dy, k) => {
    const band = Math.abs(dy + 1 - (Math.round((dx + 20) / 2) % 2 ? 1 : 0)) < 1.1;
    if (band) return pet.line === 'light' ? GOLD : pal.b;
    if ((pet.line === 'wind' || pet.line === 'flower' || pet.line === 'spark') && ((dx + 9) * 7 + (dy + 12) * 5) % 23 === 0) return pal.b;
    return dx < -3 && dy < -4 && k < 0.6 ? WHITE : dy > 6 || k > 0.82 ? mix(CREAM, pal.s, 0.25) : CREAM;
  });
  E.outline(mix(pal.o, INK, 0.2)).onto(F);
  if (pet.xp >= 12) [[-2, -6], [-1, -5], [0, -6], [1, -5], [2, -6]].forEach(([dx, dy]) => F.set(cx + dx, cy + dy, INK)); // 금
}

function drawBaby(F, pet, t, mood, pal, s) {
  const r = 7 * s, bob = Math.sin(t / 300) * 1.6 * (1 - mood.weak * 0.7) + (mood.cheer ? Math.abs(Math.sin(t / 110)) * 3 : 0);
  const cx = 36, cy = GROUND - r - 5 - bob;
  const flap = Math.sin(t / (mood.cheer ? 70 : 160)) * (1 - mood.weak * 0.8);
  const Wg = new Layer();
  [-1, 1].forEach(si => { // 귀처럼 생긴 작은 날개
    Wg.ell(cx + si * (r + 1), cy - r * 0.45 - flap, 3.4, 2.2, (dx, dy) => (dy > 0.4 ? WING_S : WHITE));
    Wg.ell(cx + si * (r + 3.5), cy - r * 0.75 - flap * 1.4, 2.6, 1.7, WHITE);
  });
  Wg.outline(WING_O).onto(F);
  const B = new Layer();
  B.ell(cx, cy, r + 0.5, r - 0.3, shade(pal, r, r));
  B.outline(pal.o).onto(F);
  face(F, cx, Math.round(cy - 1), 2, 2, mood);
  shadow(F, cx, r);
}

function drawKid(F, pet, t, mood, pal, s) {
  const r = 9 * s, bounce = Math.abs(Math.sin(t / (220 + mood.weak * 400))) * (mood.cheer ? 4 : 1.5) * (1 - mood.weak * 0.8);
  const cx = 36, cy = GROUND - r - 2 - bounce;
  const flap = Math.sin(t / (mood.cheer ? 80 : 200)) * (1 - mood.weak * 0.8);
  const Wg = new Layer();
  wings(Wg, cx, cy - 1, r - 1, 6, flap, null);
  Wg.outline(WING_O).onto(F);
  const B = new Layer();
  [-1, 1].forEach(si => B.ell(cx + si * r * 0.45, GROUND - 1 - bounce * 0.3, 2.4, 1.6, pal.s)); // 발
  B.ell(cx, cy, r + 0.5, r - 0.5, shade(pal, r, r));
  B.ell(cx, cy + r * 0.4, r * 0.55, r * 0.38, CREAM); // 배
  B.outline(pal.o).onto(F);
  const A = new Layer(); gear(A, pet.line, cx, Math.round(cy - r), r, false); A.outline(pal.o).onto(F);
  face(F, cx, Math.round(cy - 1), 3, 2, mood);
  const H0 = new Layer(); halo(H0, cx, Math.round(cy - r - 4 + Math.sin(t / 400)), 4); H0.onto(F);
  shadow(F, cx, r);
}

function drawChibi(F, pet, t, mood, pal, s, st) {
  const line = st >= 4 ? formLine(pet) : pet.line;
  const big = st >= 4;
  const hr = (st === 3 ? 9 : 10) * s, br = (st === 3 ? 5 : 6) * s;
  const bounce = Math.abs(Math.sin(t / (240 + mood.weak * 400))) * (mood.cheer ? 4 : 1.2) * (1 - mood.weak * 0.8);
  const cx = 36, feetY = GROUND - 1 - bounce * 0.3;
  const by = GROUND - br - 2 - bounce, hy = by - br - hr * 0.8;
  const flap = Math.sin(t / (mood.cheer ? 80 : 220)) * (1 - mood.weak * 0.8);
  // 날개
  const Wg = new Layer();
  const tip = line === 'wind' ? [150, 210, 255] : line === 'light' || st === 5 ? [255, 230, 150] : null;
  if (st === 5) wings(Wg, cx, by + 1, br + 1, 6.5, flap * 0.7, tip);
  wings(Wg, cx, by - br + 1, br + 2, st === 3 ? 7 : 9, flap, tip);
  Wg.outline(st === 5 ? GOLD_D : WING_O).onto(F);
  // 몸(천사 옷) · 팔 · 발
  const B = new Layer();
  [-1, 1].forEach(si => B.ell(cx + si * br * 0.55, feetY, 2.2, 1.5, pal.s));
  const armUp = mood.cheer || pet.hp > 85;
  [-1, 1].forEach(si => B.ell(cx + si * (br + 1), by + (armUp ? -br * 0.7 : 0.5), 1.8, 2.6, pal.b));
  const trim = st === 5 || line === 'light' ? GOLD : pal.b;
  B.ell(cx, by, br, br, (dx, dy, k) => (Math.round(dy) === Math.round(br * 0.15) ? trim : dx < -br * 0.3 && dy < 0 ? WHITE : dy > br * 0.4 || k > 0.8 ? mix(CREAM, INK, 0.12) : CREAM));
  B.outline(pal.o).onto(F);
  // 머리 (몸과 테두리로 나뉨)
  const Hd = new Layer();
  Hd.ell(cx, hy, hr + 0.5, hr, shade(pal, hr, hr, true));
  [-1, 1].forEach(si => Hd.ell(cx + si * (hr + 0.5), hy - hr * 0.35, 2, 1.4, WHITE)); // 머리 옆 작은 깃털 — 뽀송몬 때부터
  Hd.outline(pal.o).onto(F);
  // 계통 장식
  const A = new Layer();
  gear(A, line, cx, Math.round(hy - hr), hr, big);
  if (line === 'rock' && big) A.ell(cx + br + 3, by + 1, 3, 3.5, (dx, dy) => (Math.abs(dx) < 1 || Math.abs(dy) < 1 ? GOLD : [170, 182, 204])); // 방패
  if (line === 'flower' && big) for (let i = 0; i < 4; i++) A.set(cx - hr - 1 - (i % 2), hy - 2 + i * 2, [255, 150, 190]); // 리본
  A.outline(pal.o).onto(F);
  face(F, cx, Math.round(hy), 2, 3, mood);
  const H0 = new Layer();
  const hyHalo = Math.round(hy - hr - (line === 'spark' && big ? 7 : 4) + Math.sin(t / 420));
  if (st === 5) crown(H0, cx, Math.round(hy - hr - 1));
  halo(H0, cx, st === 5 ? hyHalo - 3 : hyHalo, line === 'light' && big ? 7 : 5);
  H0.onto(F);
  shadow(F, cx, br + 2);
}

function shadow(F, cx, r) { for (let dx = -r + 1; dx <= r - 1; dx++) if (!F.get(cx + dx, GROUND + 1)) F.set(cx + dx, GROUND + 1, mix(BG, INK, 0.3)); }

/** 예전 소멸(유령) 그림 — 소멸이 잠듦으로 바뀌어 지금은 안 씀. 지우지 말고 둔다 */
function drawGhost(F, pet, t) {
  const y = 24 + Math.sin(t / 600) * 2, cx = 36;
  const G = new Layer();
  G.ell(cx, y, 8, 8, (dx, dy) => (dy > 5 && (Math.round(dx) + Math.floor(t / 200)) % 3 === 0 ? null : mix(BG, WHITE, 0.75)));
  [-1, 1].forEach(s => G.ell(cx + s * 9, y - 2, 2.5, 1.6, mix(BG, WHITE, 0.8)));
  G.outline(mix(BG, INK, 0.35)).onto(F);
  [-3, 3].forEach(dx => { F.set(cx + dx - 1, y - 1, INK); F.set(cx + dx, y - 1, INK); F.set(cx + dx + 1, y - 1, INK); });
  F.set(cx, y + 3, MOUTH);
  halo(F, cx, Math.round(y - 11), 4);
  for (let i = 0; i < 4; i++) { const sy = (t / 60 + i * 11) % 44; F.set(10 + i * 16, GROUND - sy, mix(BG, INK, 0.4)); }
}

/** 잠듦: 위로 떠오르는 Z */
function zzz(L, t) {
  for (let i = 0; i < 3; i++) {
    const ph = (t / 1400 + i / 3) % 1, n = ph < 0.4 ? 4 : 5;
    const x0 = Math.round(46 + ph * 12), y0 = Math.round(24 - ph * 18);
    for (let k = 0; k < n; k++) { L.set(x0 + k, y0, WHITE); L.set(x0 + k, y0 + n - 1, WHITE); }
    for (let k = 1; k < n - 1; k++) L.set(x0 + n - 1 - k, y0 + k, WHITE);
  }
}
/** 기뻐할 때 떠오르는 하트 두 개 */
function hearts(L, t) {
  const HEART = [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]];
  [[14, 0], [52, 0.5]].forEach(([x0, off]) => {
    const ph = (t / 900 + off) % 1, y0 = Math.round(30 - ph * 20);
    HEART.forEach(([dx, dy]) => L.set(x0 + dx, y0 + dy, [255, 96, 128]));
    L.set(x0 + 1, y0 + 1, [255, 190, 205]);
  });
}
/** 휴식권 쓰는 중: 체크무늬 이불 */
function blanket(F, cx, top) {
  const B = new Layer();
  for (let y = top; y <= GROUND; y++) for (let x = cx - 17; x <= cx + 17; x++) {
    if (y === top && Math.abs(x - cx) > 15) continue;
    B.set(x, y, y <= top + 1 ? CREAM : (Math.floor((x - cx + 40) / 4) + Math.floor((y - top) / 4)) % 2 ? BLANKET : BLANKET_L);
  }
  B.outline(mix(BLANKET, INK, 0.55)).onto(F);
}

function sparkles(F, cx, cy, r, t) {
  for (let i = 0; i < 3; i++) {
    const a = t / 500 + i * 2.1, sx = cx + Math.cos(a) * (r + 7), sy = cy + Math.sin(a) * (r * 0.6) - 2;
    if ((t / 150 + i) % 4 < 3) {
      F.set(sx, sy, WHITE);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => F.set(sx + dx, sy + dy, mix(BG, WHITE, 0.5)));
    }
  }
}

/**
 * pet = {line,branch,xp,hp,sleeping,height} · t = 시각(ms) · preview = 만들기 전 미리보기 · cheer = 기뻐하는 중
 * resting = 휴식권 쓰는 중(이불). 잠듦은 밤 화면 + Z 로, 체력 낮은 모습과 헷갈리지 않게 한다.
 */
export function draw(ctx, pet, t, { preview = false, cheer = false, resting = false } = {}) {
  const F = new Layer(), top = new Layer();
  for (let x = 0; x < W; x += 2) F.set(x, GROUND + 1, mix(BG, INK, 0.2)); // 땅
  const st = stageOf(pet.xp);
  const sleep = !preview && !!pet.sleeping;
  resting = resting && !sleep;
  if (st === 0) drawEgg(F, pet, t, preview, sleep || resting);
  else {
    const weak = sleep ? 0.2 : clamp((50 - pet.hp) / 50, 0, 1);
    const still = sleep ? 1 : resting ? Math.max(weak, 0.6) : weak; // 움직임 줄이기 (잠듦 = 숨 쉬는 정도)
    const mood = { hp: pet.hp, cheer: cheer && !sleep, weak: still, sleep, blink: t % 3400 < 140 };
    const pal = palette(st >= 4 ? formLine(pet) : pet.line, weak);
    const s = 0.92 + clamp((pet.height - 150) / 40, 0, 1) * 0.16;
    if (st === 1) drawBaby(F, pet, t, mood, pal, s);
    else if (st === 2) drawKid(F, pet, t, mood, pal, s);
    else drawChibi(F, pet, t, mood, pal, s, st);
    if (!sleep && !resting && weak > 0.4) { const sy = (t / 120) % 6; F.set(48, 20 + sy, [90, 150, 230]); F.set(48, 21 + sy, [90, 150, 230]); }
    if (!sleep && (pet.hp > 85 || st === 5 || cheer)) sparkles(F, 36, 30, 14, t);
  }
  if (resting) blanket(F, 36, GROUND - [7, 4, 5, 9, 9, 9][st]); // 얼굴은 가리지 않게
  if (sleep) zzz(top, t);
  else if (cheer) hearts(F, t);
  const img = ctx.createImageData(W, H);
  F.p.forEach((c, i) => { const col = top.p[i] || (sleep ? mix(c || BG, NIGHT, 0.45) : c || BG); img.data[i * 4] = col[0]; img.data[i * 4 + 1] = col[1]; img.data[i * 4 + 2] = col[2]; img.data[i * 4 + 3] = 255; });
  ctx.putImageData(img, 0, 0);
}
