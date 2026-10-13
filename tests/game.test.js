import { describe, it, expect } from 'vitest';
import {
  RULES, stageOf, gradeToStat, statsFromInputs, newPet, newState, evaluate, certExercise, certMeal,
  addDay, daysBetween, weekId, todayKey,
} from '../src/game.js';
import { load, save, clear, KEY } from '../src/storage.js';

const D0 = '2026-10-12'; // 월요일
const base = (over = {}) => {
  const st = statsFromInputs({ total: 3, cardio: 3, strength: 2, flex: 4, power: 3, height: 163, ...over });
  return newState(newPet('튼튼이', st, D0), D0);
};
const ex = (S, day, min, int = 2, kind = '달리기') => certExercise(S, day, { kind, min, int, at: 1 });
const meal = (S, day, slot, checks) => certMeal(S, day, { slot, checks, at: 1 });
const BAL = ['채소·과일', '단백질', '밥·빵·면'];

describe('날짜', () => {
  it('하루 더하기 · 달·해 넘김', () => {
    expect(addDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-12', '2026-10-19')).toBe(7);
  });
  it('주 시작 = 월요일', () => {
    expect(weekId('2026-10-12')).toBe('2026-10-12');
    expect(weekId('2026-10-18')).toBe('2026-10-12'); // 일요일
    expect(weekId('2026-10-19')).toBe('2026-10-19');
  });
  it('체험용 날 넘김', () => {
    expect(todayKey(2, new Date(2026, 9, 30))).toBe('2026-11-01');
  });
});

describe('캐릭터 만들기', () => {
  it('능력치 = (6-등급)×16+10', () => {
    expect([1, 2, 3, 4, 5].map(gradeToStat)).toEqual([90, 74, 58, 42, 26]);
  });
  it('몸무게·골격근량이 둘 다 있을 때만 근력 보정', () => {
    expect(statsFromInputs({ total: 3, cardio: 3, strength: 2, flex: 4, power: 3, height: 163 }).strength).toBe(74);
    expect(statsFromInputs({ total: 3, cardio: 3, strength: 2, flex: 4, power: 3, height: 163, weight: 55 }).strength).toBe(74);
    // 근육 비율 0.48 이상 → (74+80+10)/2 = 82
    expect(statsFromInputs({ total: 3, cardio: 3, strength: 2, flex: 4, power: 3, height: 163, weight: 50, muscle: 24 }).strength).toBe(82);
    // 근육 비율 0.30 이하 → (74+0+10)/2 = 42
    expect(statsFromInputs({ total: 3, cardio: 3, strength: 2, flex: 4, power: 3, height: 163, weight: 60, muscle: 15 }).strength).toBe(42);
  });
  it('몸무게는 체형(키·종류)에 쓰지 않음', () => {
    const a = statsFromInputs({ total: 2, cardio: 3, strength: 3, flex: 3, power: 3, height: 170, weight: 40, muscle: 15 });
    const b = statsFromInputs({ total: 2, cardio: 3, strength: 3, flex: 3, power: 3, height: 170, weight: 90, muscle: 15 });
    expect(a.height).toBe(b.height);
    expect(a.total).toBe(b.total);
  });
  it('키가 비면 165, 이름은 8자까지', () => {
    expect(statsFromInputs({ total: 1, cardio: 1, strength: 1, flex: 1, power: 1, height: NaN }).height).toBe(165);
    const p = newPet('  아주아주긴이름입니다  ', statsFromInputs({ total: 5, cardio: 1, strength: 1, flex: 1, power: 1, height: 160 }), D0);
    expect(p.name).toBe('아주아주긴이름입');
    expect(p.type).toBe(4);
    expect(p.hp).toBe(70);
    expect(newPet('   ', statsFromInputs({ total: 1, cardio: 1, strength: 1, flex: 1, power: 1 }), D0).name).toBe('튼튼이');
  });
});

describe('단계', () => {
  it('경험치 경계', () => {
    expect([0, 14, 15, 59, 60, 140, 259, 260, 419, 420, 9999].map(stageOf)).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5]);
  });
});

describe('운동 인증', () => {
  it('경험치·체력·능력치', () => {
    const S = base();
    const r = ex(S, D0, 30, 2); // 30/10×4 = 12, 체력 +5, 심폐 +3
    expect(r).toMatchObject({ ok: true, counted: 30, gain: 12, grew: false });
    expect(S.pet.xp).toBe(12);
    expect(S.pet.hp).toBe(75);
    expect(S.pet.stats.cardio).toBe(58 + 3);
  });
  it('5분 미만은 거절', () => {
    const S = base();
    expect(ex(S, D0, 4)).toEqual({ ok: false, reason: 'short' });
    expect(S.logs[D0]).toBeUndefined();
  });
  it('하루 90분까지만 점수', () => {
    const S = base();
    ex(S, D0, 60, 3);
    const r = ex(S, D0, 60, 3);
    expect(r.counted).toBe(30);
    const r3 = ex(S, D0, 30, 3);
    expect(r3.counted).toBe(0);
    expect(r3.gain).toBe(0);
    expect(S.logs[D0].ex).toHaveLength(3); // 기록은 남음
  });
  it('단계가 오르면 grew', () => {
    const S = base();
    expect(ex(S, D0, 30, 3).grew).toBe(true); // 15 → 아기
  });
  it('능력치 최대 150', () => {
    const S = base(); S.pet.stats.flex = 148;
    ex(S, D0, 90, 1, '요가·스트레칭');
    expect(S.pet.stats.flex).toBe(150);
  });
});

describe('식단 인증', () => {
  it('3가지 이상 = 균형식', () => {
    const S = base();
    expect(meal(S, D0, '점심', BAL)).toMatchObject({ ok: true, balanced: true, gain: 6 });
    expect(S.pet.hp).toBe(73);
    expect(meal(S, D0, '저녁', ['물 충분히'])).toMatchObject({ ok: true, balanced: false, gain: 2 });
    expect(S.pet.hp).toBe(74);
  });
  it('끼니마다 하루 1번', () => {
    const S = base();
    meal(S, D0, '아침', BAL);
    expect(meal(S, D0, '아침', BAL)).toEqual({ ok: false, reason: 'dup' });
    expect(meal(S, addDay(D0, 1), '아침', BAL).ok).toBe(true);
  });
  it('고른 칸을 복사해서 저장 (나중에 바꿔도 기록 그대로)', () => {
    const S = base(); const set = new Set(BAL);
    meal(S, D0, '점심', set); set.clear();
    expect(S.logs[D0].meals[0].checks).toEqual(BAL);
  });
});

describe('하루 정산', () => {
  it('같은 날은 정산 안 함', () => {
    const S = base();
    expect(evaluate(S, D0)).toEqual([]);
    expect(S.pet.hp).toBe(70);
  });
  it('운동 20분 + 균형식 3끼 → 감점 없음, 균형식 보너스 최대 3끼', () => {
    const S = base();
    ex(S, D0, 20); ['아침', '점심', '저녁', '간식'].forEach(s => meal(S, D0, s, BAL));
    const hp = S.pet.hp;
    expect(evaluate(S, addDay(D0, 1))).toEqual([]);
    expect(S.logs[D0].status).toBe('ex');
    expect(S.pet.hp).toBe(Math.min(100, hp + 6));
    expect(S.lastEval).toBe(addDay(D0, 1));
  });
  it('주 1회 휴식일은 면제, 두 번째부터 -18', () => {
    const S = base();
    meal(S, D0, '점심', ['물 충분히']);
    meal(S, addDay(D0, 1), '점심', ['물 충분히']);
    evaluate(S, addDay(D0, 2));
    expect(S.logs[D0].status).toBe('rest');
    expect(S.logs[addDay(D0, 1)].status).toBe('miss');
    expect(S.pet.hp).toBe(70 + 1 + 1 - 18);
  });
  it('새 주에는 휴식일이 다시 생김', () => {
    const S = base();
    for (let k = 0; k < 8; k++) { meal(S, addDay(D0, k), '점심', BAL); if (k >= 1 && k <= 5) ex(S, addDay(D0, k), 20); }
    evaluate(S, addDay(D0, 8)); // 월(쉼) 화~토(운동) 일(안 함) + 다음 주 월(쉼)
    expect(S.pet.alive).toBe(true);
    const st = k => S.logs[addDay(D0, k)].status;
    expect(st(0)).toBe('rest');
    expect(st(1)).toBe('ex');
    expect(st(6)).toBe('miss');
    expect(st(7)).toBe('rest');
  });
  it('끼니 인증 0개면 -12', () => {
    const S = base();
    ex(S, D0, 30);
    const hp = S.pet.hp;
    expect(evaluate(S, addDay(D0, 1))).toEqual(['10-12 체력 -12']);
    expect(S.pet.hp).toBe(hp - 12);
  });
  it('체력 0이면 소멸, 그 뒤로는 정산 멈춤', () => {
    const S = base(); S.pet.hp = 20;
    evaluate(S, addDay(D0, 10));
    expect(S.pet.alive).toBe(false);
    expect(S.pet.hp).toBe(0);
    // 첫날 휴식일 -12 → 8, 둘째 날 -30 → 0
    expect(S.pet.diedOn).toBe(addDay(D0, 1));
    expect(S.lastEval).toBe(addDay(D0, 2));
  });
  it('굶기를 보상하지 않음: 안 먹은 날이 먹은 날보다 체력이 더 낮다', () => {
    const a = base(), b = base();
    ex(a, D0, 30); ex(b, D0, 30); meal(b, D0, '점심', ['물 충분히']);
    evaluate(a, addDay(D0, 1)); evaluate(b, addDay(D0, 1));
    expect(a.pet.hp).toBeLessThan(b.pet.hp);
  });
});

describe('저장', () => {
  const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };
  it('저장 → 불러오기 → 지우기', () => {
    const st = mem(); const S = base();
    expect(save(S, st)).toBe(true);
    expect(load(st)).toEqual(S);
    clear(st);
    expect(load(st)).toBeNull();
  });
  it('망가진 저장·다른 버전·막힌 저장소', () => {
    const st = mem();
    st.setItem(KEY, '{깨짐'); expect(load(st)).toBeNull();
    st.setItem(KEY, JSON.stringify({ v: 2, pet: {} })); expect(load(st)).toBeNull();
    const blocked = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    expect(load(blocked)).toBeNull();
    expect(save(base(), blocked)).toBe(false);
    expect(() => clear(blocked)).not.toThrow();
  });
});

it('RULES 숫자가 기획서 2장과 같음', () => {
  expect(RULES).toMatchObject({ exDailyCap: 90, exGoal: 20, missPenalty: 18, noMealPenalty: 12, balancedMin: 3, balancedBonus: 2, balancedBonusMax: 3, startHp: 70 });
});
