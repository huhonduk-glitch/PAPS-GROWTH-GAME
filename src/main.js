// 화면: 버튼 연결 · 그리기 반복 · 저장. 게임 계산은 game.js, 그림은 draw.js.
import './style.css';
import {
  STAGES, LINES, STAT_KEYS, STAT_NAMES, EX_KINDS, CAT_NAMES, INTENSITY, PROOFS, SLOTS, PLACES, GROUPS, GROUP_KEYS, DRINKS,
  SCHOOL_LUNCH, SPECIES, RULES, clamp, addDay, daysBetween, todayKey, keyOf, fromMin, stageOf, kindOf, exMinutes, cappedMinutes,
  balancedCount, dayGroups, statsFromInputs, lineFromStats, branchFromTraining, speciesName, newPet, newState, evaluate,
  certExercise, certMeal, weekId, weekCounts, weekMissions, remeasure,
  restPassOn, passesLeft, useSickPass, useExamPass, cancelExamPass,
  questOf, questCoin, todayQuests, completeQuest, dayStreak,
  dexEntries, itemOf, buyItem, wearItem, takeOff, wearLook, pendingAnniversaries, celebrate, pickLine, dayRnd, greeting,
  keepOnRestart, applyKeep,
} from './game.js';
import { LOW_HP_WARN, EXAM_REST_MAX_DAYS, DAILY_ALL_CLEAR_BONUS, QUEST_CHEER_MS } from './config/game.js';
import { ITEMS, ITEM_CATEGORIES } from './config/items.js';
import { INDOOR_KINDS } from './config/dialogues.js';
import { STAGE_LABEL } from './config/dex.js';
import { draw } from './draw.js';
import { load, save as store, clear, saveKeep, loadKeep } from './storage.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let S = load();
const sel = {
  ex: '달리기', int: 2, warm: false, proof: 'self',
  slot: '점심', place: '집밥', groups: new Set(SCHOOL_LUNCH), drink: '물',
};
const photos = { ex: null, meal: null }; // {data, ok}
let pendingOffset = 0;
let setupMode = 'new'; // 'new' | 'remeasure'

const today = () => todayKey(S ? S.offset : 0);
/** 실제 시각(분). 체험용으로 날을 넘긴 동안은 시각 검사를 하지 않음 */
const nowMin = () => (S && S.offset ? null : new Date().getHours() * 60 + new Date().getMinutes());
function save() { if (!store(S)) toast('이 브라우저에서는 저장이 안 돼요. 창을 닫으면 사라져요.'); }

/* ---------- 만들기 · 다시 재기 ---------- */
function formInputs() {
  const g = id => Number($(id).value);
  return { cardio: g('sCardio'), strength: g('sStr'), flex: g('sFlex'), power: g('sPow'), height: parseFloat($('sH').value), weight: parseFloat($('sW').value), muscle: parseFloat($('sM').value) };
}
function renderLineBox() {
  const st = statsFromInputs(formInputs()), line = lineFromStats(st), L = LINES[line];
  const top = STAT_KEYS.reduce((a, k) => (st[k] > st[a] ? k : a), STAT_KEYS[0]);
  const why = line === 'light' ? '체력이 고르게 좋아요' : `가장 강한 체력: ${STAT_NAMES[top]} ${st[top]}`;
  const ratio = st.muscleRatio === null ? '' : `<div class="hint">근육 비율 ${(st.muscleRatio * 100).toFixed(0)}% → 근력 능력치에 반영</div>`;
  const bars = STAT_KEYS.map(k => `<span>${STAT_NAMES[k]}</span><span class="bar"><i style="width:${st[k] / 1.5}%"></i></span><span>${st[k]}</span>`).join('');
  const now = setupMode === 'remeasure' && S ? `<div class="hint">계통은 처음 그대로(${LINES[S.pet.line].n}). 운동으로 오른 능력치는 남고, 기준값만 새로 바뀌어요.</div>` : '';
  $('lineBox').innerHTML = `<div class="ln"><span class="sw" style="background:rgb(${L.c})"></span>${L.n} 계통</div><div>${L.desc} · ${why}</div>${ratio}<div class="mini">${bars}</div>${now}`;
}
function openSetup(mode) {
  setupMode = mode;
  $('setupTitle').textContent = mode === 'new' ? '내 튼튼몬 만들기' : 'PAPS·인바디 다시 넣기';
  $('nameRow').hidden = mode !== 'new';
  $('bCreate').textContent = mode === 'new' ? '알 받기' : '새 기록으로 바꾸기';
  $('bSetupCancel').hidden = mode === 'new';
  closePanels(); $('setup').hidden = false; renderLineBox();
  if (mode !== 'new') $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 운동 인증 ---------- */
function exInput() {
  const k = kindOf(sel.ex), num = id => (($(id) || {}).value ? Number($(id).value) : 0);
  const amount = k.m === 'km' ? { km: num('amKm') } : k.m === 'steps' ? { steps: num('amSteps') } : k.m === 'count' ? { count: num('amCount') } : k.m === 'reps' ? { sets: num('amSets'), reps: num('amReps') } : {};
  return {
    kind: sel.ex, min: parseInt($('exMin').value), int: sel.int, start: $('exStart').value || null, amount, warm: sel.warm,
    proof: sel.proof, photo: photos.ex ? photos.ex.data : null, photoOk: photos.ex ? photos.ex.ok : false,
  };
}
const EX_FAIL = {
  short: `${RULES.exMinCert}분 이상부터 인증할 수 있어요.`,
  photo: '이 인증 방법은 사진이 있어야 해요.',
  overlap: '이미 인증한 운동과 시간이 겹쳐요.',
  future: '아직 안 끝난 운동이에요. 끝나고 인증해 주세요.',
  late: '자정을 넘기는 운동은 오늘 끝난 부분까지만 적어 주세요.',
};
function renderExAmount() {
  const k = kindOf(sel.ex), box = $('exAmount');
  const field = (id, label, ph) => `<label>${label}<input id="${id}" type="number" inputmode="decimal" min="0" placeholder="${ph}"></label>`;
  box.innerHTML = k.m === 'km' ? field('amKm', '거리 (km, 선택)', '예: 3.5')
    : k.m === 'steps' ? field('amSteps', '걸음 수 (선택)', '예: 4000')
      : k.m === 'count' ? field('amCount', '횟수 (선택)', '예: 500')
        : k.m === 'reps' ? field('amSets', '세트 (선택)', '예: 3') + field('amReps', '세트당 횟수', '예: 12') : '';
  box.hidden = !box.innerHTML;
  box.querySelectorAll('input').forEach(i => i.addEventListener('input', renderExCalc));
  $('exKindHint').textContent = `${CAT_NAMES[k.cat]} 운동${k.cat === 'sport' ? ' (심폐·순발 반씩)' : ''}${k.hint ? ' · ' + k.hint : ''}${k.m !== 'none' ? ' · 기록을 적으면 +10%' : ''}`;
}
function renderExCalc() {
  if (!S) return;
  const e = exInput();
  $('exPhotoRow').hidden = sel.proof === 'self';
  const T = structuredClone(S), r = certExercise(T, today(), e, nowMin());
  const L = S.logs[today()], used = cappedMinutes(L);
  let h;
  if (!r.ok) h = `<span class="warn">${EX_FAIL[r.reason]}</span>`;
  else {
    h = `예상: <b>경험치 +${r.gain}</b> · 체력 +${Math.round(r.counted / 6)} · 점수에 들어가는 시간 ${r.counted}분`;
    if (r.parts.length) h += ` <span class="hint">(${r.parts.join(' · ')})</span>`;
    if (r.flag) h += `<br><span class="warn">확인 필요: ${esc(r.flag)} → 보너스 없이 받아요</span>`;
    if (r.counted < r.min) h += `<br><span class="hint">오늘 이미 ${used}분 — 하루 ${RULES.exDailyCap}분까지만 점수예요</span>`;
    if (photos.ex && !photos.ex.ok) h += '<br><span class="hint">오늘 찍은 사진이 아니라서 사진 보너스는 없어요</span>';
  }
  $('exCalc').innerHTML = h;
}
function onCertEx() {
  const e = exInput();
  const r = certExercise(S, today(), e, nowMin());
  if (!r.ok) { toast(EX_FAIL[r.reason]); return; }
  save(); closePanels(); render();
  if (r.woke) welcome();
  else if (r.grew) grewSay();
  else if (r.counted === 0) say(`오늘은 ${RULES.exDailyCap}분을 다 채웠어요. 이제 푹 쉬어요.`);
  else if (r.flag) say(`${sel.ex} ${r.min}분 인증! 경험치 +${r.gain} (확인 필요)`);
  else if (r.parts.includes(`하루 ${RULES.exGoalPlus}분`)) sayLine('ex_60', ` 경험치 +${r.gain}`);
  else if (INDOOR_KINDS.includes(sel.ex)) sayLine('indoor_ex', ` 경험치 +${r.gain}`);
  else say(`${sel.ex} ${r.min}분 인증! 경험치 +${r.gain}`);
  photos.ex = null; $('exPrev').hidden = true; $('exPhoto').value = '';
}
let startTouched = false;
function openEx() {
  const n = nowMin();
  const mins = parseInt($('exMin').value) || 30;
  if (n !== null) $('exStart').value = fromMin(Math.max(0, n - mins));
  startTouched = false;
  renderExAmount(); openPanel('exPanel'); renderExCalc();
}

/* ---------- 식단 인증 ---------- */
function mealInput() {
  return { slot: sel.slot, place: sel.place, groups: sel.groups, drink: sel.drink, photo: photos.meal ? photos.meal.data : null, photoOk: photos.meal ? photos.meal.ok : false };
}
function renderMealCalc() {
  if (!S) return;
  const T = structuredClone(S), r = certMeal(T, today(), mealInput());
  const had = dayGroups(S.logs[today()]), after = dayGroups(T.logs[today()]);
  $('mealToday').innerHTML = '오늘 먹은 식품군 ' + GROUP_KEYS.map(g => `<span class="${after.has(g) ? 'on' : ''}">${g}${after.has(g) && !had.has(g) ? ' +' : ''}</span>`).join('');
  if (!r.ok) { $('mealCalc').innerHTML = `<span class="warn">${sel.slot}은 이미 인증했어요.</span>`; return; }
  const tierTxt = { great: '아주 좋은 한 끼', bal: '균형식', plain: '한 가지 더 곁들여 봐요' }[r.tier];
  let h = `식품군 ${r.n}가지 · ${tierTxt} → 예상 <b>경험치 +${r.gain}</b>`;
  if (r.parts.length) h += ` <span class="hint">(${r.parts.join(' · ')})</span>`;
  if (photos.meal && !photos.meal.ok) h += '<br><span class="hint">오늘 찍은 사진이 아니라서 사진 보너스는 없어요</span>';
  $('mealCalc').innerHTML = h;
}
function onCertMeal() {
  const r = certMeal(S, today(), mealInput());
  if (!r.ok) { toast(`${sel.slot}은 이미 인증했어요.`); return; }
  save(); closePanels(); render();
  if (r.woke) welcome();
  else if (r.grew) grewSay();
  else if (r.rainbow) sayLine('rainbow', ` +${r.gain}`);
  else if (r.tier !== 'plain') sayLine('balanced_meal', ` 경험치 +${r.gain}`);
  else say(`${sel.slot} 인증! 다음엔 한 가지 더 곁들여 봐요. +${r.gain}`);
  photos.meal = null; $('mealPrev').hidden = true; $('mealPhoto').value = '';
}
function slotByTime() {
  const h = new Date().getHours();
  return h >= 5 && h < 10 ? '아침' : h >= 11 && h < 15 ? '점심' : h >= 17 && h < 21 ? '저녁' : '간식';
}
function openMeal() {
  const L = S.logs[today()];
  const done = new Set(L ? L.meals.map(m => m.slot) : []);
  const pick = slotByTime();
  sel.slot = !done.has(pick) ? pick : SLOTS.find(s => !done.has(s)) || pick;
  syncChips(); openPanel('mealPanel'); renderMealCalc();
}

/* ---------- 사진 ---------- */
/** 200px JPEG 로 줄임. 오늘 찍은(저장된) 사진인지도 봄 */
function shrinkPhoto(file, cb) {
  const ok = keyOf(new Date(file.lastModified || 0)) === todayKey(0);
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, 200 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cb({ data: c.toDataURL('image/jpeg', 0.7), ok });
    };
    im.onerror = () => toast('사진을 읽을 수 없어요.');
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

/* ---------- 고르기 단추 ---------- */
const chipSets = [];
function chips(box, items, isOn, onTap) {
  box.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button';
    b.innerHTML = it.html || esc(it.label);
    b._sync = () => b.setAttribute('aria-pressed', isOn(it.v));
    b.onclick = () => { onTap(it.v); syncChips(); };
    box.appendChild(b);
  });
  chipSets.push(box);
}
function syncChips() { chipSets.forEach(box => [...box.children].forEach(b => b._sync())); }

/* ---------- 화면 ---------- */
const PANELS = { infoPanel: () => renderInfo(), dexPanel: () => renderDex(), shopPanel: () => renderShop() };
function openPanel(id) { closePanels(); $(id).hidden = false; $(id).scrollIntoView({ behavior: 'smooth', block: 'start' }); if (PANELS[id]) PANELS[id](); }
function closePanels() { ['exPanel', 'mealPanel', 'infoPanel', 'dexPanel', 'shopPanel'].forEach(i => $(i).hidden = true); if (S) $('setup').hidden = true; }
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
let cheerUntil = 0;
/** cheer = true(2.5초) 또는 기뻐할 시간(ms) */
function say(m, cheer) { $('lcdMsg').textContent = m; if (cheer) cheerUntil = performance.now() + (cheer === true ? 2500 : cheer); }

/** 잠에서 깨어났을 때 — 처벌보다 반겨 주기 */
function welcome() { sayLine('wake'); }
/** 상황 대사 (config/dialogues.js) — 여러 줄 중 무작위, 표정도 같이 */
function sayLine(key, extra = '') { const l = pickLine(key); if (l) say(l.text + extra, l.face === 'cheer'); }
function grewSay() { say(`${S.pet.name}(이)가 ${speciesName(S.pet)}(으)로 자랐어요! 도감에 새 모습이 생겼어요.`, true); }
function moodLine() {
  const p = S.pet; const L = S.logs[today()];
  if (p.sleeping) return `쿨쿨… ${p.name}(이)가 자고 있어요. 운동 한 번이면 깨어나요! (간식 말고 끼니 인증도 좋아요)`;
  if (restPassOn(S, today())) return `푹 쉬고 와요. 오늘은 체력이 줄지 않아요.`;
  if (p.hp <= LOW_HP_WARN) return pickLine('low_hp', dayRnd(today())).text; // 하루 동안 같은 대사
  if (p.hp < 25) return '너무 힘이 없어요… 오늘 꼭 움직이고 잘 챙겨 먹어 주세요.';
  if (p.hp < 50) return `조금 시들시들해요. 운동 ${RULES.exGoal}분이면 기운이 나요.`;
  const ex = exMinutes(L), meals = L ? L.meals.length : 0;
  if (ex >= RULES.exGoalPlus && dayGroups(L).size === GROUP_KEYS.length) return '오늘 최고예요! 60분 운동에 무지개 식단까지!';
  if (ex >= RULES.exGoal && meals >= 2) return `오늘 잘 하고 있어요! ${ex < RULES.exGoalPlus ? `60분까지 ${RULES.exGoalPlus - ex}분 남았어요.` : ''}`;
  if (ex < RULES.exGoal) return `오늘 운동 ${ex}분. ${RULES.exGoal}분 채우면 체력이 지켜져요.`;
  return '운동 좋았어요! 끼니도 인증해 주세요.';
}
function render() {
  const has = !!S;
  $('keys').hidden = !has; $('demo').hidden = !has; $('questCard').hidden = !has; $('subkeys').hidden = !has;
  if (!has) {
    $('setup').hidden = false; setupMode = 'new'; openSetupLabels();
    $('petName').textContent = '새 알'; $('stageTxt').textContent = '알'; $('dayTxt').textContent = 'DAY 1'; setBars(RULES.startHp, 0); renderLineBox(); return;
  }
  const p = S.pet;
  $('petName').textContent = p.name;
  $('stageTxt').textContent = speciesName(p);
  $('dayTxt').textContent = `DAY ${daysBetween(p.born, today()) + 1}`;
  setBars(p.hp, p.xp);
  if (performance.now() > cheerUntil) $('lcdMsg').textContent = moodLine();
  renderQuests();
  showAnniversary();
}

/* ---------- 도감 ---------- */
let dexPick = null;
function renderDex() {
  const all = dexEntries(), have = new Set(S.dex || []);
  $('dexCount').textContent = `만난 모습 ${all.filter(e => have.has(e.key)).length} / ${all.length}`;
  $('dexGrid').innerHTML = '';
  all.forEach(e => {
    const met = have.has(e.key), b = document.createElement('button');
    b.className = 'dexcell' + (met ? '' : ' unmet') + (dexPick === e.key ? ' on' : '');
    b.setAttribute('aria-label', met ? e.name : '아직 못 만난 모습');
    const c = document.createElement('canvas'); c.width = 72; c.height = 54;
    draw(c.getContext('2d'), { line: e.line, branch: e.st >= 4 ? e.line : null, xp: STAGES[e.st][0], hp: 80, height: 165 }, 1000, { silhouette: !met });
    const n = document.createElement('span'); n.textContent = met ? e.name : '???';
    b.append(c, n);
    b.onclick = () => { dexPick = e.key; renderDex(); };
    $('dexGrid').appendChild(b);
  });
  const e = all.find(x => x.key === dexPick);
  $('dexDetail').textContent = !e ? '칸을 누르면 설명이 나와요. 운동 갈래에 따라 어른 모습이 달라져요.'
    : have.has(e.key) ? `${e.name} · ${e.desc}` : `아직 못 만났어요 — ${LINES[e.line].n} 계통 ${STAGE_LABEL[e.st]}. 계속 키우면 만날 수 있어요!`;
}

/* ---------- 꾸미기 상점 (코인으로 사고, 보관함에서 쓰기·벗기) ---------- */
let shopCat = 'hat';
const shopCtx = $('shopCv').getContext('2d');
const BUY_FAIL = { coins: '코인이 모자라요. 오늘의 퀘스트로 모아 봐요!', owned: '이미 가지고 있어요.', limited: '기념일에만 받을 수 있어요.', unknown: '없는 아이템이에요.' };
function renderShop() {
  const I = S.items, wear = I.wear;
  $('shopCoins').textContent = `🪙 ${S.coins || 0}`;
  $('shopCats').innerHTML = Object.entries(ITEM_CATEGORIES).map(([k, n]) => `<button class="chip" type="button" aria-pressed="${k === shopCat}" data-cat="${k}">${n}</button>`).join('');
  $('shopCats').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { shopCat = b.dataset.cat; renderShop(); });
  const list = ITEMS.filter(it => it.category === shopCat && (!it.limited || I.owned.includes(it.id)));
  const locked = ITEMS.filter(it => it.category === shopCat && it.limited && !I.owned.includes(it.id)).length;
  $('shopList').innerHTML = list.map(it => {
    const own = I.owned.includes(it.id), on = wear[it.category] === it.id;
    const icon = it.color ? `<span class="swatch" style="background:rgb(${it.color})">${it.icon}</span>` : `<span class="swatch">${it.icon}</span>`;
    const act = on ? `<button class="btn ghost small" data-off="${it.category}">벗기</button>`
      : own ? `<button class="btn small" data-wear="${it.id}">쓰기</button>`
      : `<button class="btn small" data-buy="${it.id}"${(S.coins || 0) < it.price ? ' disabled' : ''}>🪙 ${it.price}</button>`;
    return `<div class="shopi${on ? ' on' : ''}">${icon}<span class="sname">${esc(it.name)}${it.limited ? ' <em>기념일 선물</em>' : own ? ' <em>보관함</em>' : ''}</span>${act}</div>`;
  }).join('') + (locked ? `<p class="hint">🎁 기념일에만 받는 한정 꾸미기 ${locked}개가 더 있어요.</p>` : '');
  $('shopList').querySelectorAll('[data-buy]').forEach(b => twoTap(b, () => {
    const r = buyItem(S, b.dataset.buy);
    if (!r.ok) { toast(BUY_FAIL[r.reason]); renderShop(); return; }
    wearItem(S, b.dataset.buy); save(); renderShop(); renderQuests();
    say(`${itemOf(b.dataset.buy).name}! 잘 어울려요.`, true);
  }));
  $('shopList').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { wearItem(S, b.dataset.wear); save(); renderShop(); });
  $('shopList').querySelectorAll('[data-off]').forEach(b => b.onclick = () => { takeOff(S, b.dataset.off); save(); renderShop(); });
}

/* ---------- 기념일 축하 ---------- */
function showAnniversary() {
  if (!S || !$('annModal').hidden) return;
  const a = pendingAnniversaries(S, today())[0];
  if (!a) return;
  const had = !!a.item && S.items.owned.includes(a.item); // 다시 시작한 튼튼몬은 같은 선물을 이미 가지고 있을 수 있음
  celebrate(S, today(), a); save(); // 보여 주는 순간 선물을 넣음 (창을 닫아도 받음)
  const it = a.item && !had && itemOf(a.item);
  $('annTitle').textContent = a.type === 'day' ? `${S.pet.name}(이)와 함께한 지 ${a.n}일!` : `연속 기록 ${a.n}일 달성!`;
  $('annText').textContent = a.type === 'day' ? `알을 받은 날부터 ${a.n}일째예요. 늘 함께해 줘서 고마워요!` : `${a.n}일 동안 꾸준히 해냈어요. 정말 대단해요!`;
  $('annGift').textContent = it ? `기념 선물: ${it.icon} ${it.name} — 꾸미기에서 써 보세요` : '';
  $('annModal').hidden = false;
  say('🎉 오늘은 기념일이에요!', true);
}

/* ---------- 오늘의 퀘스트 (코인만 · 경험치·체력·진화와 따로) ---------- */
let photoQuest = null;
function renderQuests() {
  const t = today(), fresh = !(S.logs[t] && S.logs[t].quests);
  const Q = todayQuests(S, t), n = dayStreak(S, t);
  if (fresh) save(); // 처음 뽑은 3개를 저장 → 같은 날은 늘 같음
  const doneN = Q.ids.filter(id => Q.done[id]).length;
  $('coinTxt').textContent = `🪙 ${S.coins || 0}`;
  $('questSub').textContent = `${doneN}/${Q.ids.length} 완료 · 모두 하면 보너스 🪙${DAILY_ALL_CLEAR_BONUS}${n ? ` · 🔥 연속 ${n}일` : ''}`;
  $('questList').innerHTML = Q.ids.map(questOf).filter(Boolean).map(q => {
    const d = Q.done[q.id], coin = questCoin(q);
    return `<div class="quest${d ? ' done' : ''}"><span class="qbox" aria-hidden="true">${d ? '✓' : ''}</span><span class="qtitle">${esc(q.title)}</span>`
      + (d ? `<span class="qok">완료 🪙${coin}</span>` : `<button class="btn small" data-quest="${esc(q.id)}">${q.verify === 'photo' ? '📷 찍기' : '했어요'} <span class="qc">+${coin}</span></button>`)
      + '</div>';
  }).join('');
  $('questList').querySelectorAll('[data-quest]').forEach(b => b.onclick = () => {
    const q = questOf(b.dataset.quest);
    if (q.verify === 'photo') { photoQuest = q.id; $('questPhoto').value = ''; $('questPhoto').click(); }
    else finishQuest(q.id, 'tap');
  });
}
function finishQuest(id, verify) {
  const r = completeQuest(S, today(), id, verify);
  if (!r.ok) { renderQuests(); return; }
  save(); renderQuests();
  if (r.allClear) { say(`${pickLine('quest_clear').text} 보너스 코인 +${r.bonus}`, QUEST_CHEER_MS); toast(`🎉 오늘 퀘스트를 다 했어요! 코인 +${r.coin + r.bonus}`); }
  else say(`퀘스트 완료! 코인 +${r.coin}`, QUEST_CHEER_MS);
}
/** 사진 퀘스트: 사진은 저장하지 않는다 — 잠깐 미리보기만 보여주고 버리고, 끝낸 시각만 남김 */
function onQuestPhoto(e) {
  const f = e.target.files[0], id = photoQuest;
  photoQuest = null; e.target.value = '';
  if (!f || !id) return;
  const url = URL.createObjectURL(f);
  $('questPrev').src = url; $('questPrev').hidden = false;
  setTimeout(() => { $('questPrev').hidden = true; $('questPrev').removeAttribute('src'); URL.revokeObjectURL(url); }, 1500);
  finishQuest(id, 'photo');
}
function openSetupLabels() { $('setupTitle').textContent = '내 튼튼몬 만들기'; $('nameRow').hidden = false; $('bCreate').textContent = '알 받기'; $('bSetupCancel').hidden = true; }
function setBars(hp, xp) {
  const st = stageOf(xp); const lo = STAGES[st][0], hi = STAGES[st + 1] ? STAGES[st + 1][0] : lo + 800;
  $('hpBar').style.width = hp + '%'; $('hpNum').textContent = hp;
  $('xpBar').style.width = clamp((xp - lo) / (hi - lo) * 100, 0, 100) + '%'; $('xpNum').textContent = xp;
}
function renderInfo() {
  const p = S.pet, t = today(), st = stageOf(p.xp);
  // 계통 · 진화
  const L = LINES[p.line];
  const tr = STAT_KEYS.map(k => `${STAT_NAMES[k]} ${Math.round(p.train[k])}분`).join(' · ');
  let evo;
  if (st >= 4) evo = `어른 갈래: <b>${LINES[p.branch || p.line].n} 계통</b>${p.branch && p.branch !== p.line ? ' (운동으로 바뀜)' : ''}`;
  else {
    const b = branchFromTraining(p.train, p.line), next = STAGES[st + 1];
    evo = `다음 단계까지 경험치 ${next[0] - p.xp} · 지금대로라면 어른이 될 때 <b>${SPECIES[4][b]}</b>(${LINES[b].n} 계통)`;
  }
  $('evoBox').innerHTML = `<div class="ln"><span class="sw" style="background:rgb(${L.c})"></span>${esc(speciesName(p))} · ${L.n} 계통</div><div>${evo}</div><div class="hint">지금까지 운동: ${tr}</div><div class="hint">🔥 연속 기록 ${dayStreak(S, t)}일 (퀘스트 1개 이상, 또는 운동 + 끼니 인증한 날 · 휴식일·휴식권은 안 끊겨요)</div>`;
  $('stats').innerHTML = STAT_KEYS.map(k => { const g = p.stats[k] - p.base[k]; return `<div class="stat"><b>${p.stats[k]}</b><span>${STAT_NAMES[k]}</span>${g > 0 ? `<em>+${g}</em>` : ''}</div>`; }).join('');
  // 오늘
  const T = S.logs[t], m = exMinutes(T), grp = dayGroups(T);
  $('todayBox').innerHTML = `<div class="prog"><span>운동 ${m}분 <span class="hint">(기본 ${RULES.exGoal} · 권장 ${RULES.exGoalPlus})</span></span><span class="bar"><i style="width:${clamp(m / RULES.exGoalPlus * 100, 0, 100)}%"></i></span><span class="${m >= RULES.exGoal ? 'ok' : ''}">${m >= RULES.exGoalPlus ? '권장 ✓' : m >= RULES.exGoal ? '기본 ✓' : ''}</span></div>`
    + `<div class="rainbow">식품군 ${GROUP_KEYS.map(g => `<span class="${grp.has(g) ? 'on' : ''}">${g}</span>`).join('')}</div>`;
  // 이번 주
  const w = weekId(t), c = weekCounts(S, w);
  $('weekBox').innerHTML = weekMissions(c).map(x => `<div class="prog"><span>${x.n}</span><span class="bar"><i style="width:${clamp(x.have / x.need * 100, 0, 100)}%"></i></span><span class="${x.have >= x.need ? 'ok' : ''}">${x.have}/${x.need}일</span></div>`).join('')
    + `<div class="prog"><span>운동 합계 <span class="hint">(권장 60분×7일)</span></span><span class="bar"><i style="width:${clamp(c.minutes / 420 * 100, 0, 100)}%"></i></span><span>${c.minutes}분</span></div>`
    + `<div class="hint">무지개 식단 ${c.rainbow}일</div>`;
  // 7일 점
  const start = addDay(t, -6), dn = ['일', '월', '화', '수', '목', '금', '토'];
  let h = '';
  for (let i = 0; i < 7; i++) {
    const k = addDay(start, i), D = S.logs[k], [y, mo, d] = k.split('-').map(Number);
    let cls = '';
    if (D && D.status) cls = D.status; else if (cappedMinutes(D) >= RULES.exGoal) cls = 'ex';
    h += `<div class="day${k === t ? ' today' : ''}"><span>${dn[new Date(y, mo - 1, d).getDay()]}</span><span class="dot ${cls}"></span><span class="mealdots">${balancedCount(D)}</span></div>`;
  }
  $('week').innerHTML = h;
  // 기록 목록
  const img = ph => (ph && ph.startsWith('data:image/') ? `<img src="${esc(ph)}" alt="">` : '');
  const items = [];
  Object.keys(S.logs).sort().reverse().slice(0, 14).forEach(k => {
    const D = S.logs[k];
    D.ex.forEach(e => {
      const am = e.amount || {}, amt = am.km ? ` ${am.km}km` : am.steps ? ` ${am.steps}걸음` : am.count ? ` ${am.count}번` : am.sets ? ` ${am.sets}×${am.reps}` : '';
      items.push([e.at, `<div class="logi">${img(e.photo)}<span class="tag">${k.slice(5)}${e.start ? ' ' + e.start : ''}</span><span>${esc(e.kind)} ${e.min}분 · ${INTENSITY[e.int] ? INTENSITY[e.int].n : ''}${esc(amt)}${e.flag ? ' <span class="chk">확인 필요</span>' : ''}</span><span class="xp">${e.xp ? '+' + e.xp : ''}</span></div>`]);
    });
    D.meals.forEach(m => items.push([m.at, `<div class="logi">${img(m.photo)}<span class="tag">${k.slice(5)}</span><span>${esc(m.slot)} · ${esc(m.place || '')} · ${esc((m.groups || []).join(', ') || '기록만')}</span><span class="xp">${m.xp ? '+' + m.xp : ''}</span></div>`]));
  });
  $('log').innerHTML = items.length ? items.sort((a, b) => b[0] - a[0]).map(x => x[1]).join('') : '<p class="hint">아직 인증 기록이 없어요.</p>';
  renderPasses();
}

/* ---------- 휴식권 (사유는 묻지 않음) ---------- */
const PASS_FAIL = {
  sleeping: '잠든 동안에는 쓸 수 없어요. 먼저 깨워 주세요.',
  already: '오늘은 이미 휴식권을 쓰고 있어요.',
  none: '남은 휴식권이 없어요.',
  start: '시작 날짜는 오늘이나 그 뒤로 골라 주세요.',
  days: `1~${EXAM_REST_MAX_DAYS}일 사이로 골라 주세요.`,
  overlap: '이미 정해 둔 기간과 겹쳐요.',
};
/** 잘못 누르지 않게 두 번 눌러야 씀 */
function twoTap(btn, fn) {
  const label = btn.textContent;
  btn.onclick = () => {
    if (btn.dataset.armed) { fn(); return; }
    btn.dataset.armed = '1'; btn.textContent = '한 번 더 누르면 써요';
    setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; }, 3000);
  };
}
function renderPasses() {
  const t = today(), left = passesLeft(S, t), on = restPassOn(S, t), asleep = S.pet.sleeping;
  const booked = S.passes.exam.filter(x => x.end >= t)
    .map(x => `<div class="booked"><span>${x.start.slice(5)} ~ ${x.end.slice(5)}${x.start <= t ? ' (쉬는 중)' : ''}</span>${x.start > t ? `<button class="btn ghost small" data-cancel="${x.start}">취소</button>` : ''}</div>`).join('');
  let days = '';
  for (let i = 1; i <= EXAM_REST_MAX_DAYS; i++) days += `<option value="${i}"${i === EXAM_REST_MAX_DAYS ? ' selected' : ''}>${i}일</option>`;
  $('passBox').innerHTML = (on ? `<p class="note">오늘은 ${on === 'exam' ? '시험기간' : '아픈 날'} 휴식권을 쓰는 중이에요. 체력이 줄지 않아요.</p>` : '')
    + `<div class="pass"><div><b>아픈 날 휴식권</b><span class="hint">오늘 하루 체력이 줄지 않아요 · 이번 달 ${left.sick}번 남음</span></div>`
    + `<button class="btn small" id="bSick"${asleep || on || left.sick <= 0 ? ' disabled' : ''}>오늘 쉬기</button></div>`
    + `<div class="pass"><div><b>시험기간 휴식권</b><span class="hint">최대 ${EXAM_REST_MAX_DAYS}일 동안 체력이 줄지 않아요 · 이번 학기 ${left.exam}번 남음 · 시작 전이면 취소할 수 있어요</span></div>`
    + booked
    + `<div class="row"><label>시작 날짜<input id="examStart" type="date" min="${t}" value="${t}"></label><label>며칠 동안<select id="examDays">${days}</select></label></div>`
    + `<button class="btn small" id="bExam"${asleep ? ' disabled' : ''}>시험기간 휴식권 쓰기</button></div>`
    + `<p class="hint">${asleep ? '잠든 동안에는 휴식권이 필요 없어요. 먼저 깨워 주세요.' : '쉬는 이유는 적지 않아요. 주 1회 휴식일은 따로 그대로 있어요.'}</p>`;
  twoTap($('bSick'), () => usedPass(useSickPass(S, today())));
  twoTap($('bExam'), () => usedPass(useExamPass(S, today(), $('examStart').value, Number($('examDays').value))));
  $('passBox').querySelectorAll('[data-cancel]').forEach(b => twoTap(b, () => {
    const r = cancelExamPass(S, today(), b.dataset.cancel);
    if (!r.ok) { toast('이미 시작한 기간은 취소할 수 없어요.'); renderPasses(); return; }
    save(); render(); renderPasses(); toast('취소했어요. 휴식권 횟수를 돌려받았어요.');
  }));
}
function usedPass(r) {
  if (!r.ok) { toast(PASS_FAIL[r.reason]); renderPasses(); return; }
  save(); render(); renderPasses();
  toast(r.end ? `${r.end.slice(5)}까지 시험기간 휴식권을 정했어요. 시험 잘 봐요!` : '푹 쉬고 와요. 오늘은 체력이 줄지 않아요.');
}
/** 새 알로 다시 시작. keep = 도감·꾸미기·코인을 남길지 (체험용 "처음부터 다시"는 모두 지움) */
function restart(keep = true) {
  pendingOffset = S ? S.offset : 0;
  if (keep) saveKeep(keepOnRestart(S)); else saveKeep(null);
  S = null; clear(); render();
  $('setup').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- 그리기 반복 ---------- */
const ctx = $('cv').getContext('2d');
function frame(t) {
  let pet, preview = false;
  if (S) pet = S.pet;
  else { const st = statsFromInputs(formInputs()); pet = { line: lineFromStats(st), xp: 0, hp: RULES.startHp, height: st.height }; preview = true; }
  const opts = { preview, cheer: performance.now() < cheerUntil, resting: !!S && !!restPassOn(S, today()), wear: S ? wearLook(S) : {} };
  draw(ctx, pet, t, opts);
  if (S && !$('shopPanel').hidden) draw(shopCtx, pet, t, opts); // 꾸미기 화면 미리보기
}
if (matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => frame(performance.now()), 500);
else { const loop = t => { frame(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }

/* ---------- 연결 ---------- */
const val = v => ({ v, label: v });
chips($('exKinds'), EX_KINDS.map(k => ({ v: k.k, html: `${esc(k.k)}<span class="tagc">${CAT_NAMES[k.cat]}</span>` })), v => sel.ex === v, v => { sel.ex = v; renderExAmount(); renderExCalc(); });
chips($('exInt'), [1, 2, 3].map(i => ({ v: i, html: `${INTENSITY[i].n}<small>${INTENSITY[i].talk}</small>` })), v => sel.int === v, v => { sel.int = v; renderExCalc(); });
chips($('exProof'), Object.entries(PROOFS).map(([k, p]) => ({ v: k, html: `${p.n}${p.bonus ? ` <span class="tagc">+${p.bonus * 100}%</span>` : ''}` })), v => sel.proof === v, v => { sel.proof = v; renderExCalc(); });
chips($('mealSlots'), SLOTS.map(val), v => sel.slot === v, v => { sel.slot = v; renderMealCalc(); });
chips($('mealPlace'), PLACES.map(val), v => sel.place === v, v => { sel.place = v; if (v === '급식') sel.groups = new Set(SCHOOL_LUNCH); renderMealCalc(); });
chips($('mealGroups'), GROUPS.map(g => ({ v: g.k, html: `${g.k}<small>${g.ex}</small>` })), v => sel.groups.has(v), v => { sel.groups.has(v) ? sel.groups.delete(v) : sel.groups.add(v); renderMealCalc(); });
chips($('mealDrink'), DRINKS.map(val), v => sel.drink === v, v => { sel.drink = v; renderMealCalc(); });
syncChips();
$('exWarm').onclick = () => { sel.warm = !sel.warm; $('exWarm').setAttribute('aria-pressed', sel.warm); renderExCalc(); };
$('exStart').addEventListener('input', () => { startTouched = true; renderExCalc(); });
$('exMin').addEventListener('input', () => { const n = nowMin(); if (!startTouched && n !== null) $('exStart').value = fromMin(Math.max(0, n - (parseInt($('exMin').value) || 0))); renderExCalc(); });
$('kEx').onclick = openEx; $('kMeal').onclick = openMeal; $('kInfo').onclick = () => openPanel('infoPanel');
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closePanels);
$('bEx').onclick = onCertEx; $('bMeal').onclick = onCertMeal;
$('exPhoto').onchange = e => { const f = e.target.files[0]; if (f) shrinkPhoto(f, ph => { photos.ex = ph; $('exPrev').src = ph.data; $('exPrev').hidden = false; renderExCalc(); }); };
$('mealPhoto').onchange = e => { const f = e.target.files[0]; if (f) shrinkPhoto(f, ph => { photos.meal = ph; $('mealPrev').src = ph.data; $('mealPrev').hidden = false; renderMealCalc(); }); };
['sCardio', 'sStr', 'sFlex', 'sPow', 'sH', 'sW', 'sM'].forEach(id => $(id).addEventListener('input', renderLineBox));
$('bCreate').onclick = () => {
  if (setupMode === 'remeasure' && S) {
    remeasure(S, formInputs()); save(); $('setup').hidden = true; render(); openPanel('infoPanel');
    toast('새 PAPS·인바디 기록으로 바꿨어요.'); return;
  }
  const t = todayKey(pendingOffset);
  S = applyKeep(newState(newPet($('sName').value, statsFromInputs(formInputs()), t), t, pendingOffset), loadKeep());
  saveKeep(null);
  save(); $('setup').hidden = true; render();
  say(`${S.pet.name}의 ${LINES[S.pet.line].n} 알을 받았어요! 운동이나 식단을 인증하면 깨어나요.`, true);
};
$('bSetupCancel').onclick = () => { $('setup').hidden = true; openPanel('infoPanel'); };
$('bRemeasure').onclick = () => openSetup('remeasure');
$('questPhoto').onchange = onQuestPhoto;
$('kDex').onclick = () => openPanel('dexPanel');
$('kShop').onclick = () => openPanel('shopPanel');
$('annOk').onclick = () => { $('annModal').hidden = true; showAnniversary(); }; // 남은 기념일이 있으면 이어서
$('bRestart').onclick = () => { if (confirm('지금 튼튼몬은 새 알로 돌아가요. 도감과 꾸미기 아이템, 코인은 그대로 남아요. 다시 시작할까요?')) { closePanels(); restart(true); } };
$('bNext').onclick = () => {
  S.offset++; const n = evaluate(S, today()); save(); render();
  const L = S.logs[addDay(today(), -1)];
  if (n.includes('튼튼몬이 잠들었어요')) toast('체력이 0이 되어 잠들었어요. 운동 한 번이면 깨어나요!');
  else if (S.pet.sleeping) toast('하루 지남 · 쿨쿨 자는 중');
  else if (L && L.status === 'pass') toast(`어제는 휴식권으로 쉬었어요.${n.length ? ' · ' + n.join(', ') : ''}`);
  else if (L && L.status === 'rest') toast(`어제는 휴식일로 봐 줬어요.${n.length ? ' · ' + n.join(', ') : ''}`);
  else toast(n.length ? `하루 지남 · ${n.join(', ')}` : '하루 지남 · 잘 지켰어요!');
};
$('bReset').onclick = () => { $('demo').hidden = true; $('resetConfirm').hidden = false; };
$('bResetNo').onclick = () => { $('resetConfirm').hidden = true; $('demo').hidden = false; };
$('bResetYes').onclick = () => { $('resetConfirm').hidden = true; restart(false); }; // 체험용: 모두 지움

if (S) { const n = evaluate(S, today()); save(); if (n.length) toast(`없던 동안: ${n.join(', ')}`); }
const hello = S && greeting(S, today(), new Date().getHours()); // 그날 첫 접속 인사 (오래 안 왔으면 반겨 주기)
if (S) save();
$('setup').hidden = !!S;
render();
if (hello && !S.pet.sleeping) sayLine(hello);
setInterval(() => { if (S && S.lastEval < today()) { evaluate(S, today()); save(); render(); } }, 60000);
