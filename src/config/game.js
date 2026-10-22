// 고도화(TUNTUN_PLAN)로 새로 넣는 숫자를 모으는 곳. 바꾸면 CLAUDE.md 2장도 같이 고친다.
// 기존 점수식(운동 경험치·식단 점수·체력 정산·진화) 숫자는 src/game.js 의 RULES 에 그대로 있다.

/* ---------- Phase 1. 잠듦 · 휴식권 ---------- */
export const WAKE_UP_HP = 30;          // 잠든 튼튼몬이 깨어날 때 체력 (그 인증의 체력 증가는 따로 더함)
export const LOW_HP_WARN = 20;         // 체력이 이만큼 이하면 "같이 움직이자" 알림
export const EXAM_REST_MAX_DAYS = 7;   // 시험기간 휴식권 한 번에 최대 며칠
export const EXAM_REST_PER_TERM = 2;   // 학기마다 몇 번 (중간고사·기말고사)
export const SICK_REST_PER_MONTH = 3;  // 아픈 날 휴식권 한 달에 몇 번
/** 학기 나누기: 3~8월 1학기, 9월~다음 해 2월 2학기 */
export const TERM1_MONTHS = [3, 8];

/* ---------- Phase 2. 오늘의 퀘스트 · 코인 (경험치·체력·진화·랭킹과 따로) ---------- */
export const QUESTS_PER_DAY = 3;          // 하루에 뽑는 퀘스트 수 (퀘스트 목록은 config/quests.js)
export const QUEST_COIN = { tap: 1, photo: 3 }; // 인증 방식별 기본 코인 (퀘스트에 coin 이 있으면 그 값)
export const DAILY_ALL_CLEAR_BONUS = 3;   // 하루 퀘스트를 모두 끝내면 보너스 코인
export const QUEST_CHEER_MS = 1800;       // 퀘스트 끝냈을 때 튼튼몬이 기뻐하는 시간(ms)
