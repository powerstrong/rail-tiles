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
  it('renders all 60 initial boards with a visible hint and descriptive controls', () => {
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

  it('shows all two experiment entries without touching unavailable storage', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const html = renderToStaticMarkup(createElement(LabScreen, { onBack: () => {} }));
      expect((html.match(/<button[^>]*class="lab-concept /g) ?? []).length).toBe(2);
      expect(html).toContain('60');
      expect(html).toContain('상상 실험실');
      expect(html).not.toContain('NaN');
    } finally { warn.mockRestore(); }
  });
});
