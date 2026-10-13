// 게임 계산만 모은 파일 (화면·저장과 분리). 숫자를 바꾸면 CLAUDE.md 2장도 같이 고친다.

export const SAVE_VERSION = 1;
export const STAGES = [[0, '알'], [15, '아기'], [60, '꼬마'], [140, '청소년'], [260, '어른'], [420, '챔피언']];
export const TYPES = [
  { n: '불꽃', c: [236, 98, 62] }, { n: '바람', c: [38, 166, 154] }, { n: '새싹', c: [96, 170, 64] },
  { n: '물방울', c: [64, 132, 224] }, { n: '별빛', c: [150, 104, 214] },
];
export const EX_KINDS = [['걷기', 'cardio'], ['달리기', 'cardio'], ['줄넘기', 'power'], ['근력 운동', 'strength'],
  ['구기 종목', 'power'], ['요가·스트레칭', 'flex'], ['춤', 'cardio'], ['기타', 'cardio']];
export const SLOTS = ['아침', '점심', '저녁', '간식'];
export const CHECKS = ['채소·과일', '단백질', '밥·빵·면', '우유·유제품', '물 충분히'];

export const RULES = {
  exDailyCap: 90,      // 하루 운동 인정 한도(분)
  exMinCert: 5,        // 인증 최소 시간(분)
  exMaxInput: 300,
  exGoal: 20,          // 이만큼 안 하면 하루 정산 때 체력 감소
  missPenalty: 18,
  noMealPenalty: 12,
  balancedMin: 3,      // 균형식 = 고른 칸 3개 이상
  balancedBonus: 2,    // 하루 정산 때 균형식 끼니마다
  balancedBonusMax: 3,
  mealXp: { bal: 6, plain: 2 },
  mealHp: { bal: 3, plain: 1 },
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
/** 실제 오늘 + 체험용으로 넘긴 날 수 */
export function todayKey(offset = 0, now = new Date()) { const d = new Date(now); d.setDate(d.getDate() + offset); return keyOf(d); }

export const stageOf = xp => { let i = 0; STAGES.forEach((s, k) => { if (xp >= s[0]) i = k; }); return i; };
export const isBalanced = meal => meal.checks.length >= RULES.balancedMin;
export const exMinutes = L => (L ? L.ex.reduce((a, e) => a + e.min, 0) : 0);
export const balancedCount = L => (L ? L.meals.filter(isBalanced).length : 0);

/* ---------- 캐릭터 만들기 ---------- */
export const gradeToStat = gr => (6 - gr) * 16 + 10; // 1등급 90 · 5등급 26

/** 폼 값 → 능력치. f = {total,cardio,strength,flex,power: 등급, height, weight?, muscle?} */
export function statsFromInputs(f) {
  let str = gradeToStat(f.strength);
  const w = f.weight, m = f.muscle;
  if (w > 0 && m > 0) { const r = m / w; str = Math.round((str + clamp((r - 0.30) / 0.18, 0, 1) * 80 + 10) / 2); }
  return {
    total: f.total, cardio: gradeToStat(f.cardio), strength: str,
    flex: gradeToStat(f.flex), power: gradeToStat(f.power), height: f.height > 0 ? f.height : 165,
  };
}

export function newPet(name, st, today) {
  return {
    name: (name || '튼튼이').trim().slice(0, 8) || '튼튼이', type: st.total - 1, height: st.height,
    stats: { cardio: st.cardio, strength: st.strength, flex: st.flex, power: st.power },
    hp: RULES.startHp, xp: 0, alive: true, born: today,
  };
}

export function newState(pet, today, offset = 0) {
  return { v: SAVE_VERSION, offset, logs: {}, rest: {}, lastEval: today, pet };
}

export function dayLog(S, k) { return S.logs[k] || (S.logs[k] = { ex: [], meals: [] }); }

/* ---------- 하루 정산 ---------- */
/** lastEval 부터 어제까지 하루씩 정산. S 를 고치고, 체력이 깎인 날 메모를 돌려준다. */
export function evaluate(S, today) {
  if (!S || !S.pet.alive) return [];
  const notes = [];
  while (S.lastEval < today && S.pet.alive) {
    const d = S.lastEval;
    const L = S.logs[d] || { ex: [], meals: [] };
    const exMin = Math.min(RULES.exDailyCap, exMinutes(L));
    let delta = 0;
    if (exMin >= RULES.exGoal) L.status = 'ex';
    else {
      const w = weekId(d);
      if (!S.rest[w]) { S.rest[w] = d; L.status = 'rest'; } else { L.status = 'miss'; delta -= RULES.missPenalty; }
    }
    if (L.meals.length === 0) delta -= RULES.noMealPenalty;
    else delta += Math.min(balancedCount(L), RULES.balancedBonusMax) * RULES.balancedBonus;
    S.logs[d] = L;
    S.pet.hp = clamp(S.pet.hp + delta, 0, 100);
    if (delta < 0) notes.push(`${d.slice(5)} 체력 ${delta}`);
    if (S.pet.hp <= 0) { S.pet.alive = false; S.pet.diedOn = d; }
    S.lastEval = addDay(d, 1);
  }
  return notes;
}

/* ---------- 인증 ---------- */
/** 운동 인증. 결과 {ok, reason?, counted, gain, grew} */
export function certExercise(S, today, { kind, min, int, photo = null, at = Date.now() }) {
  min = clamp(Math.trunc(min) || 0, 0, RULES.exMaxInput);
  if (min < RULES.exMinCert) return { ok: false, reason: 'short' };
  const k = EX_KINDS.find(x => x[0] === kind) || EX_KINDS[EX_KINDS.length - 1];
  const L = dayLog(S, today);
  const before = Math.min(RULES.exDailyCap, exMinutes(L));
  const counted = Math.min(RULES.exDailyCap, before + min) - before;
  L.ex.push({ kind: k[0], min, int, photo, at });
  const gain = Math.round(counted / 10 * (2 + int));
  const st0 = stageOf(S.pet.xp);
  S.pet.xp += gain;
  S.pet.hp = clamp(S.pet.hp + Math.round(counted / 6), 0, 100);
  S.pet.stats[k[1]] = clamp(S.pet.stats[k[1]] + Math.round(counted / 10), 0, RULES.statMax);
  return { ok: true, min, counted, gain, grew: stageOf(S.pet.xp) > st0 };
}

/** 식단 인증. 끼니마다 하루 1번. 결과 {ok, reason?, balanced, gain, grew} */
export function certMeal(S, today, { slot, checks, photo = null, at = Date.now() }) {
  const L = dayLog(S, today);
  if (L.meals.some(m => m.slot === slot)) return { ok: false, reason: 'dup' };
  const meal = { slot, checks: [...checks], photo, at };
  const bal = isBalanced(meal);
  L.meals.push(meal);
  const gain = bal ? RULES.mealXp.bal : RULES.mealXp.plain;
  const st0 = stageOf(S.pet.xp);
  S.pet.xp += gain;
  S.pet.hp = clamp(S.pet.hp + (bal ? RULES.mealHp.bal : RULES.mealHp.plain), 0, 100);
  return { ok: true, balanced: bal, gain, grew: stageOf(S.pet.xp) > st0 };
}
