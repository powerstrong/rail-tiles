import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { act, type Stage, type State } from './model';
import { LabBoard } from './LabBoard';
import { LabScreen } from './LabScreen';
import { LAB_STAGES, stagesFor } from './stages';
import { solve } from './solver';
import { KINDS } from './model';
const renderBoard = (s: Stage, v: State, hint: number | null, disabled = false) => renderToStaticMarkup(createElement(LabBoard, { stage: s, state: v, hint, disabled, onAction: () => {} }));
const replay = (s: Stage) => s.solution.reduce((v, a) => act(s, v, a)!, s.start);

describe('experimental board render contract', () => {
  it('renders all 300 initial boards with a visible hint and descriptive controls', () => {
    for (const s of LAB_STAGES) {
      const html = renderBoard(s, s.start, s.solution[0]);
      expect(html, s.id).not.toMatch(/(?:NaN|undefined|残り)/);
      expect(html, s.id).toContain('aria-label=');
      expect(html, s.id).toMatch(/lb-hint(?:[ "-])/);
      const buttons = (html.match(/<button\b[^>]*>/g) ?? []).filter(b => !b.includes('lb-view-toggle'));
      expect(buttons.length, s.id).toBeGreaterThan(0);
      for (const button of buttons) expect(button, s.id).toContain('aria-label=');
    }
  });
  it('renders every final state with all puzzle actions disabled', () => {
    for (const s of LAB_STAGES) {
      const html = renderBoard(s, replay(s), null, true);
      const buttons = (html.match(/<button\b[^>]*>/g) ?? []).filter(b => !b.includes('lb-view-toggle'));
      for (const button of buttons) expect(button, s.id).toContain('disabled=');
      expect(html, s.id).not.toContain('NaN');
    }
  });
  it('can render the current-state hint halfway through every chapter finale', () => {
    for (const kind of KINDS) for (const number of [10, 20, 30]) {
      const s = stagesFor(kind)[number - 1];
      const v = s.solution.slice(0, Math.floor(s.solution.length / 2)).reduce((p, a) => act(s, p, a)!, s.start);
      const path = solve(s, v).path!;
      expect(path.length, s.id).toBeGreaterThan(0);
      expect(renderBoard(s, v, path[0]), s.id).toMatch(/lb-hint(?:[ "-])/);
    }
  });
  it('does not mark an empty planting bed complete just because the squirrel stands on it', () => {
    const s = stagesFor('acorn')[0];
    const html = renderBoard(s, [s.goal[0], ...s.start.slice(1)], null);
    expect(html).not.toContain('lb-cell-check');
    expect(renderBoard(s, replay(s), null, true)).toContain('lb-cell-check');
  });
  it('keeps introductory coral choices to the three shapes taught on that stage', () => {
    const s = stagesFor('coral')[0];
    const html = renderBoard(s, s.start, null);
    expect((html.match(/class="lb-color-button/g) ?? []).length).toBe(3);
  });
  it('reads each candy destination with the correct Korean particle', () => {
    const s = stagesFor('balance')[0];
    const html = renderBoard(s, [0, 1, 2], null);
    for (const destination of ['왼쪽 접시로', '오른쪽 접시로', '쟁반으로']) {
      expect(html).toContain(`누르면 ${destination} 옮겨요.`);
    }
  });
  it('shows all ten experiment entries without touching unavailable storage', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const html = renderToStaticMarkup(createElement(LabScreen, { onBack: () => {} }));
      expect((html.match(/<button[^>]*class="lab-concept /g) ?? []).length).toBe(10);
      expect(html).toContain('300');
      expect(html).toContain('상상 실험실');
      expect(html).not.toContain('NaN');
    } finally { warn.mockRestore(); }
  });
});
