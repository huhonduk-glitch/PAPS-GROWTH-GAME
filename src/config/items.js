// 꾸미기 아이템 목록. 선생님이 직접 더하고 고쳐도 되는 곳.
// { id, name, category: 'hat'|'prop'|'bg'|'outfit', price: 코인 (기념일 한정은 null), icon: 이모지, color?: [r,g,b] (배경·운동복), limited?: true }
// - 모자·소품은 이모지로 머리 위·옆에 얹는다 (나중에 그림으로 바꿔도 됨). 배경·운동복은 color 로 칠한다.
// - 지킬 것: 체형을 바꾸는 아이템(살 빼기·근육 키우기 등)은 만들지 않는다. 꾸미기는 얹기만 한다.

export const ITEM_CATEGORIES = { hat: '모자', prop: '소품', bg: '배경', outfit: '운동복' };

export const ITEMS = [
  // 모자
  { id: 'hat_cap', name: '운동 모자', category: 'hat', price: 5, icon: '🧢' },
  { id: 'hat_straw', name: '밀짚모자', category: 'hat', price: 6, icon: '👒' },
  { id: 'hat_safety', name: '안전모', category: 'hat', price: 8, icon: '⛑️' },
  { id: 'hat_grad', name: '학사모', category: 'hat', price: 12, icon: '🎓' },
  // 소품
  { id: 'prop_soccer', name: '축구공', category: 'prop', price: 5, icon: '⚽' },
  { id: 'prop_basket', name: '농구공', category: 'prop', price: 5, icon: '🏀' },
  { id: 'prop_badminton', name: '배드민턴 라켓', category: 'prop', price: 6, icon: '🏸' },
  { id: 'prop_kite', name: '연', category: 'prop', price: 8, icon: '🪁' },
  // 배경
  { id: 'bg_sky', name: '맑은 하늘', category: 'bg', price: 6, icon: '🌤️', color: [178, 214, 238] },
  { id: 'bg_forest', name: '숲속', category: 'bg', price: 6, icon: '🌳', color: [164, 206, 150] },
  { id: 'bg_sunset', name: '노을', category: 'bg', price: 8, icon: '🌇', color: [250, 200, 166] },
  { id: 'bg_blossom', name: '벚꽃', category: 'bg', price: 8, icon: '🌸', color: [246, 210, 222] },
  // 운동복
  { id: 'outfit_red', name: '빨간 운동복', category: 'outfit', price: 6, icon: '🔴', color: [232, 104, 104] },
  { id: 'outfit_blue', name: '파란 운동복', category: 'outfit', price: 6, icon: '🔵', color: [100, 144, 228] },
  { id: 'outfit_green', name: '초록 운동복', category: 'outfit', price: 6, icon: '🟢', color: [104, 186, 122] },
  { id: 'outfit_black', name: '검은 운동복', category: 'outfit', price: 7, icon: '⚫', color: [74, 78, 92] },
  // 기념일 한정 (상점에서는 못 사고 기념일에 받음 — config/game.js 의 ANNIVERSARY_GIFTS)
  { id: 'hat_ribbon', name: '7일 기념 리본', category: 'hat', price: null, icon: '🎀', limited: true },
  { id: 'prop_trophy', name: '30일 기념 트로피', category: 'prop', price: null, icon: '🏆', limited: true },
  { id: 'bg_gold', name: '50일 기념 금빛 배경', category: 'bg', price: null, icon: '✨', color: [250, 228, 160], limited: true },
  { id: 'prop_cake', name: '100일 기념 케이크', category: 'prop', price: null, icon: '🎂', limited: true },
  { id: 'outfit_gold', name: '연속 7일 금빛 운동복', category: 'outfit', price: null, icon: '🟡', color: [246, 200, 70], limited: true },
  { id: 'hat_star', name: '연속 30일 별 머리띠', category: 'hat', price: null, icon: '🌟', limited: true },
];
