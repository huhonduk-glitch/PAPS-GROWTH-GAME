// 체험용 버튼("하루 넘기기" · "처음부터 다시")은 주소 끝에 ?demo 가 있을 때만 보인다 (학생 화면에서는 숨김).

/** 주소 검색 부분(location.search)에 demo 가 있으면 체험 모드. '?demo', '?demo=1', '?a=1&demo' 모두 */
export const isDemo = (search = '') => new URLSearchParams(search).has('demo');

/** 체험 버튼을 보일지: 튼튼몬이 있고 체험 모드일 때만 */
export const showDemoButtons = (hasPet, search) => !!hasPet && isDemo(search);
