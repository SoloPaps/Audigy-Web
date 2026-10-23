/** Décode les entités HTML usuelles, une seule fois. */
export function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (all, body: string) => {
      if (body === 'amp') return '&';
      if (body === 'lt') return '<';
      if (body === 'gt') return '>';
      if (body === 'quot') return '"';
      if (body === 'apos') return "'";
      if (body === 'nbsp') return ' ';
      if (body.startsWith('#x'))
        return fromCode(Number.parseInt(body.slice(2), 16), all);
      if (body.startsWith('#'))
        return fromCode(Number.parseInt(body.slice(1), 10), all);
      return all;
    },
  );
}

export function collapse(value: string): string {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

function fromCode(code: number, fallback: string): string {
  if (!Number.isInteger(code) || code < 1 || code > 0x10ffff) return fallback;
  if (code >= 0xd800 && code <= 0xdfff) return fallback;
  return String.fromCodePoint(code);
}
