import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { isDemo, showDemoButtons } from '../src/demo.js';

describe('체험용 버튼은 ?demo 주소에서만', () => {
  it('일반 주소 → 체험 모드 아님', () => {
    ['', '?', '?x=1', '?demos', '?mode=demo'].forEach(s => expect(isDemo(s)).toBe(false));
  });
  it('?demo 주소 → 체험 모드', () => {
    ['?demo', '?demo=1', '?demo=', '?x=1&demo'].forEach(s => expect(isDemo(s)).toBe(true));
  });
  it('버튼은 튼튼몬이 있고 ?demo 일 때만 보임', () => {
    expect(showDemoButtons(true, '')).toBe(false);
    expect(showDemoButtons(true, '?demo')).toBe(true);
    expect(showDemoButtons(false, '?demo')).toBe(false); // 알을 받기 전에는 안 보임
  });
  it('index.html: 체험 버튼 묶음은 처음부터 숨김, "처음부터 다시 시작"(학생용)은 기록 칸에 따로 있음', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toMatch(/<div class="btns" id="demo" hidden>/);
    const demoBox = html.slice(html.indexOf('id="demo"'), html.indexOf('</div>', html.indexOf('id="demo"')));
    expect(demoBox).toContain('id="bNext"');
    expect(demoBox).not.toContain('bRestart');
    const info = html.slice(html.indexOf('id="infoPanel"'), html.indexOf('</section>', html.indexOf('id="infoPanel"')));
    expect(info).toContain('id="bRestart"');
  });
});
