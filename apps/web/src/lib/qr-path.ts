import QRCode from 'qrcode';

const QUIET = 4;

/** Chemin SVG des modules sombres, zone calme comprise. */
export function qrPath(texte: string): { d: string; size: number } {
  const code = QRCode.create(texte, { errorCorrectionLevel: 'M' });
  const n = code.modules.size;
  let d = '';
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (!code.modules.get(y, x)) continue;
      d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
    }
  }
  return { d, size: n + QUIET * 2 };
}
