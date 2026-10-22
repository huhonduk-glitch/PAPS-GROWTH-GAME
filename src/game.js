// 게임 계산만 모은 파일 (화면·저장과 분리). 숫자를 바꾸면 CLAUDE.md 2장도 같이 고친다.
// 기준: WHO 신체활동 지침(2020, 5~17세) — 하루 평균 60분 중강도 이상, 주 3일 고강도, 주 3일 근력.
import {
  WAKE_UP_HP, EXAM_REST_MAX_DAYS, EXAM_REST_PER_TERM, SICK_REST_PER_MONTH, TERM1_MONTHS,
  QUESTS_PER_DAY, QUEST_COIN, DAILY_ALL_CLEAR_BONUS,
  ANNIVERSARY_DAYS, STREAK_ANNIVERSARY_DAYS, ANNIVERSARY_GIFTS, COMEBACK_DAYS,
} from './config/game.js';
import { QUESTS, QUEST_CATEGORIES } from './config/quests.js';
import { ITEMS } from './config/items.js';
import { DIALOGUES } from './config/dialogues.js';
import { STAGE_LABEL, LINE_TRAIT, DEX_TEXT } from './config/dex.js';

export const SAVE_VERSION = 5;

/* ---------- 단계 · 계통 ---------- */
export const STAGES = [[0, '알'], [20, '아기'], [120, '꼬마'], [400, '청소년'], [900, '어른'], [1600, '챔피언']];
export const STAT_KEYS = ['cardio', 'strength', 'flex', 'power'];
export const STAT_NAMES = { cardio: '심폐', strength: '근력', flex: '유연', power: '순발' };

/** 계통: 처음 PAPS·인바디로 정해지고, 어른이 될 때 그동안 한 운동으로 한 번 더 갈라진다. */
export const LINES = {
  wind: { n: '바람', stat: 'cardio', c: [118, 190, 240], a: [255, 255, 255], desc: '오래 뛰어도 지치지 않는 심폐 계통' },
  rock: { n: '바위', stat: 'strength', c: [246, 160, 92], a: [150, 160, 182], desc: '힘이 센 근력 계통' },
  flower: { n: '꽃', stat: 'flex', c: [246, 158, 190], a: [255, 236, 120], desc: '몸이 부드러운 유연 계통' },
  spark: { n: '별', stat: 'power', c: [252, 206, 84], a: [255, 120, 90], desc: '번개처럼 빠른 순발 계통' },
  light: { n: '빛', stat: null, c: [252, 240, 214], a: [255, 212, 71], desc: '모든 체력이 고른 균형 계통' },
};
const STAT_LINE = { cardio: 'wind', strength: 'rock', flex: 'flower', power: 'spark' };
export const SPECIES = {
  1: '뽀송몬', 2: '깃털몬', 3: '날개몬',
  4: { wind: '하늘몬', rock: '방패몬', flower: '꽃잎몬', spark: '별똥몬', light: '천사몬' },
  5: { wind: '폭풍날개몬', rock: '황금방패몬', flower: '꽃왕관몬', spark: '유성몬', light: '대천사몬' },
};

/* ---------- 운동 ---------- */
// cat: 어느 능력치가 오르는지 (sport = 심폐·순발 반씩)
// m: 함께 적을 수 있는 기록 — km 거리 · steps 걸음 수 · count 횟수 · reps 세트×횟수 · none 없음
export const EX_KINDS = [
  { k: '걷기', cat: 'cardio', m: 'steps' },
  { k: '달리기', cat: 'cardio', m: 'km' },
  { k: '자전거', cat: 'cardio', m: 'km' },
  { k: '수영', cat: 'cardio', m: 'none' },
  { k: '춤', cat: 'cardio', m: 'none' },
  { k: '맨몸 근력', cat: 'strength', m: 'reps', hint: '푸시업·스쿼트·런지·윗몸일으키기' },
  { k: '헬스 기구', cat: 'strength', m: 'reps' },
  { k: '플랭크', cat: 'strength', m: 'none' },
  { k: '스트레칭', cat: 'flex', m: 'none' },
  { k: '요가·필라테스', cat: 'flex', m: 'none' },
  { k: '줄넘기', cat: 'power', m: 'count' },
  { k: '단거리·점프', cat: 'power', m: 'none' },
  { k: '구기 종목', cat: 'sport', m: 'none', hint: '축구·농구·배구·배드민턴·탁구' },
  { k: '기타', cat: 'cardio', m: 'none' },
];
export const CAT_NAMES = { cardio: '심폐', strength: '근력', flex: '유연', power: '순발', sport: '스포츠' };
/** 강도 = 말하기 테스트 */
export const INTENSITY = [
  null,
  { n: '가볍게', talk: '노래를 부를 수 있어요' },
  { n: '적당히', talk: '말은 되지만 노래는 힘들어요' },
  { n: '힘들게', talk: '몇 마디 말하기도 힘들어요' },
];
/** 인증 방법 — 증거가 많을수록 경험치를 더 줌 */
export const PROOFS = {
  self: { n: '내 기록만', bonus: 0 },
  photo: { n: '운동 사진', bonus: 0.2, needPhoto: true },
  device: { n: '앱·워치 기록 화면', bonus: 0.3, needPhoto: true },
};
/** 이 속도를 넘으면 "확인 필요" (기록은 받지만 보너스 없음) */
export const LIMITS = { runKmh: 20, bikeKmh: 35, stepsPerMin: 180, countPerMin: 220, repsPerMin: 40 };

/* ---------- 식단 ---------- */
export const SLOTS = ['아침', '점심', '저녁', '간식'];
export const PLACES = ['집밥', '급식', '외식', '편의점·배달', '기타'];
/** 식품군 5가지 (식품구성자전거의 다섯 바퀴살) */
export const GROUPS = [
  { k: '곡류', ex: '밥·빵·면·떡·감자' },
  { k: '단백질', ex: '고기·생선·달걀·콩·두부' },
  { k: '채소', ex: '나물·김치·샐러드·버섯·해조류' },
  { k: '과일', ex: '사과·귤·바나나 등 생과일' },
  { k: '우유', ex: '우유·요구르트·치즈' },
];
export const GROUP_KEYS = GROUPS.map(g => g.k);
export const DRINKS = ['물', '우유', '주스·탄산', '안 마심'];
/** 급식은 보통 이렇게 나옴 → 고르기 시작값 */
export const SCHOOL_LUNCH = ['곡류', '단백질', '채소'];

export const RULES = {
  exDailyCap: 90,      // 하루 운동 인정 한도(분) — 건강 원칙
  exMinCert: 5,        // 인증 최소 시간(분)
  exMaxInput: 300,
  exGoal: 20,          // 이만큼 안 하면 하루 정산 때 체력 감소
  exGoalPlus: 60,      // WHO 권장 — 채우면 보너스
  goalPlusXp: 5,
  varietyXp: 3,        // 하루에 두 갈래 이상(각 10분 이상)
  varietyMin: 10,
  warmXp: 1,           // 준비·정리 운동
  measureBonus: 0.1,   // 거리·걸음·횟수를 적으면
  missPenalty: 18,
  noMealPenalty: 12,
  balancedMin: 3,      // 균형식 = 식품군 3가지 이상
  greatMin: 4,         // 아주 좋은 한 끼 = 4가지 이상
  mealXp: { great: 8, bal: 6, plain: 2 },
  mealHp: { great: 3, bal: 3, plain: 1 },
  breakfastXp: 2,      // 아침을 먹으면
  drinkXp: 1,          // 물·우유
  photoXp: 1,          // 오늘 찍은 식단 사진
  rainbowXp: 5,        // 하루에 식품군 5가지 모두
  balancedBonus: 2,    // 하루 정산 때 균형 잡힌 끼니마다 (간식 빼고)
  balancedBonusMax: 3,
  weekly: { hard: 3, strength: 3, flex: 2, xp: 10, dayMin: 10 }, // 주간 미션
  branchMin: 120,      // 어른 갈래를 운동으로 정하려면 이만큼(분) 운동
  branchShare: 0.4,    // 한 갈래가 이 비율 이상이면 그 계통
  balanceSpread: 16,   // 능력치 가장 높은 것 - 낮은 것 ≤ 이 값이면 빛 계통
  startHp: 70,
  statMax: 150,
};

/* ---------- 작은 도구 ---------- */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = n => String(n).padStart(2, '0');
export const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDay = (k, n) => { const x = parse(k); x.setDate(x.getDate() + n); return keyOf(x); };
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
/** 날짜가 든 주의 월요일 */
export function weekId(k) { const x = parse(k); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return keyOf(x); }
export const isSunday = k => parse(k).getDay() === 0;
/** 실제 오늘 + 체험용으로 넘긴 날 수 */
export function todayKey(offset = 0, now = new Date()) { const d = new Date(now); d.setDate(d.getDate() + offset); return keyOf(d); }
/** 'HH:MM' → 자정부터 몇 분 */
export function toMin(hm) { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] : null; }
export const fromMin = n => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

export const stageOf = xp => { let i = 0; STAGES.forEach((s, k) => { if (xp >= s[0]) i = k; }); return i; };
export const kindOf = name => EX_KINDS.find(x => x.k === name) || EX_KINDS[EX_KINDS.length - 1];
export const exMinutes = L => (L ? L.ex.reduce((a, e) => a + e.min, 0) : 0);
export const cappedMinutes = L => Math.min(RULES.exDailyCap, exMinutes(L));
export const mealTier = n => (n >= RULES.greatMin ? 'great' : n >= RULES.balancedMin ? 'bal' : 'plain');
export const isBalanced = meal => (meal.groups || []).length >= RULES.balancedMin;
export const balancedCount = L => (L ? L.meals.filter(isBalanced).length : 0);
/** 하루 정산에 쓰는 균형식 끼니 (간식 빼고) */
const mainBalanced = L => L.meals.filter(m => m.slot !== '간식' && isBalanced(m)).length;
export const dayGroups = L => new Set(L ? L.meals.flatMap(m => m.groups || []) : []);
export const emptyDay = () => ({ ex: [], meals: [], bonus: {} });
export function dayLog(S, k) { const L = S.logs[k] || (S.logs[k] = emptyDay()); L.bonus = L.bonus || {}; return L; }

/* ---------- 캐릭터 만들기 ---------- */
export const gradeToStat = gr => (6 - gr) * 16 + 10; // 1등급 90 · 5등급 26

/** 근육 비율(골격근량÷몸무게). 둘 다 있어야 계산. 체형에는 쓰지 않는다 */
export const muscleRatio = (weight, muscle) => (weight > 0 && muscle > 0 ? muscle / weight : null);

/** 폼 값 → 능력치. f = {cardio,strength,flex,power: PAPS 등급 1~5, height, weight?, muscle?} */
export function statsFromInputs(f) {
  let str = gradeToStat(f.strength);
  const r = muscleRatio(f.weight, f.muscle);
  if (r !== null) str = Math.round((str + clamp((r - 0.30) / 0.18, 0, 1) * 80 + 10) / 2);
  return {
    cardio: gradeToStat(f.cardio), strength: str, flex: gradeToStat(f.flex), power: gradeToStat(f.power),
    height: f.height > 0 ? f.height : 165, muscleRatio: r,
  };
}

/** 가장 높은 능력치로 계통. 고르면(차이 ≤ 16, 또는 1등이 둘 이상) 빛 계통 */
export function lineFromStats(st) {
  const v = STAT_KEYS.map(k => st[k]);
  const max = Math.max(...v), min = Math.min(...v);
  if (max - min <= RULES.balanceSpread) return 'light';
  const tops = STAT_KEYS.filter(k => st[k] === max);
  return tops.length > 1 ? 'light' : STAT_LINE[tops[0]];
}

/** 어른이 될 때 갈래: 운동한 분이 충분하고 한 갈래가 40% 이상이면 그 계통, 고르게 했으면 빛, 적으면 처음 계통 */
export function branchFromTraining(train, line) {
  const total = STAT_KEYS.reduce((a, k) => a + (train[k] || 0), 0);
  if (total < RULES.branchMin) return line;
  const top = STAT_KEYS.reduce((a, k) => ((train[k] || 0) > (train[a] || 0) ? k : a), STAT_KEYS[0]);
  return train[top] / total >= RULES.branchShare ? STAT_LINE[top] : 'light';
}
export const formLine = pet => pet.branch || pet.line;
export function speciesName(pet) {
  const st = stageOf(pet.xp);
  if (st === 0) return `${LINES[pet.line].n} 알`;
  const s = SPECIES[st];
  return typeof s === 'string' ? s : s[formLine(pet)];
}

const pickStats = st => ({ cardio: st.cardio, strength: st.strength, flex: st.flex, power: st.power });
export function newPet(name, st, today) {
  return {
    name: (name || '').trim().slice(0, 8) || '튼튼이', line: lineFromStats(st), branch: null, height: st.height,
    stats: pickStats(st), base: pickStats(st), train: { cardio: 0, strength: 0, flex: 0, power: 0 },
    hp: RULES.startHp, xp: 0, sleeping: false, born: today,
  };
}
const emptyPasses = () => ({ exam: [], sick: [] });
export function newState(pet, today, offset = 0) {
  return {
    v: SAVE_VERSION, offset, logs: {}, rest: {}, weeks: {}, passes: emptyPasses(), coins: 0,
    dex: dexKeysOf(pet), items: emptyItems(), anniv: {}, lastOpen: today, lastEval: today, pet,
  };
}

/** PAPS·인바디를 다시 쟀을 때: 새 기준값 + 그동안 운동으로 오른 만큼. 계통은 그대로 */
export function remeasure(S, f) {
  const st = statsFromInputs(f), p = S.pet;
  STAT_KEYS.forEach(k => { p.stats[k] = clamp(st[k] + (p.stats[k] - p.base[k]), 0, RULES.statMax); p.base[k] = st[k]; });
  p.height = st.height;
  return { line: lineFromStats(st) };
}

/** 경험치 더하기. 어른이 되는 순간 갈래를 정한다. 단계가 오르면 true */
function addXp(S, n) {
  const st0 = stageOf(S.pet.xp);
  S.pet.xp += n;
  const st1 = stageOf(S.pet.xp);
  if (st1 >= 4 && !S.pet.branch) S.pet.branch = branchFromTraining(S.pet.train, S.pet.line);
  recordDex(S);
  return st1 > st0;
}

/* ---------- 잠듦 · 휴식권 ---------- */
/** 잠든 튼튼몬을 깨운다. 깨웠으면 true (체력은 WAKE_UP_HP 부터) */
function wake(S) {
  if (!S.pet.sleeping) return false;
  S.pet.sleeping = false;
  S.pet.hp = Math.max(S.pet.hp, WAKE_UP_HP);
  return true;
}
const passesOf = S => S.passes || (S.passes = emptyPasses());
/** 학기: 3~8월 'YYYY-1', 9월~다음 해 2월 'YYYY-2' (1·2월은 앞 해) */
export function termOf(k) {
  const [y, m] = k.split('-').map(Number);
  if (m >= TERM1_MONTHS[0] && m <= TERM1_MONTHS[1]) return `${y}-1`;
  return m > TERM1_MONTHS[1] ? `${y}-2` : `${y - 1}-2`;
}
/** 그날 쓴 휴식권: 'exam' | 'sick' | null */
export function restPassOn(S, k) {
  const P = passesOf(S);
  if (P.sick.includes(k)) return 'sick';
  if (P.exam.some(x => x.start <= k && k <= x.end)) return 'exam';
  return null;
}
/** 남은 휴식권 (그날이 든 달·학기 기준) */
export function passesLeft(S, day) {
  const P = passesOf(S);
  return {
    sick: SICK_REST_PER_MONTH - P.sick.filter(d => d.slice(0, 7) === day.slice(0, 7)).length,
    exam: EXAM_REST_PER_TERM - P.exam.filter(x => termOf(x.start) === termOf(day)).length,
  };
}
/** 아픈 날 휴식권: 오늘 하루 체력이 줄지 않음. 사유는 받지 않는다 */
export function useSickPass(S, today) {
  if (S.pet.sleeping) return { ok: false, reason: 'sleeping' };
  if (restPassOn(S, today)) return { ok: false, reason: 'already' };
  if (passesLeft(S, today).sick <= 0) return { ok: false, reason: 'none' };
  passesOf(S).sick.push(today);
  return { ok: true };
}
/** 시험기간 휴식권: start 부터 days 일 동안 체력이 줄지 않음. 시작일은 오늘이나 그 뒤, 학기는 시작일 기준 */
export function useExamPass(S, today, start, days) {
  days = Math.trunc(days);
  if (S.pet.sleeping) return { ok: false, reason: 'sleeping' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || start < today) return { ok: false, reason: 'start' };
  if (!(days >= 1 && days <= EXAM_REST_MAX_DAYS)) return { ok: false, reason: 'days' };
  const P = passesOf(S), end = addDay(start, days - 1);
  if (passesLeft(S, start).exam <= 0) return { ok: false, reason: 'none' };
  if (P.exam.some(x => start <= x.end && x.start <= end)) return { ok: false, reason: 'overlap' };
  P.exam.push({ start, end });
  return { ok: true, end };
}
/** 시험기간 휴식권 취소: 시작일 전(오늘보다 뒤)이면 지우고 횟수를 돌려준다 */
export function cancelExamPass(S, today, start) {
  const P = passesOf(S), i = P.exam.findIndex(x => x.start === start);
  if (i < 0) return { ok: false, reason: 'missing' };
  if (start <= today) return { ok: false, reason: 'started' };
  P.exam.splice(i, 1);
  return { ok: true };
}

/* ---------- 오늘의 퀘스트 · 코인 (경험치·체력·진화와 따로) ---------- */
/** 글자로 정해지는 난수 — 같은 날·같은 튼튼몬이면 늘 같은 순서 */
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export const questOf = id => QUESTS.find(q => q.id === id) || null;
export const questCoin = q => q.coin ?? QUEST_COIN[q.verify] ?? 0;
/** 퀘스트 뽑기: 갈래(운동·식단·생활)마다 하나씩, 모자라면 남은 것에서 */
export function pickQuests(day, salt = '', pool = QUESTS, n = QUESTS_PER_DAY) {
  const rnd = seeded(`${day}|${salt}`), left = [...pool], out = [];
  const take = list => { const q = list[Math.floor(rnd() * list.length)]; out.push(q.id); left.splice(left.indexOf(q), 1); };
  Object.keys(QUEST_CATEGORIES).forEach(c => { const list = left.filter(q => q.category === c); if (out.length < n && list.length) take(list); });
  while (out.length < n && left.length) take(left);
  return out;
}
/** 오늘의 퀘스트. 처음 열 때 뽑아 저장 → 같은 날은 다시 열어도 같은 3개 */
export function todayQuests(S, today) {
  const L = dayLog(S, today);
  if (!L.quests) L.quests = { ids: pickQuests(today, `${S.pet.born}|${S.pet.name}`), done: {}, allClear: false };
  return L.quests;
}
/**
 * 퀘스트 끝내기. verify = 'tap' | 'photo' (퀘스트에 정해진 방식만). 사진은 저장하지 않고 끝낸 시각만 남긴다.
 * 코인만 준다 — 경험치·체력·진화·랭킹에는 넣지 않는다. 결과 {ok, reason?, coin, bonus, allClear}
 */
export function completeQuest(S, today, id, verify, at = Date.now()) {
  const Q = todayQuests(S, today), q = questOf(id);
  if (!q || !Q.ids.includes(id)) return { ok: false, reason: 'unknown' };
  if (Q.done[id]) return { ok: false, reason: 'done' };
  if (verify !== q.verify) return { ok: false, reason: 'verify' };
  const coin = questCoin(q);
  Q.done[id] = { verify, at };
  let bonus = 0;
  if (!Q.allClear && Q.ids.every(x => Q.done[x] || !questOf(x))) { Q.allClear = true; bonus = DAILY_ALL_CLEAR_BONUS; }
  S.coins = (S.coins || 0) + coin + bonus;
  return { ok: true, coin, bonus, allClear: bonus > 0 };
}
/**
 * 화면에 보여주는 연속 기록 (하나로 합침): 그날 퀘스트 1개 이상 했거나, 운동(또는 휴식일)+끼니 인증을 했으면 그날은 이어짐.
 * 주 1회 휴식일·휴식권 날은 끊지 않고 건너뜀 (+ 오늘 이미 했으면 1).
 * 확실한 인증만 세는 streak() 는 따로 남겨 둔다 (Phase 5 노력 랭킹용 — 자기 체크는 랭킹에 넣지 않음).
 */
export function dayStreak(S, today) {
  const quest = L => !!(L && L.quests && Object.keys(L.quests.done).length);
  const did = L => quest(L) || !!(L && L.meals.length > 0 && (L.status === 'ex' || L.status === 'rest'));
  let n = 0;
  for (let d = addDay(today, -1); ; d = addDay(d, -1)) {
    const L = S.logs[d];
    if (did(L)) n++;
    else if (!(L && (L.status === 'rest' || L.status === 'pass' || restPassOn(S, d)))) break;
  }
  const T = S.logs[today];
  return n + (quest(T) || (T && T.meals.length > 0 && cappedMinutes(T) >= RULES.exGoal) ? 1 : 0);
}

/* ---------- 도감 ---------- */
export const dexKey = (st, line) => `${st}-${line}`;
/** 도감 칸 전부: 단계 × 계통 (page 로 나눠 두어 나중에 합체 진화 혼합종 쪽을 더할 수 있음) */
export function dexEntries() {
  return STAGES.flatMap((s, st) => Object.keys(LINES).map(line => ({
    key: dexKey(st, line), page: 'solo', st, line, name: speciesName({ line, branch: line, xp: s[0] }),
    desc: DEX_TEXT[dexKey(st, line)] || `${LINES[line].n} 계통 ${STAGE_LABEL[st]} — ${LINE_TRAIT[line]}`,
  })));
}
/** 이 튼튼몬이 거쳐 온 모습 (알 ~ 지금 단계). 어른부터는 갈래 계통 */
export function dexKeysOf(pet) {
  const out = [];
  for (let i = 0; i <= stageOf(pet.xp); i++) out.push(dexKey(i, i >= 4 ? formLine(pet) : pet.line));
  return out;
}
/** 새로 만난 모습을 도감에 적는다. 새로 적은 칸을 돌려줌 */
export function recordDex(S) {
  S.dex = S.dex || [];
  const added = dexKeysOf(S.pet).filter(k => !S.dex.includes(k));
  S.dex.push(...added);
  return added;
}

/* ---------- 꾸미기 (코인으로 사고, 체형은 바꾸지 않음) ---------- */
const emptyItems = () => ({ owned: [], wear: {} });
const invOf = S => S.items || (S.items = emptyItems());
export const itemOf = id => ITEMS.find(x => x.id === id) || null;
/** 사기. 결과 {ok, reason?: 'unknown'|'limited'|'owned'|'coins'} */
export function buyItem(S, id) {
  const it = itemOf(id), I = invOf(S);
  if (!it) return { ok: false, reason: 'unknown' };
  if (it.limited || !(it.price >= 0)) return { ok: false, reason: 'limited' };
  if (I.owned.includes(id)) return { ok: false, reason: 'owned' };
  if ((S.coins || 0) < it.price) return { ok: false, reason: 'coins' };
  S.coins -= it.price;
  I.owned.push(id);
  return { ok: true };
}
/** 선물로 받기 (기념일). 새로 받았으면 true */
export function grantItem(S, id) {
  const I = invOf(S);
  if (!itemOf(id) || I.owned.includes(id)) return false;
  I.owned.push(id);
  return true;
}
/** 쓰기 (갈래마다 하나) · 벗기 */
export function wearItem(S, id) {
  const it = itemOf(id), I = invOf(S);
  if (!it || !I.owned.includes(id)) return false;
  I.wear[it.category] = id;
  return true;
}
export function takeOff(S, category) { delete invOf(S).wear[category]; }
/** 그림에 넘길 꾸미기 {hat, prop: 이모지, bg, outfit: 색} */
export function wearLook(S) {
  const w = (S && S.items && S.items.wear) || {}, g = c => itemOf(w[c]);
  return { hat: g('hat') && g('hat').icon, prop: g('prop') && g('prop').icon, bg: g('bg') && g('bg').color, outfit: g('outfit') && g('outfit').color };
}

/* ---------- 기념일 ---------- */
/** DAY 숫자 (알 받은 날 = 1일) */
export const dayNumber = (S, today) => daysBetween(S.pet.born, today) + 1;
/** 아직 축하 안 한 기념일 (지나간 것도 늦게라도 챙김) */
export function pendingAnniversaries(S, today) {
  const done = S.anniv || {}, day = dayNumber(S, today), st = dayStreak(S, today), out = [];
  ANNIVERSARY_DAYS.forEach(n => { if (day >= n && !done[`day${n}`]) out.push({ id: `day${n}`, type: 'day', n, item: ANNIVERSARY_GIFTS.day[n] || null }); });
  STREAK_ANNIVERSARY_DAYS.forEach(n => { if (st >= n && !done[`streak${n}`]) out.push({ id: `streak${n}`, type: 'streak', n, item: ANNIVERSARY_GIFTS.streak[n] || null }); });
  return out;
}
/** 축하하고 한정 꾸미기를 준다. 처음이면 true */
export function celebrate(S, today, a) {
  S.anniv = S.anniv || {};
  if (S.anniv[a.id]) return false;
  S.anniv[a.id] = today;
  if (a.item) grantItem(S, a.item);
  return true;
}

/* ---------- 감정 표현 (대사) ---------- */
/** 날짜로 정해지는 난수 — 하루 동안 같은 대사를 보여줄 때 */
export const dayRnd = day => seeded(day);
/** 상황에 맞는 대사 하나 {text, face} (여러 줄 중 무작위) */
export function pickLine(key, rnd = Math.random) {
  const D = DIALOGUES[key];
  if (!D || !D.lines.length) return null;
  return { text: D.lines[Math.floor(rnd() * D.lines.length)], face: D.face || 'normal' };
}
/** 앱을 열 때 인사 상황: 'comeback'(오래 안 옴) | 'morning' | 'hello' | null(오늘 이미 옴). 마지막 접속일을 적는다 */
export function greeting(S, today, hour) {
  const last = S.lastOpen;
  S.lastOpen = today;
  if (last === today) return null;
  if (last && daysBetween(last, today) >= COMEBACK_DAYS) return 'comeback';
  return hour >= 5 && hour < 11 ? 'morning' : 'hello';
}

/* ---------- 하루 정산 ---------- */
/** 한 주(월~일) 미션 세기 */
export function weekCounts(S, monday) {
  let hard = 0, strength = 0, flex = 0, minutes = 0, rainbow = 0;
  for (let i = 0; i < 7; i++) {
    const L = S.logs[addDay(monday, i)];
    if (!L) continue;
    const by = c => L.ex.filter(e => e.cat === c).reduce((a, e) => a + e.min, 0);
    if (L.ex.some(e => e.int === 3 && e.min >= RULES.weekly.dayMin)) hard++;
    if (by('strength') >= RULES.weekly.dayMin) strength++;
    if (by('flex') >= RULES.weekly.dayMin) flex++;
    minutes += cappedMinutes(L);
    if (dayGroups(L).size === GROUP_KEYS.length) rainbow++;
  }
  return { hard, strength, flex, minutes, rainbow };
}
export function weekMissions(c) {
  const W = RULES.weekly;
  return [
    { k: 'hard', n: '힘들게 운동한 날', have: c.hard, need: W.hard },
    { k: 'strength', n: '근력 운동한 날', have: c.strength, need: W.strength },
    { k: 'flex', n: '유연성 운동한 날', have: c.flex, need: W.flex },
  ];
}

/**
 * lastEval 부터 어제까지 하루씩 정산. S 를 고치고, 메모를 돌려준다.
 * 체력이 0이 되면 잠든다(경험치·단계는 그대로). 잠든 날은 체력이 더 줄지 않는다.
 * 휴식권을 쓴 날은 체력이 줄지 않는다(느는 건 그대로).
 */
export function evaluate(S, today) {
  if (!S) return [];
  S.weeks = S.weeks || {};
  const notes = [];
  while (S.lastEval < today) {
    const d = S.lastEval;
    const L = S.logs[d] || emptyDay();
    const pass = restPassOn(S, d);
    let delta = 0;
    if (S.pet.sleeping) L.status = 'sleep';
    else {
      if (cappedMinutes(L) >= RULES.exGoal) L.status = 'ex';
      else if (pass) L.status = 'pass';
      else {
        const w = weekId(d);
        if (!S.rest[w]) { S.rest[w] = d; L.status = 'rest'; } else { L.status = 'miss'; delta -= RULES.missPenalty; }
      }
      if (L.meals.length === 0) delta -= RULES.noMealPenalty;
      else delta += Math.min(mainBalanced(L), RULES.balancedBonusMax) * RULES.balancedBonus;
      if (pass) delta = Math.max(delta, 0);
    }
    S.logs[d] = L;
    S.pet.hp = clamp(S.pet.hp + delta, 0, 100);
    if (delta < 0) notes.push(`${d.slice(5)} 체력 ${delta}`);
    if (S.pet.hp <= 0 && !S.pet.sleeping) { S.pet.sleeping = true; notes.push('튼튼몬이 잠들었어요'); }
    if (isSunday(d)) {
      const w = weekId(d), c = weekCounts(S, w);
      const done = weekMissions(c).filter(m => m.have >= m.need).map(m => m.k);
      const xp = done.length * RULES.weekly.xp;
      S.weeks[w] = { ...c, done, xp };
      if (xp) { addXp(S, xp); notes.push(`주간 미션 ${done.length}개 +${xp}`); }
    }
    S.lastEval = addDay(d, 1);
  }
  return notes;
}

/* ---------- 운동 인증 ---------- */
/** 기록한 숫자가 그 시간에 가능한지. 이상하면 이유 글자, 괜찮으면 null */
export function checkPlausible(kind, min, amount = {}) {
  const k = kindOf(kind);
  if (k.m === 'km' && amount.km > 0) {
    const kmh = amount.km / (min / 60), lim = k.k === '자전거' ? LIMITS.bikeKmh : LIMITS.runKmh;
    if (kmh > lim) return `시속 ${kmh.toFixed(1)}km — ${k.k}로는 너무 빨라요`;
  }
  if (k.m === 'steps' && amount.steps > 0 && amount.steps / min > LIMITS.stepsPerMin) return `1분에 ${Math.round(amount.steps / min)}걸음은 너무 많아요`;
  if (k.m === 'count' && amount.count > 0 && amount.count / min > LIMITS.countPerMin) return `1분에 ${Math.round(amount.count / min)}번은 너무 많아요`;
  if (k.m === 'reps' && amount.sets > 0 && amount.reps > 0 && amount.sets * amount.reps / min > LIMITS.repsPerMin) return `1분에 ${Math.round(amount.sets * amount.reps / min)}회는 너무 많아요`;
  return null;
}
const hasAmount = (k, a = {}) => (k.m === 'km' && a.km > 0) || (k.m === 'steps' && a.steps > 0) || (k.m === 'count' && a.count > 0) || (k.m === 'reps' && a.sets > 0 && a.reps > 0);

/**
 * 운동 인증.
 * e = {kind, min, int(1~3), start:'HH:MM', amount:{km|steps|count|sets,reps}, warm, proof:'self'|'photo'|'device', photo, photoOk}
 * nowMin = 지금 시각(자정부터 분). 주면 끝나는 시각이 지금보다 늦은 기록을 막는다.
 * 결과 {ok, reason?, counted, gain, parts[], flag, grew}
 */
export function certExercise(S, today, e, nowMin = null) {
  const min = clamp(Math.trunc(e.min) || 0, 0, RULES.exMaxInput);
  if (min < RULES.exMinCert) return { ok: false, reason: 'short' };
  const int = clamp(Math.trunc(e.int) || 2, 1, 3);
  const proof = PROOFS[e.proof] ? e.proof : 'self';
  if (PROOFS[proof].needPhoto && !e.photo) return { ok: false, reason: 'photo' };
  const start = toMin(e.start);
  const L = dayLog(S, today);
  if (start !== null) {
    if (start + min > 24 * 60) return { ok: false, reason: 'late' };
    if (nowMin !== null && start + min > nowMin + 5) return { ok: false, reason: 'future' };
    const clash = L.ex.some(x => { const s = toMin(x.start); return s !== null && start < s + x.min && s < start + min; });
    if (clash) return { ok: false, reason: 'overlap' };
  }
  const k = kindOf(e.kind);
  const amount = e.amount || {};
  const flag = checkPlausible(k.k, min, amount);
  const before = cappedMinutes(L);
  const counted = Math.min(RULES.exDailyCap, before + min) - before;

  const parts = [];
  const base = counted / 10 * (2 + int);
  let mult = 1;
  if (!flag) {
    if (hasAmount(k, amount)) { mult += RULES.measureBonus; parts.push('기록'); }
    if (PROOFS[proof].bonus && e.photoOk) { mult += PROOFS[proof].bonus; parts.push(PROOFS[proof].n); }
  }
  let gain = Math.round(base * mult);
  if (e.warm && counted > 0 && !flag) { gain += RULES.warmXp; parts.push('준비·정리 운동'); }

  L.ex.push({
    kind: k.k, cat: k.cat, min, int, start: start === null ? null : fromMin(start), amount, warm: !!e.warm,
    proof, photo: e.photo || null, photoOk: !!e.photoOk, flag, xp: 0, at: e.at || Date.now(),
  });
  const entry = L.ex[L.ex.length - 1];

  // 하루 한 번 보너스
  if (!L.bonus.goalPlus && cappedMinutes(L) >= RULES.exGoalPlus) { L.bonus.goalPlus = true; gain += RULES.goalPlusXp; parts.push(`하루 ${RULES.exGoalPlus}분`); }
  const cats = new Set(Object.entries(L.ex.reduce((a, x) => ((a[x.cat] = (a[x.cat] || 0) + x.min), a), {}))
    .filter(([, m]) => m >= RULES.varietyMin).map(([c]) => c));
  if (!L.bonus.variety && cats.size >= 2) { L.bonus.variety = true; gain += RULES.varietyXp; parts.push('여러 갈래 운동'); }

  entry.xp = gain;
  const woke = wake(S); // 운동 인증 1번이면 깨어남 (시간 무관)
  const p = S.pet;
  p.hp = clamp(p.hp + Math.round(counted / 6), 0, 100);
  p.train = p.train || { cardio: 0, strength: 0, flex: 0, power: 0 };
  const split = k.cat === 'sport' ? [['cardio', 0.5], ['power', 0.5]] : [[k.cat, 1]];
  split.forEach(([s, w]) => {
    p.stats[s] = clamp(p.stats[s] + Math.round(counted / 10 * w), 0, RULES.statMax);
    p.train[s] += counted * w;
  });
  const grew = addXp(S, gain);
  return { ok: true, min, counted, gain, parts, flag, grew, woke };
}

/* ---------- 식단 인증 ---------- */
/**
 * 식단 인증. 끼니마다 하루 1번.
 * m = {slot, place, groups[], drink, photo, photoOk}
 * 결과 {ok, reason?, n, tier, gain, parts[], rainbow, grew}
 */
export function certMeal(S, today, m) {
  const L = dayLog(S, today);
  if (!SLOTS.includes(m.slot)) return { ok: false, reason: 'slot' };
  if (L.meals.some(x => x.slot === m.slot)) return { ok: false, reason: 'dup' };
  const groups = new Set([...(m.groups || [])].filter(g => GROUP_KEYS.includes(g)));
  if (m.drink === '우유') groups.add('우유');
  const list = GROUP_KEYS.filter(g => groups.has(g));
  const tier = mealTier(list.length);
  const parts = [];
  let gain = RULES.mealXp[tier];
  if (m.slot === '아침') { gain += RULES.breakfastXp; parts.push('아침 챙김'); }
  if (m.drink === '물' || m.drink === '우유') { gain += RULES.drinkXp; parts.push(`${m.drink} 마심`); }
  if (m.photo && m.photoOk) { gain += RULES.photoXp; parts.push('사진'); }
  const had = dayGroups(L).size;
  L.meals.push({
    slot: m.slot, place: PLACES.includes(m.place) ? m.place : '기타', groups: list,
    drink: DRINKS.includes(m.drink) ? m.drink : '안 마심', photo: m.photo || null, photoOk: !!m.photoOk, xp: 0, at: m.at || Date.now(),
  });
  let rainbow = false;
  if (!L.bonus.rainbow && had < GROUP_KEYS.length && dayGroups(L).size === GROUP_KEYS.length) {
    L.bonus.rainbow = true; rainbow = true; gain += RULES.rainbowXp; parts.push('무지개 식단');
  }
  L.meals[L.meals.length - 1].xp = gain;
  const woke = m.slot !== '간식' && wake(S); // 간식 뺀 끼니면 식품군 수와 상관없이 깨어남
  S.pet.hp = clamp(S.pet.hp + RULES.mealHp[tier], 0, 100);
  const grew = addXp(S, gain);
  return { ok: true, n: list.length, tier, gain, parts, rainbow, grew, woke };
}

/**
 * 연속 기록: 어제부터 거꾸로, 운동(또는 휴식일)과 끼니 인증이 둘 다 있는 날 수 (+ 오늘 이미 채웠으면 1).
 * 휴식권을 쓴 날은 세지도 끊지도 않고 건너뛴다.
 */
export function streak(S, today) {
  const good = L => L && L.meals.length > 0 && (L.status === 'ex' || L.status === 'rest');
  let n = 0;
  for (let d = addDay(today, -1); ; d = addDay(d, -1)) {
    const L = S.logs[d];
    if (good(L)) n++;
    else if (!(L && L.status === 'pass')) break;
  }
  const T = S.logs[today];
  if (T && T.meals.length > 0 && cappedMinutes(T) >= RULES.exGoal) n++;
  return n;
}

/* ---------- 예전 저장 옮기기 (v1 → v2 → v3 → v4 → v5) ---------- */
const V1_STAGES = [0, 15, 60, 140, 260, 420];
/** 예전 경험치 → 새 경험치 (같은 단계, 같은 비율 위치) */
export function migrateXp(xp) {
  const T = STAGES.map(s => s[0]);
  let i = 0; V1_STAGES.forEach((t, k) => { if (xp >= t) i = k; });
  if (i === V1_STAGES.length - 1) return T[i] + (xp - V1_STAGES[i]) * ((T[i] - T[i - 1]) / (V1_STAGES[i] - V1_STAGES[i - 1]));
  return Math.round(T[i] + (xp - V1_STAGES[i]) / (V1_STAGES[i + 1] - V1_STAGES[i]) * (T[i + 1] - T[i]));
}
const V1_KIND = { '근력 운동': '맨몸 근력', '요가·스트레칭': '스트레칭' };
const V1_GROUP = { '채소·과일': '채소', '단백질': '단백질', '밥·빵·면': '곡류', '우유·유제품': '우유' };
export function migrate(v) {
  if (!v || !v.pet) return null;
  if (v.v === 1) v = migrateV1(v);
  if (v.v === 2) v = migrateV2(v);
  if (v.v === 3) v = { ...v, v: 4, coins: v.coins || 0 }; // v3 → v4: 코인 칸 추가
  if (v.v === 4) v = { ...v, v: 5, dex: v.pet.line ? dexKeysOf(v.pet) : [], items: emptyItems(), anniv: {}, lastOpen: null }; // v4 → v5: 도감·꾸미기·기념일
  return v.v === SAVE_VERSION ? v : null;
}
/** v2 → v3: 소멸(alive:false)은 잠듦으로. 휴식권 칸 추가 */
function migrateV2(v) {
  const { alive, diedOn, ...pet } = v.pet;
  pet.sleeping = alive === false;
  if (pet.sleeping) pet.hp = 0;
  return { ...v, v: 3, passes: emptyPasses(), pet };
}
function migrateV1(v) {
  const p = v.pet;
  const stats = { ...p.stats };
  const pet = {
    name: p.name, line: lineFromStats(stats), branch: null, height: p.height, stats, base: { ...stats },
    train: { cardio: 0, strength: 0, flex: 0, power: 0 }, hp: p.hp, xp: Math.round(migrateXp(p.xp)), alive: p.alive, born: p.born,
  };
  if (p.diedOn) pet.diedOn = p.diedOn;
  const logs = {};
  Object.entries(v.logs || {}).forEach(([d, L]) => {
    logs[d] = {
      status: L.status, bonus: {},
      ex: (L.ex || []).map(e => { const k = kindOf(V1_KIND[e.kind] || e.kind); return { kind: k.k, cat: k.cat, min: e.min, int: e.int, start: null, amount: {}, warm: false, proof: e.photo ? 'photo' : 'self', photo: e.photo || null, photoOk: false, flag: null, xp: 0, at: e.at }; }),
      meals: (L.meals || []).map(m => ({ slot: m.slot, place: '기타', groups: GROUP_KEYS.filter(g => (m.checks || []).some(c => V1_GROUP[c] === g)), drink: (m.checks || []).includes('물 충분히') ? '물' : '안 마심', photo: m.photo || null, photoOk: false, xp: 0, at: m.at })),
    };
    if (!logs[d].status) delete logs[d].status;
  });
  if (stageOf(pet.xp) >= 4) pet.branch = pet.line;
  return { v: 2, offset: v.offset || 0, logs, rest: v.rest || {}, weeks: {}, lastEval: v.lastEval, pet };
}
