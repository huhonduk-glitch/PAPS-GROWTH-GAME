// 화면: 버튼 연결 · 그리기 반복 · 저장. 게임 계산은 game.js, 그림은 draw.js.
import './style.css';
import {
  STAGES, EX_KINDS, SLOTS, CHECKS, RULES, clamp, addDay, daysBetween, todayKey, stageOf,
  exMinutes, balancedCount, statsFromInputs, newPet, newState, evaluate, certExercise, certMeal,
} from './game.js';
import { draw } from './draw.js';
import { load, save as store, clear } from './storage.js';

const $ = id => document.getElementById(id);

let S = load();
const sel = { ex: '달리기', slot: '점심', checks: new Set(['채소·과일', '단백질', '밥·빵·면']) };
const photos = { ex: null, meal: null };
let pendingOffset = 0;

const today = () => todayKey(S ? S.offset : 0);
function save() { if (!store(S)) toast('이 브라우저에서는 저장이 안 돼요. 창을 닫으면 사라져요.'); }

/* ---------- 만들기 폼 ---------- */
function formInputs() {
  const g = id => Number($(id).value);
  return {
    total: g('sTotal'), cardio: g('sCardio'), strength: g('sStr'), flex: g('sFlex'), power: g('sPow'),
    height: parseFloat($('sH').value), weight: parseFloat($('sW').value), muscle: parseFloat($('sM').value),
  };
}

/* ---------- 인증 ---------- */
function onCertEx() {
  const r = certExercise(S, today(), { kind: sel.ex, min: parseInt($('exMin').value), int: Number($('exInt').value), photo: photos.ex });
  if (!r.ok) { toast(`${RULES.exMinCert}분 이상부터 인증할 수 있어요.`); return; }
  save(); closePanels(); render();
  if (r.grew) say(`${S.pet.name}(이)가 ${STAGES[stageOf(S.pet.xp)][1]}(으)로 자랐어요!`, true);
  else if (r.counted === 0) say(`오늘은 ${RULES.exDailyCap}분을 다 채웠어요. 이제 푹 쉬어요.`);
  else say(`${sel.ex} ${r.min}분 인증! 경험치 +${r.gain}`);
  photos.ex = null; $('exPrev').hidden = true; $('exPhoto').value = '';
}
function onCertMeal() {
  const r = certMeal(S, today(), { slot: sel.slot, checks: sel.checks, photo: photos.meal });
  if (!r.ok) { toast(`${sel.slot}은 이미 인증했어요.`); return; }
  save(); closePanels(); render();
  if (r.grew) say(`${S.pet.name}(이)가 ${STAGES[stageOf(S.pet.xp)][1]}(으)로 자랐어요!`, true);
  else say(r.balanced ? `${sel.slot} 균형식 인증! 경험치 +${r.gain}` : `${sel.slot} 인증! 다음엔 한 가지 더 곁들여 봐요.`);
  photos.meal = null; $('mealPrev').hidden = true; $('mealPhoto').value = '';
}
function shrinkPhoto(file, cb) {
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, 200 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', .7));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

/* ---------- 화면 ---------- */
function chips(box, items, get, setv, multi) {
  box.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = it;
    const sync = () => b.setAttribute('aria-pressed', multi ? get().has(it) : get() === it); sync();
    b.onclick = () => { setv(it); [...box.children].forEach(x => x._sync()); }; b._sync = sync;
    box.appendChild(b);
  });
}
function openPanel(id) { closePanels(); $(id).hidden = false; $(id).scrollIntoView({ behavior: 'smooth', block: 'start' }); if (id === 'infoPanel') renderInfo(); }
function closePanels() { ['exPanel', 'mealPanel', 'infoPanel'].forEach(i => $(i).hidden = true); }
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
let cheerUntil = 0;
function say(m, cheer) { $('lcdMsg').textContent = m; if (cheer) cheerUntil = performance.now() + 2500; }

function moodLine() {
  const p = S.pet; const L = S.logs[today()];
  if (!p.alive) return `${p.name}(이)가 기운이 다 빠져 소멸했어요… 함께한 날 ${daysBetween(p.born, p.diedOn) + 1}일.`;
  if (p.hp < 25) return '너무 힘이 없어요… 오늘 꼭 움직이고 잘 챙겨 먹어 주세요.';
  if (p.hp < 50) return `조금 시들시들해요. 운동 ${RULES.exGoal}분이면 기운이 나요.`;
  const ex = exMinutes(L);
  if (ex >= RULES.exGoal && L.meals.length >= 2) return '오늘 완벽해요! 몸이 가벼워요.';
  if (ex < RULES.exGoal) return `오늘 운동 ${ex}분. ${RULES.exGoal}분 채우면 체력이 지켜져요.`;
  return '운동 좋았어요! 끼니도 인증해 주세요.';
}
function render() {
  const has = !!S;
  $('setup').hidden = has; $('keys').hidden = !has || !S.pet.alive; $('demo').hidden = !has;
  if (!has) { $('petName').textContent = '새 알'; $('stageTxt').textContent = 'STAGE 0'; $('dayTxt').textContent = 'DAY 1'; setBars(RULES.startHp, 0); return; }
  const p = S.pet;
  $('petName').textContent = p.name;
  $('stageTxt').textContent = STAGES[stageOf(p.xp)][1];
  $('dayTxt').textContent = `DAY ${daysBetween(p.born, p.alive ? today() : p.diedOn) + 1}`;
  setBars(p.hp, p.xp);
  if (performance.now() > cheerUntil) $('lcdMsg').textContent = moodLine();
  if (!p.alive) {
    $('lcdMsg').textContent = moodLine() + ' ';
    const b = document.createElement('button');
    b.className = 'btn small'; b.style.marginTop = '6px'; b.textContent = '새 알 받기'; b.onclick = restart;
    $('lcdMsg').appendChild(b);
  }
}
function setBars(hp, xp) {
  const st = stageOf(xp); const lo = STAGES[st][0], hi = STAGES[st + 1] ? STAGES[st + 1][0] : lo + 200;
  $('hpBar').style.width = hp + '%'; $('hpNum').textContent = hp;
  $('xpBar').style.width = clamp((xp - lo) / (hi - lo) * 100, 0, 100) + '%'; $('xpNum').textContent = xp;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function renderInfo() {
  const s = S.pet.stats;
  $('stats').innerHTML = [['심폐', s.cardio], ['근력', s.strength], ['유연', s.flex], ['순발', s.power]]
    .map(([n, v]) => `<div class="stat"><b>${v}</b><span>${n}</span></div>`).join('');
  const t = today(); const start = addDay(t, -6); const dn = ['일', '월', '화', '수', '목', '금', '토'];
  let h = '';
  for (let i = 0; i < 7; i++) {
    const k = addDay(start, i); const L = S.logs[k]; const [y, m, d] = k.split('-').map(Number);
    const wd = dn[new Date(y, m - 1, d).getDay()];
    let cls = '';
    if (L && L.status) cls = L.status; else if (exMinutes(L) >= RULES.exGoal) cls = 'ex';
    h += `<div class="day${k === t ? ' today' : ''}"><span>${wd}</span><span class="dot ${cls}"></span><span class="mealdots">${balancedCount(L)}</span></div>`;
  }
  $('week').innerHTML = h;
  const img = p => (p && p.startsWith('data:image/') ? `<img src="${esc(p)}" alt="">` : '');
  const items = [];
  Object.keys(S.logs).sort().reverse().slice(0, 14).forEach(k => {
    const L = S.logs[k];
    L.ex.forEach(e => items.push([e.at, `<div class="logi">${img(e.photo)}<span class="tag">${k.slice(5)}</span><span>${esc(e.kind)} ${e.min}분</span></div>`]));
    L.meals.forEach(m => items.push([m.at, `<div class="logi">${img(m.photo)}<span class="tag">${k.slice(5)}</span><span>${esc(m.slot)} · ${esc(m.checks.join(', ') || '기록만')}</span></div>`]));
  });
  $('log').innerHTML = items.length ? items.sort((a, b) => b[0] - a[0]).map(x => x[1]).join('') : '<p class="hint">아직 인증 기록이 없어요.</p>';
}
function restart() {
  pendingOffset = S ? S.offset : 0;
  S = null; clear(); render();
  $('setup').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- 그리기 반복 ---------- */
const ctx = $('cv').getContext('2d');
function frame(t) {
  let pet, preview = false;
  if (S) pet = S.pet;
  else { const st = statsFromInputs(formInputs()); pet = { type: st.total - 1, xp: 0, hp: RULES.startHp, alive: true, stats: st, height: st.height }; preview = true; }
  draw(ctx, pet, t, { preview, cheer: performance.now() < cheerUntil });
}
if (matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => frame(performance.now()), 500);
else { const loop = t => { frame(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }

/* ---------- 연결 ---------- */
chips($('exKinds'), EX_KINDS.map(k => k[0]), () => sel.ex, v => sel.ex = v);
chips($('mealSlots'), SLOTS, () => sel.slot, v => sel.slot = v);
chips($('mealChecks'), CHECKS, () => sel.checks, v => { sel.checks.has(v) ? sel.checks.delete(v) : sel.checks.add(v); }, true);
$('kEx').onclick = () => openPanel('exPanel'); $('kMeal').onclick = () => openPanel('mealPanel'); $('kInfo').onclick = () => openPanel('infoPanel');
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closePanels);
$('bEx').onclick = onCertEx; $('bMeal').onclick = onCertMeal;
$('exPhoto').onchange = e => { const f = e.target.files[0]; if (f) shrinkPhoto(f, d => { photos.ex = d; $('exPrev').src = d; $('exPrev').hidden = false; }); };
$('mealPhoto').onchange = e => { const f = e.target.files[0]; if (f) shrinkPhoto(f, d => { photos.meal = d; $('mealPrev').src = d; $('mealPrev').hidden = false; }); };
$('bCreate').onclick = () => {
  const t = todayKey(pendingOffset);
  S = newState(newPet($('sName').value, statsFromInputs(formInputs()), t), t, pendingOffset);
  save(); render();
  say(`${S.pet.name}의 알을 받았어요! 운동이나 식단을 인증하면 깨어나요.`, true);
};
$('bNext').onclick = () => {
  S.offset++; const n = evaluate(S, today()); save(); render();
  const L = S.logs[addDay(today(), -1)];
  if (!S.pet.alive) toast('체력이 0이 되어 소멸했어요.');
  else if (L && L.status === 'rest') toast('어제는 휴식일로 봐 줬어요.');
  else toast(n.length ? `하루 지남 · ${n.join(', ')}` : '하루 지남 · 잘 지켰어요!');
};
$('bReset').onclick = () => { $('demo').hidden = true; $('resetConfirm').hidden = false; };
$('bResetNo').onclick = () => { $('resetConfirm').hidden = true; $('demo').hidden = false; };
$('bResetYes').onclick = () => { $('resetConfirm').hidden = true; restart(); };

if (S) { const n = evaluate(S, today()); save(); if (n.length) toast(`없던 동안: ${n.join(', ')}`); }
render();
setInterval(() => { if (S && S.pet.alive && S.lastEval < today()) { evaluate(S, today()); save(); render(); } }, 60000);
