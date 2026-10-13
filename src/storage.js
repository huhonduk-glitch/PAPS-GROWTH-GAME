// 이 기기 브라우저(localStorage)에 저장. 막힌 브라우저에서도 게임은 돌아가게 모두 try 로 감싼다.
import { SAVE_VERSION } from './game.js';

export const KEY = 'tteuntteunmon.v1';

export function load(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage.getItem(KEY)); if (v && v.v === SAVE_VERSION && v.pet) return v; } catch { /* 저장 없음 */ }
  return null;
}
/** 저장되면 true */
export function save(S, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(S)); return true; } catch { return false; }
}
export function clear(storage = globalThis.localStorage) {
  try { storage.removeItem(KEY); } catch { /* 무시 */ }
}
