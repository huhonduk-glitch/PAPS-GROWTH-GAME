import { describe, it, expect } from 'vitest';
import {
  RULES, STAGES, stageOf, gradeToStat, statsFromInputs, lineFromStats, branchFromTraining, speciesName,
  newPet, newState, evaluate, certExercise, certMeal, checkPlausible, weekCounts, streak, remeasure,
  migrate, migrateXp, addDay, daysBetween, weekId, todayKey, toMin,
  termOf, passesLeft, useSickPass, useExamPass, cancelExamPass, restPassOn,
  SAVE_VERSION, questOf, questCoin, pickQuests, todayQuests, completeQuest, dayStreak,
  dexEntries, buyItem, wearItem, takeOff, wearLook, itemOf, pendingAnniversaries, celebrate, pickLine, dayRnd, greeting,
  keepOnRestart, applyKeep,
} from '../src/game.js';
import { ITEMS, ITEM_CATEGORIES } from '../src/config/items.js';
import { DIALOGUES } from '../src/config/dialogues.js';
import {
  EXAM_REST_MAX_DAYS, EXAM_REST_PER_TERM, SICK_REST_PER_MONTH, QUESTS_PER_DAY, QUEST_COIN, DAILY_ALL_CLEAR_BONUS,
  ANNIVERSARY_DAYS, ANNIVERSARY_GIFTS,
} from '../src/config/game.js';
import { QUESTS, QUEST_CATEGORIES } from '../src/config/quests.js';
import { load, save, clear, KEY, saveKeep, loadKeep } from '../src/storage.js';

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
  it('체력 0이면 잠듦 (소멸 없음), 경험치·단계 그대로, 잠든 동안 벌칙 없음', () => {
    const S = base(); S.pet.hp = 20; S.pet.xp = 150;
    const notes = evaluate(S, addDay(D0, 10));
    expect(S.pet.sleeping).toBe(true);
    expect(S.pet.hp).toBe(0);
    expect(S.pet.xp).toBe(150);
    expect(notes).toContain('튼튼몬이 잠들었어요');
    expect(notes[notes.length - 1]).toBe('튼튼몬이 잠들었어요'); // 잠든 뒤로는 체력 감소 메모 없음
    expect(S.logs[addDay(D0, 5)].status).toBe('sleep');
    expect(S.lastEval).toBe(addDay(D0, 10)); // 정산은 계속 진행
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

describe('잠듦 · 깨어나기', () => {
  const asleep = () => { const S = base(); S.pet.xp = 150; S.pet.hp = 0; S.pet.sleeping = true; return S; };
  it('운동 인증 1번이면 깨어남: 체력 30 + 그 운동 체력, 경험치는 평소대로', () => {
    const S = asleep(), awake = base(); awake.pet.xp = 150; awake.pet.hp = 30;
    const r = ex(S, D0, 6), r2 = ex(awake, D0, 6);
    expect(r.woke).toBe(true);
    expect(S.pet.sleeping).toBe(false);
    expect(S.pet.hp).toBe(30 + Math.round(6 / 6));
    expect(r.gain).toBe(r2.gain);
    expect(S.pet.xp).toBe(awake.pet.xp);
  });
  it('간식 뺀 끼니 인증이면 식품군 수와 상관없이 깨어남', () => {
    const S = asleep();
    const r = meal(S, D0, '아침', []);
    expect(r.woke).toBe(true);
    expect(S.pet.hp).toBe(30 + RULES.mealHp.plain);
  });
  it('아침 · 점심 · 저녁 끼니 인증 모두 깨움', () => {
    ['아침', '점심', '저녁'].forEach(slot => {
      const S = asleep();
      const r = meal(S, D0, slot, ['곡류']);
      expect(r.woke).toBe(true);
      expect(S.pet.sleeping).toBe(false);
      expect(S.pet.hp).toBe(30 + RULES.mealHp.plain);
    });
  });
  it('간식은 깨우지 않음', () => {
    const S = asleep();
    const r = meal(S, D0, '간식', BAL);
    expect(r.ok).toBe(true);
    expect(r.woke).toBe(false);
    expect(S.pet.sleeping).toBe(true);
  });
  it('깨어 있을 때는 woke 아님', () => {
    expect(ex(base(), D0, 10).woke).toBe(false);
  });
  it('잠든 날도 주간 미션 정산은 그대로', () => {
    const S = asleep();
    expect(() => evaluate(S, addDay(D0, 7))).not.toThrow();
    expect(S.weeks[D0]).toBeTruthy();
  });
});

describe('휴식권', () => {
  it('학기: 3~8월 1학기, 9월~다음 해 2월 2학기', () => {
    expect(termOf('2026-03-01')).toBe('2026-1');
    expect(termOf('2026-08-31')).toBe('2026-1');
    expect(termOf('2026-09-01')).toBe('2026-2');
    expect(termOf('2027-02-28')).toBe('2026-2');
  });
  it('아픈 날 휴식권: 그날 체력 감소 없음 (운동 0분 · 끼니 0개여도)', () => {
    const S = base(); S.rest[weekId(D0)] = 'x'; // 주 1회 휴식일은 이미 씀
    expect(useSickPass(S, D0).ok).toBe(true);
    evaluate(S, addDay(D0, 1));
    expect(S.pet.hp).toBe(70);
    expect(S.logs[D0].status).toBe('pass');
  });
  it('휴식권 날에도 늘어나는 체력은 그대로', () => {
    const S = base();
    useSickPass(S, D0); meal(S, D0, '점심', BAL);
    const hp = S.pet.hp;
    evaluate(S, addDay(D0, 1));
    expect(S.pet.hp).toBe(hp + RULES.balancedBonus);
  });
  it('휴식권 날은 주 1회 휴식일을 쓰지 않음', () => {
    const S = base();
    useSickPass(S, D0);
    evaluate(S, addDay(D0, 2));
    expect(S.logs[addDay(D0, 1)].status).toBe('rest');
  });
  it(`아픈 날 휴식권은 한 달 ${SICK_REST_PER_MONTH}번, 같은 날 두 번 안 됨, 다음 달엔 다시`, () => {
    const S = base();
    expect(useSickPass(S, D0).ok).toBe(true);
    expect(useSickPass(S, D0).reason).toBe('already');
    for (let i = 1; i < SICK_REST_PER_MONTH; i++) expect(useSickPass(S, addDay(D0, i)).ok).toBe(true);
    expect(useSickPass(S, addDay(D0, 5)).reason).toBe('none');
    expect(passesLeft(S, D0).sick).toBe(0);
    expect(useSickPass(S, '2026-11-02').ok).toBe(true);
  });
  it(`시험기간 휴식권: 최대 ${EXAM_REST_MAX_DAYS}일 동안 감소 없음, 끝나면 다시 감소`, () => {
    const S = base();
    const r = useExamPass(S, D0, D0, EXAM_REST_MAX_DAYS);
    expect(r).toMatchObject({ ok: true, end: addDay(D0, EXAM_REST_MAX_DAYS - 1) });
    evaluate(S, addDay(D0, EXAM_REST_MAX_DAYS));
    expect(S.pet.hp).toBe(70);
    evaluate(S, addDay(D0, EXAM_REST_MAX_DAYS + 1));
    expect(S.pet.hp).toBeLessThan(70);
  });
  it('시험기간 휴식권 막는 것: 지난 날 시작 · 기간 초과 · 겹침', () => {
    const S = base();
    expect(useExamPass(S, D0, addDay(D0, -1), 3).reason).toBe('start');
    expect(useExamPass(S, D0, D0, EXAM_REST_MAX_DAYS + 1).reason).toBe('days');
    expect(useExamPass(S, D0, D0, 0).reason).toBe('days');
    expect(useExamPass(S, D0, addDay(D0, 3), 3).ok).toBe(true);
    expect(useExamPass(S, D0, D0, 4).reason).toBe('overlap');
  });
  it(`시험기간 휴식권은 학기당 ${EXAM_REST_PER_TERM}번, 다음 학기엔 다시`, () => {
    const S = base();
    for (let i = 0; i < EXAM_REST_PER_TERM; i++) expect(useExamPass(S, D0, addDay(D0, i * 10), 3).ok).toBe(true);
    expect(useExamPass(S, D0, addDay(D0, 50), 3).reason).toBe('none'); // 12월 = 같은 2학기
    expect(useExamPass(S, D0, '2027-03-02', 3).ok).toBe(true);
  });
  it('시험기간 휴식권: 시작일 전이면 취소하고 횟수 돌려줌, 시작했으면 취소 안 됨', () => {
    const S = base();
    useExamPass(S, D0, addDay(D0, 3), 3);
    useExamPass(S, D0, D0, 2);
    expect(passesLeft(S, D0).exam).toBe(0);
    expect(cancelExamPass(S, D0, D0).reason).toBe('started');
    expect(cancelExamPass(S, D0, addDay(D0, 9)).reason).toBe('missing');
    expect(cancelExamPass(S, D0, addDay(D0, 3)).ok).toBe(true);
    expect(passesLeft(S, D0).exam).toBe(1);
    expect(restPassOn(S, addDay(D0, 4))).toBeNull();
  });
  it('잠든 동안에는 휴식권을 쓰지 않음', () => {
    const S = base(); S.pet.sleeping = true;
    expect(useSickPass(S, D0).reason).toBe('sleeping');
    expect(useExamPass(S, D0, D0, 3).reason).toBe('sleeping');
  });
  it('휴식권 날은 연속 기록을 끊지 않음', () => {
    const S = base();
    ex(S, D0, 20); meal(S, D0, '점심', BAL);
    useSickPass(S, addDay(D0, 1));
    ex(S, addDay(D0, 2), 20); meal(S, addDay(D0, 2), '점심', BAL);
    evaluate(S, addDay(D0, 3));
    expect(streak(S, addDay(D0, 3))).toBe(2);
  });
});

describe('오늘의 퀘스트 · 코인', () => {
  const finishAll = (S, day) => { const Q = todayQuests(S, day); Q.ids.forEach(id => completeQuest(S, day, id, questOf(id).verify)); return Q; };
  it('퀘스트 목록: 15개 이상, id 겹침 없음, 갈래·인증 방식 올바름', () => {
    expect(QUESTS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(QUESTS.map(q => q.id)).size).toBe(QUESTS.length);
    QUESTS.forEach(q => {
      expect(Object.keys(QUEST_CATEGORIES)).toContain(q.category);
      expect(['tap', 'photo']).toContain(q.verify);
    });
    Object.keys(QUEST_CATEGORIES).forEach(c => expect(QUESTS.some(q => q.category === c)).toBe(true));
  });
  it('건강 원칙: 체중 감량·굶기·식사량 줄이기·외모 퀘스트 없음', () => {
    QUESTS.forEach(q => expect(q.title).not.toMatch(/다이어트|체중|몸무게|칼로리|굶|덜 먹|적게 먹|줄이|살 ?빼|살빠|몸매|외모|뱃살/));
  });
  it(`하루 ${QUESTS_PER_DAY}개, 갈래마다 하나씩, 같은 날은 늘 같음`, () => {
    const a = pickQuests(D0, 'x'), b = pickQuests(D0, 'x');
    expect(a).toEqual(b);
    expect(a.length).toBe(QUESTS_PER_DAY);
    expect(new Set(a.map(id => questOf(id).category)).size).toBe(3);
  });
  it('날짜가 바뀌면 새로 뽑힘 (여러 날 중 다른 날이 있음)', () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => pickQuests(addDay(D0, i), 'x').join());
    expect(new Set(days).size).toBeGreaterThan(1);
  });
  it('처음 열 때 저장 → 다시 열어도 같은 3개 (목록이 바뀌어도)', () => {
    const S = base();
    const ids = [...todayQuests(S, D0).ids];
    const reopened = JSON.parse(JSON.stringify(S));
    expect(todayQuests(reopened, D0).ids).toEqual(ids);
  });
  it(`원탭 +${QUEST_COIN.tap} · 사진 +${QUEST_COIN.photo}, 같은 퀘스트 두 번 안 됨, 정해진 방식만`, () => {
    const S = base(); S.logs[D0] = { ex: [], meals: [], bonus: {}, quests: { ids: ['water_1', 'veggie_lunch', 'stretch_3'], done: {}, allClear: false } };
    expect(completeQuest(S, D0, 'water_1', 'tap')).toMatchObject({ ok: true, coin: QUEST_COIN.tap, bonus: 0 });
    expect(completeQuest(S, D0, 'water_1', 'tap').reason).toBe('done');
    expect(completeQuest(S, D0, 'veggie_lunch', 'tap').reason).toBe('verify');
    expect(completeQuest(S, D0, 'veggie_lunch', 'photo')).toMatchObject({ ok: true, coin: QUEST_COIN.photo });
    expect(completeQuest(S, D0, 'fruit', 'tap').reason).toBe('unknown'); // 오늘 퀘스트 아님
    expect(S.coins).toBe(QUEST_COIN.tap + QUEST_COIN.photo);
    expect(S.logs[D0].quests.done.veggie_lunch).toEqual({ verify: 'photo', at: expect.any(Number) }); // 사진은 저장 안 함
  });
  it(`3개 모두 끝내면 보너스 +${DAILY_ALL_CLEAR_BONUS} (하루 한 번)`, () => {
    const S = base();
    const Q = todayQuests(S, D0);
    const results = Q.ids.map(id => completeQuest(S, D0, id, questOf(id).verify));
    expect(results.at(-1)).toMatchObject({ allClear: true, bonus: DAILY_ALL_CLEAR_BONUS });
    expect(results.slice(0, -1).every(r => !r.allClear)).toBe(true);
    expect(S.coins).toBe(Q.ids.reduce((a, id) => a + questCoin(questOf(id)), 0) + DAILY_ALL_CLEAR_BONUS);
  });
  it('퀘스트는 경험치·체력·진화에 들어가지 않음', () => {
    const S = base(); const { hp, xp } = S.pet;
    finishAll(S, D0);
    expect(S.pet.hp).toBe(hp);
    expect(S.pet.xp).toBe(xp);
  });
  it('잠든 튼튼몬은 퀘스트로 깨어나지 않음 (코인은 받음)', () => {
    const S = base(); S.pet.sleeping = true; S.pet.hp = 0;
    finishAll(S, D0);
    expect(S.pet.sleeping).toBe(true);
    expect(S.coins).toBeGreaterThan(0);
  });
  it('연속 기록(합침): 이어지면 늘고, 빈 날이면 끊김', () => {
    const S = base();
    finishAll(S, D0); finishAll(S, addDay(D0, 1));
    expect(dayStreak(S, addDay(D0, 1))).toBe(2);
    S.rest[weekId(D0)] = D0; // 주 1회 휴식일은 이미 씀
    evaluate(S, addDay(D0, 4));
    expect(dayStreak(S, addDay(D0, 4))).toBe(0);
  });
  it('주 1회 휴식일 · 휴식권 날은 연속 기록(합침)을 끊지 않음', () => {
    const S = base();
    finishAll(S, D0); ex(S, D0, 20);         // 월: 운동도 해서 휴식일 안 씀
    useSickPass(S, addDay(D0, 1));           // 화: 휴식권
    // 수: 아무것도 안 함 → 주 1회 휴식일로
    finishAll(S, addDay(D0, 3));             // 목
    evaluate(S, addDay(D0, 4));
    expect(S.logs[addDay(D0, 2)].status).toBe('rest');
    expect(dayStreak(S, addDay(D0, 4))).toBe(2);
    finishAll(S, addDay(D0, 4));
    expect(dayStreak(S, addDay(D0, 4))).toBe(3);
  });
});

describe('연속 기록(합침): 퀘스트 또는 운동+끼니', () => {
  it('퀘스트 없이 운동+끼니만 한 날도 이어짐, 섞여도 이어짐', () => {
    const S = base();
    ex(S, D0, 20); meal(S, D0, '점심', BAL);                         // 운동+끼니
    const Q = todayQuests(S, addDay(D0, 1)); completeQuest(S, addDay(D0, 1), Q.ids[0], questOf(Q.ids[0]).verify); // 퀘스트만
    evaluate(S, addDay(D0, 2));
    expect(dayStreak(S, addDay(D0, 2))).toBe(2);
    expect(streak(S, addDay(D0, 2))).toBe(0); // 확실한 인증만 세는 기존 기록(랭킹용)은 따로
  });
});

describe('도감', () => {
  it('단계 × 계통 30칸, 설명 있음', () => {
    const E = dexEntries();
    expect(E.length).toBe(30);
    expect(new Set(E.map(e => e.key)).size).toBe(30);
    E.forEach(e => expect(e.desc.length).toBeGreaterThan(3));
    expect(E.find(e => e.key === '4-wind')).toMatchObject({ name: '하늘몬', desc: '바람 계통 어른 — 바람처럼 멀리 달려요' });
    expect(new Set(E.map(e => e.desc.split(' — ')[1])).size).toBe(30); // 칸마다 설명이 다름
    E.forEach(e => expect(e.desc).not.toMatch(/날씬|뚱뚱|몸매|외모|예쁘|잘생|키가|살/));
  });
  it('새 튼튼몬은 알만 · 자라면 거쳐 온 단계가 모두 적힘 (건너뛴 단계 포함)', () => {
    const S = base();
    expect(S.dex).toEqual([`0-${S.pet.line}`]);
    S.pet.xp = 110; ex(S, D0, 30); // 아기를 건너뛰고 꼬마로
    expect(S.dex).toEqual(['0', '1', '2'].map(i => `${i}-${S.pet.line}`));
  });
  it('어른부터는 갈래 계통으로 적힘', () => {
    const S = base({ cardio: 1, strength: 5, flex: 5, power: 5 }); // 바람
    S.pet.train = { cardio: 0, strength: 0, flex: 300, power: 0 };
    S.pet.xp = 895; ex(S, D0, 30);
    expect(S.pet.branch).toBe('flower');
    expect(S.dex).toContain('3-wind');
    expect(S.dex).toContain('4-flower');
  });
});

describe('꾸미기', () => {
  it('목록: id 겹침 없음, 갈래 올바름, 한정은 값이 없음, 배경·운동복은 색이 있음', () => {
    expect(new Set(ITEMS.map(i => i.id)).size).toBe(ITEMS.length);
    ITEMS.forEach(i => {
      expect(Object.keys(ITEM_CATEGORIES)).toContain(i.category);
      if (i.limited) expect(i.price).toBeNull(); else expect(i.price).toBeGreaterThan(0);
      if (i.category === 'bg' || i.category === 'outfit') expect(i.color).toHaveLength(3);
    });
    Object.keys(ITEM_CATEGORIES).forEach(c => expect(ITEMS.filter(i => i.category === c && !i.limited).length).toBeGreaterThanOrEqual(4));
  });
  it('건강 원칙: 체형을 바꾸는 아이템 없음', () => {
    ITEMS.forEach(i => expect(i.name).not.toMatch(/살|다이어트|근육|날씬|뚱뚱|마른|체형|몸매|체중/));
  });
  it('코인으로 사기 · 모자라면 못 삼 · 두 번 못 삼 · 한정은 못 삼', () => {
    const S = base(); S.coins = 16;
    expect(buyItem(S, 'hat_grad').reason).toBe('coins');
    expect(buyItem(S, 'hat_cap')).toEqual({ ok: true });
    expect(S.coins).toBe(16 - itemOf('hat_cap').price);
    expect(buyItem(S, 'hat_cap').reason).toBe('owned');
    S.coins = 100;
    expect(buyItem(S, 'hat_ribbon').reason).toBe('limited');
    expect(buyItem(S, 'nope').reason).toBe('unknown');
  });
  it('쓰기는 산 것만, 갈래마다 하나, 벗기 · 그림 정보', () => {
    const S = base(); S.coins = 100;
    expect(wearItem(S, 'hat_cap')).toBe(false);
    buyItem(S, 'hat_cap'); buyItem(S, 'hat_straw'); buyItem(S, 'bg_sky');
    wearItem(S, 'hat_cap'); wearItem(S, 'hat_straw'); wearItem(S, 'bg_sky');
    expect(S.items.wear).toEqual({ hat: 'hat_straw', bg: 'bg_sky' });
    expect(wearLook(S)).toMatchObject({ hat: '👒', bg: [178, 214, 238] });
    takeOff(S, 'hat');
    expect(wearLook(S).hat).toBeFalsy();
  });
  it('꾸미기는 경험치·체력·능력치를 바꾸지 않음', () => {
    const S = base(); S.coins = 50; const pet = JSON.stringify(S.pet);
    buyItem(S, 'outfit_red'); wearItem(S, 'outfit_red');
    expect(JSON.stringify(S.pet)).toBe(pet);
  });
});

describe('처음부터 다시 시작', () => {
  it('도감·꾸미기(쓰던 것 포함)·코인은 남고, 튼튼몬·경험치·기록·기념일은 새로', () => {
    const S = base(); S.coins = 30; S.pet.xp = 950; ex(S, D0, 30);
    buyItem(S, 'hat_cap'); wearItem(S, 'hat_cap'); celebrate(S, D0, { id: 'day7', item: 'hat_ribbon' });
    const keep = keepOnRestart(S);
    const T = applyKeep(newState(newPet('새알', statsFromInputs(F({ cardio: 1 })), addDay(D0, 3)), addDay(D0, 3)), JSON.parse(JSON.stringify(keep)));
    expect(T.coins).toBe(S.coins);
    expect(T.items).toEqual({ owned: ['hat_cap', 'hat_ribbon'], wear: { hat: 'hat_cap' } });
    expect(T.dex).toEqual(expect.arrayContaining([...S.dex, `0-${T.pet.line}`]));
    expect(new Set(T.dex).size).toBe(T.dex.length);
    expect(T.pet).toMatchObject({ xp: 0, name: '새알' });
    expect(T.logs).toEqual({});
    expect(T.anniv).toEqual({});
  });
  it('남길 것이 없으면 그대로', () => {
    const T = base();
    expect(applyKeep(T, null)).toBe(T);
    expect(keepOnRestart(null)).toBeNull();
  });
});

describe('기념일', () => {
  it(`DAY ${ANNIVERSARY_DAYS.join('·')} 기념일 — 지나간 것도 늦게 챙김, 한 번만`, () => {
    const S = base();
    expect(pendingAnniversaries(S, addDay(D0, 5))).toEqual([]);
    const p = pendingAnniversaries(S, addDay(D0, 6)); // DAY 7
    expect(p.map(a => a.id)).toEqual(['day7']);
    expect(celebrate(S, addDay(D0, 6), p[0])).toBe(true);
    expect(celebrate(S, addDay(D0, 6), p[0])).toBe(false);
    expect(S.items.owned).toContain(ANNIVERSARY_GIFTS.day[7]);
    expect(pendingAnniversaries(S, addDay(D0, 40)).map(a => a.id)).toEqual(['day30']);
  });
  it('연속 기록 7일 기념일 → 한정 꾸미기', () => {
    const S = base();
    for (let i = 0; i < 7; i++) { const Q = todayQuests(S, addDay(D0, i)); completeQuest(S, addDay(D0, i), Q.ids[0], questOf(Q.ids[0]).verify); }
    evaluate(S, addDay(D0, 6));
    const p = pendingAnniversaries(S, addDay(D0, 6));
    expect(p.map(a => a.id)).toEqual(['day7', 'streak7']);
    p.forEach(a => celebrate(S, addDay(D0, 6), a));
    expect(S.items.owned).toEqual(expect.arrayContaining([ANNIVERSARY_GIFTS.day[7], ANNIVERSARY_GIFTS.streak[7]]));
    expect(wearItem(S, ANNIVERSARY_GIFTS.streak[7])).toBe(true);
  });
  it('기념일 선물은 모두 아이템 목록의 한정 아이템', () => {
    [...Object.values(ANNIVERSARY_GIFTS.day), ...Object.values(ANNIVERSARY_GIFTS.streak)].forEach(id => expect(itemOf(id)).toMatchObject({ limited: true }));
  });
});

describe('감정 표현', () => {
  it('상황마다 대사 2개 이상, 표정은 cheer/normal', () => {
    ['morning', 'late_night', 'resting', 'quest_one', 'balanced_meal', 'rainbow', 'ex_60', 'comeback', 'low_hp', 'indoor_ex'].forEach(k => expect(DIALOGUES[k].lines.length).toBeGreaterThanOrEqual(2));
    Object.values(DIALOGUES).forEach(D => expect(['cheer', 'normal']).toContain(D.face));
  });
  it('건강 원칙: 몸무게·체형·외모·굶기 말 없음', () => {
    Object.values(DIALOGUES).flatMap(D => D.lines).forEach(t => expect(t).not.toMatch(/다이어트|체중|몸무게|칼로리|굶|덜 먹|살 ?빼|날씬|뚱뚱|몸매|외모|일째 잠/));
  });
  it('말투: 모든 문장이 "~요" 로 끝남', () => {
    Object.values(DIALOGUES).flatMap(D => D.lines).forEach(t => t.split(/[.!?…]+/).map(x => x.trim()).filter(Boolean)
      .forEach(sentence => expect(sentence, t).toMatch(/요$/)));
  });
  it('여러 대사 중 무작위 · 같은 날은 같은 대사', () => {
    expect(pickLine('rainbow', () => 0).text).toBe(DIALOGUES.rainbow.lines[0]);
    expect(pickLine('rainbow', () => 0.99).text).toBe(DIALOGUES.rainbow.lines.at(-1));
    expect(pickLine('low_hp', dayRnd(D0)).text).toBe(pickLine('low_hp', dayRnd(D0)).text);
    expect(pickLine('없는 상황')).toBeNull();
  });
  it('인사: 아침 첫 접속 · 그날 두 번째는 없음 · 3일 만이면 반겨 주기', () => {
    const S = base(); S.lastOpen = null;
    expect(greeting(S, D0, 8)).toBe('morning');
    expect(greeting(S, D0, 9)).toBeNull();
    expect(greeting(S, addDay(D0, 1), 15)).toBe('hello');
    expect(greeting(S, addDay(D0, 4), 8)).toBe('comeback');
    expect(greeting(S, addDay(D0, 5), 2)).toBe('late_night');
    expect(greeting(S, addDay(D0, 6), 5)).toBe('morning');
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
    expect(S.v).toBe(SAVE_VERSION);
    expect(S.coins).toBe(0);
    expect(S.pet.sleeping).toBe(false);
    expect(S.pet).not.toHaveProperty('alive');
    expect(S.passes).toEqual({ exam: [], sick: [] });
    expect(S.pet.line).toBe('wind');
    expect(stageOf(S.pet.xp)).toBe(2); // 예전 꼬마 → 지금도 꼬마
    expect(S.logs[D0].ex[0]).toMatchObject({ kind: '맨몸 근력', cat: 'strength' });
    expect(S.logs[D0].meals[0]).toMatchObject({ groups: ['곡류', '단백질', '채소'], drink: '물' });
  });
  it('예전 단계 그대로', () => {
    [[0, 0], [14, 0], [15, 1], [59, 1], [140, 3], [260, 4], [420, 5], [500, 5]].forEach(([x, st]) => expect(stageOf(migrateXp(x))).toBe(st));
    expect(migrateXp(15)).toBe(STAGES[1][0]);
  });
  it('v2 소멸 데이터 → v3 잠듦 (경험치·기록 그대로)', () => {
    const v2 = { v: 2, offset: 0, lastEval: addDay(D0, 3), rest: {}, weeks: {}, logs: { [D0]: { ex: [], meals: [], bonus: {} } },
      pet: { name: '몬', line: 'wind', branch: null, height: 160, stats: {}, base: {}, train: {}, hp: 0, xp: 300, alive: false, born: D0, diedOn: addDay(D0, 2) } };
    const S = migrate(v2);
    expect(S.v).toBe(SAVE_VERSION);
    expect(S.pet).toMatchObject({ sleeping: true, hp: 0, xp: 300 });
    expect(S.pet).not.toHaveProperty('alive');
    expect(S.pet).not.toHaveProperty('diedOn');
    expect(S.logs[D0]).toBeTruthy();
    evaluate(S, addDay(D0, 6)); // 그동안 밀린 날도 벌칙 없이 정산
    expect(S.pet.hp).toBe(0);
    expect(ex(S, addDay(D0, 6), 10).woke).toBe(true);
  });
  it('v2 살아 있던 데이터 → 깨어 있음', () => {
    const S = migrate({ v: 2, lastEval: D0, logs: {}, rest: {}, pet: { hp: 40, xp: 10, alive: true } });
    expect(S.pet).toMatchObject({ sleeping: false, hp: 40 });
  });
  it('v3 → v4: 코인 칸 추가, 나머지 그대로', () => {
    const S = migrate({ v: 3, lastEval: D0, logs: {}, rest: {}, passes: { exam: [], sick: [D0] }, pet: { hp: 40, xp: 10, sleeping: false } });
    expect(S).toMatchObject({ coins: 0, passes: { sick: [D0] } });
  });
  it('v4 → v5: 도감은 지금까지 거쳐 온 모습으로 채움, 코인 그대로', () => {
    const S = migrate({ v: 4, coins: 7, lastEval: D0, logs: {}, rest: {}, passes: { exam: [], sick: [] }, pet: { line: 'rock', branch: 'spark', xp: 1000, hp: 50, sleeping: false, born: D0 } });
    expect(S).toMatchObject({ v: 5, coins: 7, items: { owned: [], wear: {} }, anniv: {} });
    expect(S.dex).toEqual(['0-rock', '1-rock', '2-rock', '3-rock', '4-spark']);
  });
  it('모르는 버전은 버림', () => {
    expect(migrate({ v: 9, pet: {} })).toBeNull();
    expect(migrate(null)).toBeNull();
  });
});

describe('저장', () => {
  const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };
  it('다시 시작 보관함: 튼튼몬 저장을 지워도 남고, 비우면 사라짐', () => {
    const st = mem(); const S = base(); S.coins = 9;
    save(S, st);
    saveKeep(keepOnRestart(S), st); clear(st);
    expect(load(st)).toBeNull();
    expect(loadKeep(st)).toMatchObject({ coins: 9 });
    saveKeep(null, st);
    expect(loadKeep(st)).toBeNull();
  });
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
it('config/game.js 숫자가 지시서 Phase 1 초기값과 같음', async () => {
  const C = await import('../src/config/game.js');
  expect(C).toMatchObject({ WAKE_UP_HP: 30, LOW_HP_WARN: 20, EXAM_REST_MAX_DAYS: 7, EXAM_REST_PER_TERM: 2, SICK_REST_PER_MONTH: 3 });
  expect(C).toMatchObject({ QUESTS_PER_DAY: 3, QUEST_COIN: { tap: 1, photo: 3 }, DAILY_ALL_CLEAR_BONUS: 3 });
});
