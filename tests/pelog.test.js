import { describe, it, expect } from 'vitest';
import { readCode, makeCode, codeError, measuredText } from '../src/pelog.js';

// PELOG_LINK_FORMAT.md 6장의 예시 코드 그대로
const EXAMPLES = [
  ['ABSH-SU4', { cardio: 2, strength: 3, flex: 1, power: 4 }, '2026-04-15'],
  ['A6MG-QSW', { cardio: 1, strength: 1, flex: 1, power: 1 }, '2026-09-21'],
  ['A4H2-HWP', { cardio: null, strength: 3, flex: 5, power: 2 }, '2025-10-01'],
  ['ARZ9-JYX', { cardio: 5, strength: 5, flex: 5, power: 5 }, '2027-03-10'],
  ['ADHD-QGM', { cardio: 3, strength: null, flex: null, power: null }, '2024-01-01'],
  ['AJZV-VFQ', { cardio: 4, strength: 2, flex: 3, power: 3 }, '2068-11-08'],
];

describe('PE LOG 연동 코드 읽기', () => {
  it.each(EXAMPLES)('문서 예시 %s → 등급 4개 · 측정일', (code, grades, date) => {
    expect(readCode(code)).toEqual({ ok: true, version: 1, date, grades });
  });
  it.each(EXAMPLES)('만들기 → 같은 코드 (%s)', (code, grades, date) => {
    expect(makeCode({ ...grades, date })).toBe(code);
  });
  it('소문자 · 띄어쓰기 · 하이픈 없어도 읽힘', () => {
    ['absh-su4', 'ABSHSU4', ' absh su4 ', 'AB SH-SU 4'].forEach(t => expect(readCode(t).ok).toBe(true));
  });
  it('한 글자 오타 · 이웃 글자 바뀜은 모두 잡힘 (문서 예시 전부)', () => {
    const AL = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    EXAMPLES.forEach(([code]) => {
      const s = code.replace('-', '');
      for (let i = 0; i < 7; i++) for (const ch of AL) if (ch !== s[i]) expect(readCode(s.slice(0, i) + ch + s.slice(i + 1)).ok).toBe(false);
      for (let i = 0; i < 6; i++) if (s[i] !== s[i + 1]) expect(readCode(s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2)).ok).toBe(false);
    });
  });
  it('막아야 하는 입력과 이유', () => {
    expect(readCode('ABSH-SU5').reason).toBe('check');
    expect(readCode('ABHS-SU4').reason).toBe('check');
    expect(readCode('AO2B-34C').reason).toBe('confusable');
    expect(readCode('A3K').reason).toBe('length');
    expect(readCode('').reason).toBe('length');
    expect(readCode(null).reason).toBe('length');
    expect(readCode('2222-222').reason).toBe('version');
    expect(readCode('https://example.com/?c=ABSH-SU4').ok).toBe(false); // 주소 형태는 받지 않음
  });
  it('안내 문구: 오타면 0/O · 1/I 안내, 버전이면 새로 고침, QR이면 다른 QR 안내', () => {
    ['check', 'confusable', 'char', 'range'].forEach(r => expect(codeError(r)).toBe('코드를 다시 확인해 주세요. 0과 O, 1과 I는 쓰지 않아요.'));
    expect(codeError('length')).toContain('7글자');
    expect(codeError('length')).toContain('0과 O, 1과 I는 쓰지 않아요');
    expect(codeError('version')).toContain('새로 고친');
    expect(codeError('check', true)).toContain('QR이 아니에요');
  });
  it('측정일 글', () => {
    expect(measuredText('2026-04-15')).toBe('2026년 4월 15일 측정 기록이에요');
    expect(measuredText('2025-10-01')).toBe('2025년 10월 1일 측정 기록이에요');
  });
});
