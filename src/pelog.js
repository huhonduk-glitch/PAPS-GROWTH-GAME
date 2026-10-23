// PE LOG 연동 코드 v1 읽기 (형식: PELOG_LINK_FORMAT.md). 화면·카메라 코드 없음 — main.js 가 씀.
// 코드에는 등급 4개 · 측정일 · 버전 · 체크값만 있다 (이름·학번·성별·측정값 없음).

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31자: 0 1 I L O 없음
const BASE = 31;                    // 소수 → 체크값이 한 글자 오타·이웃 글자 바뀜을 모두 잡음
const VERSION = 1;
const EPOCH = Date.UTC(2024, 0, 1); // 날짜 0 = 2024-01-01
const DAY_MS = 86400000;
const DAYS = 16384;                 // 2024-01-01 ~ 2068-11-08

const dayIndex = ymd => { const [y, m, d] = ymd.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY_MS); };
const fromDayIndex = n => new Date(EPOCH + n * DAY_MS).toISOString().slice(0, 10);
/** 체크값: 1~7번째 글자 값 × 자리 번호(1~7)의 합이 31로 나누어떨어지게 */
const checkValue = vals => { const s = vals.reduce((a, v, i) => a + (i + 1) * v, 0) % BASE; return ((BASE - s) * 9) % BASE; }; // 9 = 7의 역수 (mod 31)

/** 코드 만들기 (PE LOG 쪽 기능 — 튼튼몬에서는 테스트에만 씀). 등급은 1~5, 측정 안 했으면 null */
export function makeCode({ cardio, strength, flex, power, date }) {
  const g = [cardio, strength, flex, power].map(x => (x === null || x === undefined || x === '' ? 0 : Number(x)));
  if (g.some(x => !Number.isInteger(x) || x < 0 || x > 5)) throw new Error('등급은 1~5 또는 빈칸');
  if (g.every(x => x === 0)) throw new Error('등급이 하나도 없어요');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || fromDayIndex(dayIndex(date)) !== date) throw new Error('날짜 형식: YYYY-MM-DD');
  const d = dayIndex(date);
  if (d < 0 || d >= DAYS) throw new Error('날짜 범위: 2024-01-01 ~ 2068-11-08');
  let n = (((g[0] * 6 + g[1]) * 6 + g[2]) * 6 + g[3]) * DAYS + d;
  const body = [];
  for (let i = 0; i < 5; i++) { body.unshift(n % BASE); n = Math.floor(n / BASE); }
  const vals = [7 + VERSION, ...body];
  vals.push(checkValue(vals));
  const s = vals.map(v => ALPHABET[v]).join('');
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** 코드 읽기. 결과 {ok:true, version, date, grades:{cardio,strength,flex,power}} 또는 {ok:false, reason} */
export function readCode(text) {
  const s = String(text || '').toUpperCase().replace(/[\s-]/g, '');
  if (/[01ILO]/.test(s)) return { ok: false, reason: 'confusable' }; // 코드에 없는 글자
  if (s.length !== 7) return { ok: false, reason: 'length' };
  const vals = [...s].map(c => ALPHABET.indexOf(c));
  if (vals.some(v => v < 0)) return { ok: false, reason: 'char' };
  if (vals.reduce((a, v, i) => a + (i + 1) * v, 0) % BASE !== 0) return { ok: false, reason: 'check' };
  const version = vals[0] - 7;
  if (version !== VERSION) return { ok: false, reason: 'version' };
  let n = 0;
  for (const v of vals.slice(1, 6)) n = n * BASE + v;
  const d = n % DAYS;
  let gi = Math.floor(n / DAYS);
  if (gi > 1295) return { ok: false, reason: 'range' };
  const g = [];
  for (let i = 0; i < 4; i++) { g.unshift(gi % 6); gi = Math.floor(gi / 6); }
  if (g.every(x => x === 0)) return { ok: false, reason: 'range' };
  const grade = x => x || null;
  return { ok: true, version, date: fromDayIndex(d), grades: { cardio: grade(g[0]), strength: grade(g[1]), flex: grade(g[2]), power: grade(g[3]) } };
}

const CHECK_AGAIN = '코드를 다시 확인해 주세요. 0과 O, 1과 I는 쓰지 않아요.';
/** 못 읽었을 때 학생에게 보여 줄 말. fromQr = QR 로 읽었을 때 */
export function codeError(reason, fromQr = false) {
  if (fromQr && reason !== 'version') return '튼튼몬 연동 코드 QR이 아니에요. 선생님께 받은 QR을 찍어 주세요.';
  if (reason === 'version') return '튼튼몬 앱을 새로 고친 뒤 다시 넣어 주세요.';
  if (reason === 'length') return `코드는 7글자예요 (예: ABSH-SU4). ${CHECK_AGAIN}`;
  return CHECK_AGAIN;
}

/** '2026-04-15' → '2026년 4월 15일 측정 기록이에요' */
export function measuredText(date) {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일 측정 기록이에요`;
}
