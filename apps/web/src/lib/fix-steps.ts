/** Étapes numérotées et bloc copiable d’une variante de fiche. */
export function stepsFromVariant(body: string): {
  steps: string[];
  code?: string;
} {
  const fence = /```[^\n]*\n([\s\S]*?)```/u.exec(body);
  const code = fence?.[1]?.trim();
  const prose = body.replace(/```[\s\S]*?```/gu, '\n');
  const steps: string[] = [];
  for (const raw of prose.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const numbered = /^\d+\.\s+(.+)$/u.exec(line);
    const step = numbered?.[1] ?? line;
    steps.push(step);
  }
  if (code) return { steps, code };
  return { steps };
}
