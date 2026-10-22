// 이 기기 브라우저(localStorage)에 저장. 막힌 브라우저에서도 게임은 돌아가게 모두 try 로 감싼다.
import { migrate } from './game.js';

export const KEY = 'tteuntteunmon.v1'; // 이름은 그대로, 안의 v 로 버전을 가린다

/** 예전 버전(v1)이면 새 모양으로 옮겨서 돌려준다 */
export function load(storage = globalThis.localStorage) {
  try { return migrate(JSON.parse(storage.getItem(KEY))); } catch { return null; }
}
/** 저장되면 true */
export function save(S, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(S)); return true; } catch { return false; }
}
export function clear(storage = globalThis.localStorage) {
  try { storage.removeItem(KEY); } catch { /* 무시 */ }
}

/** 다시 시작할 때 남기는 것(도감·꾸미기·코인)을 새 알을 받을 때까지 따로 보관 */
export const KEEP_KEY = 'tteuntteunmon.keep';
export function saveKeep(keep, storage = globalThis.localStorage) {
  try { if (keep) storage.setItem(KEEP_KEY, JSON.stringify(keep)); else storage.removeItem(KEEP_KEY); return true; } catch { return false; }
}
export function loadKeep(storage = globalThis.localStorage) {
  try { return JSON.parse(storage.getItem(KEEP_KEY)); } catch { return null; }
}
