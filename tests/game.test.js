import { describe, it, expect } from 'vitest';
import {
  RULES, STAGES, stageOf, gradeToStat, statsFromInputs, lineFromStats, branchFromTraining, speciesName,
  newPet, newState, evaluate, certExercise, certMeal, checkPlausible, weekCounts, streak, remeasure,
  migrate, migrateXp, addDay, daysBetween, weekId, todayKey, toMin,
} from '../src/game.js';
import { load, save, clear, KEY } from '../src/storage.js';

const D0 = '2026-10-12'; // 월요일
const F = (over = {}) => ({ cardio: 3, strength: 2, flex: 4, power: 3, height: 163, ...over });
const base = (over = {}) => newState(newPet('튼튼이', statsFromInputs(F(over)), D0), D0);
const ex = (S, day, min, o = {}) => certExercise(S, day, { kind: '달리기', min, int: 2, ...o });
const meal = (S, day, slot, groups, o = {}) => certMeal(S, day, { slot, groups, place: '집밥', drink: '안 마심', ...o });
const BAL = ['곡류', '단백질', '채소'];

describe('날짜', () => {
  it('하루 더하기 · 달·해 넘김', () => {
    expect(addDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-12', '2026-10-19')).toBe(7);
  });
  it('주 시작 = 월요일', () => {
    expect(weekId('2026-10-18')).toBe('2026-10-12');
    expect(weekId('2026-10-19')).toBe('2026-10-19');
  });
  it('체험용 날 넘김 · 시각', () => {
    expect(todayKey(2, new Date(2026, 9, 30))).toBe('2026-11-01');
    expect(toMin('07:30')).toBe(450);
    expect(toMin('')).toBeNull();
  });
});

describe('캐릭터 만들기 · 계통', () => {
  it('능력치 = (6-등급)×16+10', () => {
    expect([1, 2, 3, 4, 5].map(gradeToStat)).toEqual([90, 74, 58, 42, 26]);
  });
  it('몸무게·골격근량이 둘 다 있을 때만 근력 보정', () => {
    expect(statsFromInputs(F()).strength).toBe(74);
    expect(statsFromInputs(F({ weight: 55 })).strength).toBe(74);
    expect(statsFromInputs(F({ weight: 50, muscle: 24 })).strength).toBe(82); // 비율 0.48 이상
    expect(statsFromInputs(F({ weight: 60, muscle: 15 })).strength).toBe(42); // 비율 0.25
  });
  it('가장 높은 능력치로 계통', () => {
    expect(lineFromStats(statsFromInputs(F({ cardio: 1 })))).toBe('wind');
    expect(lineFromStats(statsFromInputs(F()))).toBe('rock');
    expect(lineFromStats(statsFromInputs(F({ flex: 1, strength: 4 })))).toBe('flower');
    expect(lineFromStats(statsFromInputs(F({ power: 1, strength: 4 })))).toBe('spark');
  });
  it('고르면 빛 계통 (차이 ≤ 16, 1등이 둘)', () => {
    expect(lineFromStats(statsFromInputs(F({ cardio: 3, strength: 3, flex: 3, power: 4 })))).toBe('light');
    expect(lineFromStats(statsFromInputs(F({ cardio: 1, strength: 1, flex: 5, power: 5 })))).toBe('light');
  });
  it('인바디 근육 비율이 높으면 바위 계통이 될 수 있음', () => {
    const f = F({ cardio: 3, strength: 4, flex: 5, power: 5 });
    expect(lineFromStats(statsFromInputs(f))).toBe('wind');
    expect(lineFromStats(statsFromInputs({ ...f, weight: 50, muscle: 25 }))).toBe('rock'); // 근력 42 → 66
  });
  it('몸무게는 키·계통 말고 근력에만 (체지방은 받지도 않음)', () => {
    const a = statsFromInputs(F({ weight: 40, muscle: 15 })), b = statsFromInputs(F({ weight: 90, muscle: 15 }));
    expect(a.height).toBe(b.height);
    expect(a.cardio).toBe(b.cardio);
  });
  it('이름 8자 · 빈 이름', () => {
    expect(newPet('  아주아주긴이름입니다  ', statsFromInputs(F()), D0).name).toBe('아주아주긴이름입');
    expect(newPet('   ', statsFromInputs(F()), D0).name).toBe('튼튼이');
  });
  it('어른 갈래: 운동 많이 한 쪽 / 고르게 했으면 빛 / 적으면 처음 계통', () => {
    expect(branchFromTraining({ cardio: 50, strength: 0, flex: 0, power: 0 }, 'rock')).toBe('rock');
    expect(branchFromTraining({ cardio: 300, strength: 100, flex: 50, power: 50 }, 'rock')).toBe('wind');
    expect(branchFromTraining({ cardio: 100, strength: 100, flex: 100, power: 100 }, 'rock')).toBe('light');
  });
  it('이름표', () => {
    const p = newPet('a', statsFromInputs(F()), D0);
    expect(speciesName(p)).toBe('바위 알');
    p.xp = 400; expect(speciesName(p)).toBe('날개몬');
    p.xp = 900; p.branch = 'flower'; expect(speciesName(p)).toBe('꽃잎몬');
  });
});

describe('단계', () => {
  it('경험치 경계', () => {
    expect([0, 19, 20, 119, 120, 400, 899, 900, 1599, 1600].map(stageOf)).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4, 5]);
  });
  it('어른이 되는 순간 갈래가 정해짐', () => {
    const S = base(); S.pet.xp = 895; S.pet.train = { cardio: 400, strength: 10, flex: 0, power: 0 };
    ex(S, D0, 30);
    expect(S.pet.branch).toBe('wind');
  });
});

describe('운동 인증', () => {
  it('경험치·체력·능력치·운동한 분', () => {
    const S = base();
    const r = ex(S, D0, 30); // 30/10×4 = 12
    expect(r).toMatchObject({ ok: true, counted: 30, gain: 12, flag: null });
    expect(S.pet.hp).toBe(75);
    expect(S.pet.stats.cardio).toBe(61);
    expect(S.pet.train.cardio).toBe(30);
  });
  it('5분 미만 · 사진 없는 사진 인증은 거절', () => {
    const S = base();
    expect(ex(S, D0, 4)).toEqual({ ok: false, reason: 'short' });
    expect(ex(S, D0, 30, { proof: 'photo' })).toEqual({ ok: false, reason: 'photo' });
    expect(S.logs[D0]).toBeUndefined();
  });
  it('인증 방법 보너스: 기록 +10% · 오늘 사진 +20% · 앱 기록 +30%', () => {
    expect(ex(base(), D0, 30, { amount: { km: 4 } }).gain).toBe(13); // 12×1.1
    expect(ex(base(), D0, 30, { proof: 'photo', photo: 'x', photoOk: true }).gain).toBe(14); // ×1.2
    expect(ex(base(), D0, 30, { proof: 'device', photo: 'x', photoOk: true, amount: { km: 4 } }).gain).toBe(17); // ×1.4
    expect(ex(base(), D0, 30, { proof: 'photo', photo: 'x', photoOk: false }).gain).toBe(12); // 옛날 사진
  });
  it('준비·정리 운동 +1', () => {
    expect(ex(base(), D0, 30, { warm: true }).gain).toBe(13);
  });
  it('말이 안 되는 기록은 "확인 필요" + 보너스 없음', () => {
    expect(checkPlausible('달리기', 30, { km: 15 })).toMatch(/너무 빨라요/);
    expect(checkPlausible('자전거', 30, { km: 15 })).toBeNull();
    expect(checkPlausible('걷기', 10, { steps: 3000 })).toMatch(/걸음/);
    expect(checkPlausible('줄넘기', 5, { count: 2000 })).toMatch(/번/);
    expect(checkPlausible('맨몸 근력', 5, { sets: 10, reps: 50 })).toMatch(/회/);
    const r = ex(base(), D0, 30, { amount: { km: 15 }, proof: 'photo', photo: 'x', photoOk: true, warm: true });
    expect(r.flag).toMatch(/너무 빨라요/);
    expect(r.gain).toBe(12);
  });
  it('하루 90분까지만 점수', () => {
    const S = base();
    ex(S, D0, 60, { int: 3 });
    expect(ex(S, D0, 60, { int: 3 }).counted).toBe(30);
    const r = ex(S, D0, 30, { int: 3 });
    expect(r.counted).toBe(0);
    expect(r.gain).toBe(0);
    expect(S.logs[D0].ex).toHaveLength(3);
  });
  it('시간이 겹치거나 아직 안 끝난 운동은 거절', () => {
    const S = base();
    expect(ex(S, D0, 30, { start: '07:00' }).ok).toBe(true);
    expect(ex(S, D0, 30, { start: '07:20' })).toEqual({ ok: false, reason: 'overlap' });
    expect(ex(S, D0, 30, { start: '07:30' }).ok).toBe(true);
    expect(certExercise(S, D0, { kind: '걷기', min: 30, int: 1, start: '09:00' }, 9 * 60 + 10)).toEqual({ ok: false, reason: 'future' });
    expect(ex(S, D0, 30, { start: '23:50' })).toEqual({ ok: false, reason: 'late' });
  });
  it('하루 60분 · 여러 갈래 보너스는 하루 한 번', () => {
    const S = base();
    ex(S, D0, 40);
    const r = certExercise(S, D0, { kind: '스트레칭', min: 20, int: 1 }); // 20/10×3=6 +60분 5 +여러 갈래 3
    expect(r.gain).toBe(14);
    expect(r.parts).toEqual(['하루 60분', '여러 갈래 운동']);
    expect(certExercise(S, D0, { kind: '맨몸 근력', min: 10, int: 2 }).gain).toBe(4);
  });
  it('구기 종목은 심폐·순발 반씩', () => {
    const S = base();
    certExercise(S, D0, { kind: '구기 종목', min: 40, int: 2 });
    expect(S.pet.stats.cardio).toBe(58 + 2);
    expect(S.pet.stats.power).toBe(58 + 2);
    expect(S.pet.train).toMatchObject({ cardio: 20, power: 20 });
  });
  it('능력치 최대 150', () => {
    const S = base(); S.pet.stats.flex = 148;
    certExercise(S, D0, { kind: '요가·필라테스', min: 90, int: 1 });
    expect(S.pet.stats.flex).toBe(150);
  });
});

describe('식단 인증', () => {
  it('식품군 수로 한 끼 등급', () => {
    expect(meal(base(), D0, '점심', ['곡류', '채소'])).toMatchObject({ tier: 'plain', gain: 2 });
    expect(meal(base(), D0, '점심', BAL)).toMatchObject({ tier: 'bal', gain: 6 });
    expect(meal(base(), D0, '점심', [...BAL, '과일'])).toMatchObject({ tier: 'great', gain: 8 });
  });
  it('아침 +2 · 물/우유 +1 · 오늘 사진 +1', () => {
    expect(meal(base(), D0, '아침', BAL).gain).toBe(8);
    expect(meal(base(), D0, '점심', BAL, { drink: '물' }).gain).toBe(7);
    expect(meal(base(), D0, '점심', BAL, { drink: '주스·탄산' }).gain).toBe(6); // 깎지는 않음
    expect(meal(base(), D0, '점심', BAL, { photo: 'x', photoOk: true }).gain).toBe(7);
    expect(meal(base(), D0, '점심', BAL, { photo: 'x', photoOk: false }).gain).toBe(6);
  });
  it('우유를 마시면 우유 식품군으로 셈', () => {
    expect(meal(base(), D0, '점심', BAL, { drink: '우유' })).toMatchObject({ n: 4, tier: 'great' });
  });
  it('끼니마다 하루 1번 · 모르는 끼니는 거절', () => {
    const S = base();
    meal(S, D0, '아침', BAL);
    expect(meal(S, D0, '아침', BAL)).toEqual({ ok: false, reason: 'dup' });
    expect(meal(S, D0, '야식', BAL)).toEqual({ ok: false, reason: 'slot' });
    expect(meal(S, addDay(D0, 1), '아침', BAL).ok).toBe(true);
  });
  it('하루에 5가지 모두 → 무지개 식단 +5 (한 번)', () => {
    const S = base();
    meal(S, D0, '아침', ['곡류', '우유']);
    const r = meal(S, D0, '점심', ['곡류', '단백질', '채소', '과일']);
    expect(r.rainbow).toBe(true);
    expect(r.gain).toBe(8 + 5);
    expect(meal(S, D0, '저녁', [...BAL, '과일', '우유']).rainbow).toBe(false);
  });
  it('고른 칸을 복사해서 저장', () => {
    const S = base(); const set = new Set(BAL);
    meal(S, D0, '점심', set); set.clear();
    expect(S.logs[D0].meals[0].groups).toEqual(BAL);
  });
});

describe('하루 정산', () => {
  it('같은 날은 정산 안 함', () => {
    const S = base();
    expect(evaluate(S, D0)).toEqual([]);
    expect(S.pet.hp).toBe(70);
  });
  it('운동 20분 + 균형식 → 감점 없음, 간식은 정산 보너스에서 뺌', () => {
    const S = base(); S.pet.hp = 50;
    ex(S, D0, 20); meal(S, D0, '점심', BAL); meal(S, D0, '간식', BAL);
    const hp = S.pet.hp;
    evaluate(S, addDay(D0, 1));
    expect(S.logs[D0].status).toBe('ex');
    expect(S.pet.hp).toBe(hp + 2);
  });
  it('주 1회 휴식일은 면제, 두 번째부터 -18', () => {
    const S = base();
    meal(S, D0, '점심', ['물']); meal(S, addDay(D0, 1), '점심', []);
    evaluate(S, addDay(D0, 2));
    expect(S.logs[D0].status).toBe('rest');
    expect(S.logs[addDay(D0, 1)].status).toBe('miss');
    expect(S.pet.hp).toBe(70 + 1 + 1 - 18);
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
    expect(S.pet.diedOn).toBe(addDay(D0, 1));
    expect(S.lastEval).toBe(addDay(D0, 2));
  });
  it('굶기를 보상하지 않음', () => {
    const a = base(), b = base();
    ex(a, D0, 30); ex(b, D0, 30); meal(b, D0, '점심', ['곡류']);
    evaluate(a, addDay(D0, 1)); evaluate(b, addDay(D0, 1));
    expect(a.pet.hp).toBeLessThan(b.pet.hp);
  });
  it('주간 미션 (WHO): 힘들게 3일 · 근력 3일 · 유연 2일 → 각 +10, 일요일 정산 때', () => {
    const S = base();
    for (let i = 0; i < 7; i++) {
      const d = addDay(D0, i);
      meal(S, d, '점심', BAL);
      if (i < 3) { ex(S, d, 20, { int: 3, start: '07:00' }); certExercise(S, d, { kind: '맨몸 근력', min: 15, int: 2, start: '08:00' }); }
      if (i < 2) certExercise(S, d, { kind: '스트레칭', min: 10, int: 1, start: '09:00' });
    }
    expect(weekCounts(S, D0)).toMatchObject({ hard: 3, strength: 3, flex: 2 });
    const xp = S.pet.xp;
    const notes = evaluate(S, addDay(D0, 7));
    expect(notes).toContain('주간 미션 3개 +30');
    expect(S.pet.xp).toBe(xp + 30);
    expect(S.weeks[D0].done).toEqual(['hard', 'strength', 'flex']);
  });
});

describe('연속 기록 · 다시 재기', () => {
  it('연속 기록', () => {
    const S = base();
    for (let i = 0; i < 3; i++) { ex(S, addDay(D0, i), 20); meal(S, addDay(D0, i), '점심', BAL); }
    evaluate(S, addDay(D0, 3));
    expect(streak(S, addDay(D0, 3))).toBe(3);
    ex(S, addDay(D0, 3), 20); meal(S, addDay(D0, 3), '점심', BAL);
    expect(streak(S, addDay(D0, 3))).toBe(4);
  });
  it('PAPS 다시 재면 기준만 바뀌고 운동으로 오른 만큼은 남음', () => {
    const S = base();
    ex(S, D0, 50); // 심폐 +5
    remeasure(S, F({ cardio: 1 }));
    expect(S.pet.stats.cardio).toBe(90 + 5);
    expect(S.pet.base.cardio).toBe(90);
    expect(S.pet.line).toBe('rock'); // 계통은 그대로
  });
});

describe('예전 저장(v1) 옮기기', () => {
  const v1 = {
    v: 1, offset: 0, lastEval: D0, rest: {},
    pet: { name: '몬', type: 2, height: 160, stats: { cardio: 90, strength: 42, flex: 42, power: 42 }, hp: 60, xp: 60, alive: true, born: D0 },
    logs: { [D0]: { ex: [{ kind: '근력 운동', min: 30, int: 2, photo: null, at: 1 }], meals: [{ slot: '점심', checks: ['채소·과일', '단백질', '밥·빵·면', '물 충분히'], photo: null, at: 2 }] } },
  };
  it('계통·경험치·기록을 새 모양으로', () => {
    const S = migrate(JSON.parse(JSON.stringify(v1)));
    expect(S.v).toBe(2);
    expect(S.pet.line).toBe('wind');
    expect(stageOf(S.pet.xp)).toBe(2); // 예전 꼬마 → 지금도 꼬마
    expect(S.logs[D0].ex[0]).toMatchObject({ kind: '맨몸 근력', cat: 'strength' });
    expect(S.logs[D0].meals[0]).toMatchObject({ groups: ['곡류', '단백질', '채소'], drink: '물' });
  });
  it('예전 단계 그대로', () => {
    [[0, 0], [14, 0], [15, 1], [59, 1], [140, 3], [260, 4], [420, 5], [500, 5]].forEach(([x, st]) => expect(stageOf(migrateXp(x))).toBe(st));
    expect(migrateXp(15)).toBe(STAGES[1][0]);
  });
  it('모르는 버전은 버림', () => {
    expect(migrate({ v: 9, pet: {} })).toBeNull();
    expect(migrate(null)).toBeNull();
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
  it('망가진 저장 · 막힌 저장소', () => {
    const st = mem();
    st.setItem(KEY, '{깨짐'); expect(load(st)).toBeNull();
    const blocked = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    expect(load(blocked)).toBeNull();
    expect(save(base(), blocked)).toBe(false);
    expect(() => clear(blocked)).not.toThrow();
  });
});

it('RULES 숫자가 기획서 2장과 같음', () => {
  expect(RULES).toMatchObject({ exDailyCap: 90, exGoal: 20, exGoalPlus: 60, missPenalty: 18, noMealPenalty: 12, balancedMin: 3, balancedBonus: 2, balancedBonusMax: 3, startHp: 70 });
  expect(STAGES.map(s => s[0])).toEqual([0, 20, 120, 400, 900, 1600]);
});
