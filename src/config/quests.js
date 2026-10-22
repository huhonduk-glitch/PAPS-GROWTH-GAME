// 오늘의 퀘스트 목록. 선생님이 직접 더하고 고쳐도 되는 곳.
// { id: 겹치지 않는 영어 이름, title: 화면 글, category: 'exercise'|'diet'|'health', verify: 'tap'|'photo', coin?: 코인(없으면 인증 방식 기본값) }
// 지킬 것: 체중 감량 · 굶기 · 식사량 줄이기 · 몸매 · 외모 퀘스트는 넣지 않는다. 사진 퀘스트는 사진을 저장하지 않는다(찍은 시각만).

/** 갈래: 하루 퀘스트는 갈래마다 하나씩 뽑는다 */
export const QUEST_CATEGORIES = { exercise: '운동', diet: '식단', health: '생활' };

export const QUESTS = [
  // 운동
  { id: 'stretch_3', title: '스트레칭 3분', category: 'exercise', verify: 'tap' },
  { id: 'stairs', title: '엘리베이터 대신 계단 오르기', category: 'exercise', verify: 'tap' },
  { id: 'jump_rope_100', title: '줄넘기 100번', category: 'exercise', verify: 'tap' },
  { id: 'walk_10', title: '10분 걷기', category: 'exercise', verify: 'tap' },
  { id: 'squat_20', title: '스쿼트 20번', category: 'exercise', verify: 'tap' },
  { id: 'plank_30s', title: '플랭크 30초 버티기', category: 'exercise', verify: 'tap' },
  { id: 'exercise_place', title: '오늘 운동한 곳 사진 찍기', category: 'exercise', verify: 'photo' },
  { id: 'lunch_walk', title: '점심시간에 운동장이나 복도 10분 걷기', category: 'exercise', verify: 'tap' },
  // 식단
  { id: 'breakfast', title: '아침 챙겨 먹기', category: 'diet', verify: 'tap' },
  { id: 'veggie_lunch', title: '점심에 채소 먹기', category: 'diet', verify: 'photo' },
  { id: 'fruit', title: '과일 한 번 먹기', category: 'diet', verify: 'tap' },
  { id: 'milk', title: '우유나 요구르트 먹기', category: 'diet', verify: 'tap' },
  { id: 'protein', title: '고기·생선·달걀·콩 반찬 먹기', category: 'diet', verify: 'tap' },
  { id: 'colorful_plate', title: '여러 색 반찬이 있는 한 끼 찍기', category: 'diet', verify: 'photo' },
  // 생활
  { id: 'water_1', title: '물 한 컵 마시기', category: 'health', verify: 'tap' },
  { id: 'phone_down', title: '어젯밤 자기 전 30분 휴대폰 내려놓았어요', category: 'health', verify: 'tap' },
  { id: 'stand_up', title: '공부하다 일어나 몸 펴기 3번', category: 'health', verify: 'tap' },
  { id: 'sunlight', title: '햇볕 쬐며 5분 쉬기', category: 'health', verify: 'tap' },
  { id: 'brush_teeth', title: '점심 먹고 양치하기', category: 'health', verify: 'tap' },
  { id: 'water_break', title: '쉬는 시간에 물 마시기', category: 'health', verify: 'tap' },
  { id: 'sky_photo', title: '밖에 나가 하늘 사진 찍기', category: 'health', verify: 'photo' },
];
