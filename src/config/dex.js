// 도감 설명. 칸 설명 = "<계통> 계통 <단계> — <계통 특징>". 한 칸만 따로 쓰고 싶으면 DEX_TEXT 에 '단계-계통' 으로 적는다.
// 나중에 합체 진화(Phase 4) 혼합종은 DEX_PAGES 에 쪽을 더한다.

export const DEX_PAGES = [{ id: 'solo', title: '튼튼몬' }];

export const STAGE_LABEL = ['알', '아기', '꼬마', '청소년', '어른', '챔피언'];

export const LINE_TRAIT = {
  wind: '오래 달려도 지치지 않아요',
  rock: '무거운 것도 번쩍 들어요',
  flower: '몸이 말랑말랑 부드러워요',
  spark: '번개처럼 빠르게 튀어 나가요',
  light: '모든 체력이 고르게 튼튼해요',
};

/** 칸별 설명 바꾸기 — 예: '4-wind': '하늘을 나는 심폐 계통 어른이에요' */
export const DEX_TEXT = {
  '0-wind': '바람 알 — 알 속에서 바람 소리가 들려요',
  '0-rock': '바위 알 — 단단하고 묵직한 알이에요',
  '0-flower': '꽃 알 — 은은한 꽃 향기가 나요',
  '0-spark': '별 알 — 가끔 반짝 빛나요',
  '0-light': '빛 알 — 따뜻한 빛이 감돌아요',
};
