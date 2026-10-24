import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function text(path: string): string {
  return readFileSync(`${root}/${path}`, 'utf8');
}

describe('tokens Arc Soft', () => {
  const css = () => text('apps/web/src/styles/tokens.css').toLowerCase();

  it('pose le verre, les blobs et Outfit, sans violet de marque', () => {
    const tokens = css();
    expect(tokens).toContain('--wash-top: #faf8f4');
    expect(tokens).toContain('--wash-bottom: #d7e7f2');
    expect(tokens).toContain('--blob-petrol: #9fcfcb');
    expect(tokens).toContain('--blob-peach: #f3c7b4');
    expect(tokens).toContain('--blob-lilac: #e3d4f0');
    expect(tokens).toContain('--blob-opacity-petrol: 0.55');
    expect(tokens).toContain('--blob-opacity-peach: 0.45');
    expect(tokens).toContain('--blob-opacity-lilac: 0.35');
    expect(tokens).toContain('--glass: rgb(255 255 255 / 0.64)');
    expect(tokens).toContain('--glass-border: rgb(255 255 255 / 0.3)');
    expect(tokens).toContain('--glass-blur: 20px');
    expect(tokens).toContain('--shadow-float: 0 18px 48px rgb(27 31 36 / 0.1)');
    expect(tokens).toContain('--plate: #ffffff');
    expect(tokens).toContain('--peach-fill: #f8e4d8');
    expect(tokens).toContain('--peach-border: #e39a78');
    expect(tokens).toContain('--on-peach: #1b1f24');
    expect(tokens).toContain('--radius-float: 16px');
    expect(tokens).toContain('--font-display: "outfit"');
    expect(tokens).toContain('--ease-out: cubic-bezier(0.22, 1, 0.36, 1)');
    expect(tokens).toContain('--duration-hover: 200ms');
    expect(tokens).toContain('--duration-enter: 280ms');
    expect(tokens).toContain('--duration-row: 240ms');
    expect(tokens).toContain('--duration-page: 450ms');
    expect(tokens).toContain('--duration-blob: 32s');
    expect(tokens).toContain('--duration-gauge: 400ms');
    expect(tokens).toContain('--lift: -3px');
    expect(tokens).toContain('--bar-height: 56px');
    expect(tokens).toContain('--scroll-pad: 88px');
    expect(tokens).toContain('--gauge-mini: 64px');
    expect(tokens).toContain('--reading-max: 45rem');
    expect(tokens).toContain('--login-max: 30rem');
    expect(tokens).not.toContain('--shadow-overlay');
    for (const banned of ['#6366f1', '#8b5cf6', '#a855f7']) {
      expect(tokens).not.toContain(banned);
    }
    expect(tokens).toContain('--accent: #0f5c5a');
    expect(tokens).toContain('--score-good: #1f5fad');
    expect(tokens).not.toMatch(/--accent:[^;]*#e3d4f0/);
    expect(tokens).not.toMatch(/--score-[a-z]+: #e3d4f0/);
  });

  it('assombrit le fond, le verre et les blobs sans toucher au pêche ni aux scores', () => {
    const tokens = css();
    expect(tokens).toContain('--wash-bottom: #1a2830');
    expect(tokens).toContain('--glass: rgb(29 33 38 / 0.72)');
    expect(tokens).toContain('--glass-border: rgb(255 255 255 / 0.18)');
    expect(tokens).toContain('--shadow-float: 0 18px 48px rgb(0 0 0 / 0.35)');
    expect(tokens).toContain('--plate: #1d2126');
    expect(tokens).toContain('--blob-opacity-petrol: 0.18');
    expect(tokens).toContain('--blob-opacity-peach: 0.18');
    expect(tokens).toContain('--blob-opacity-lilac: 0.18');
    expect(tokens).toContain('--score-good: #7fb0ee');
    expect(tokens.match(/--on-peach: #1b1f24/g)?.length).toBe(1);
  });
});

describe('Outfit', () => {
  it('auto-héberge deux graisses latin et la licence, sans Sora ni Manrope', () => {
    expect(statSync(`${root}/apps/web/src/fonts/outfit-latin-600-normal.woff2`).size).toBe(14140);
    expect(statSync(`${root}/apps/web/src/fonts/outfit-latin-700-normal.woff2`).size).toBe(14060);
    expect(text('apps/web/src/fonts/OFL-outfit.txt')).toContain('SIL Open Font License');
    const fonts = text('apps/web/src/styles/fonts.css');
    expect(fonts).toContain('font-family: "Outfit"');
    expect(fonts).toContain('font-weight: 600');
    expect(fonts).toContain('font-weight: 700');
    expect(fonts).toContain('font-display: swap');
    expect(fonts).toContain('outfit-latin-600-normal.woff2');
    expect(fonts).toContain('outfit-latin-700-normal.woff2');
    expect(fonts.toLowerCase()).not.toContain('fonts.googleapis.com');
    expect(fonts.toLowerCase()).not.toContain('sora');
    expect(fonts.toLowerCase()).not.toContain('manrope');
  });
});

describe('coquille', () => {
  const arc = () => text('apps/web/src/styles/arc.css');

  it('n’écrit aucune couleur littérale et pose le verre', () => {
    const css = arc();
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(css).toContain('background: var(--glass)');
    expect(css).toContain('backdrop-filter: blur(var(--glass-blur))');
    expect(css).toContain('-webkit-backdrop-filter: blur(var(--glass-blur))');
    expect(css).toContain('box-shadow: var(--shadow-float)');
    expect(css).toContain('background: var(--plate)');
    expect(css).toContain('filter: blur(var(--space-8))');
    expect(css).toContain('.blob-lilac');
    expect(css).toContain('display: none');
    expect(css).toContain('@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('animation: none');
    expect(css).toContain('animation-delay: 200ms');
    expect(css).toContain('var(--duration-row)');
    expect(css).not.toContain('translateY');
  });
});
