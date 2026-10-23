import { isIP } from 'node:net';

type Cidr4 = readonly [base: number, bits: number, reason: string];

const IPV4_BLOCKED: readonly Cidr4[] = [
  [ip4('0.0.0.0'), 8, 'this-network'],
  [ip4('10.0.0.0'), 8, 'private'],
  [ip4('100.64.0.0'), 10, 'cgnat'],
  [ip4('127.0.0.0'), 8, 'loopback'],
  [ip4('169.254.0.0'), 16, 'link-local'],
  [ip4('172.16.0.0'), 12, 'private'],
  [ip4('192.0.0.0'), 24, 'reserved'],
  [ip4('192.0.2.0'), 24, 'documentation'],
  [ip4('192.31.196.0'), 24, 'reserved'],
  [ip4('192.52.193.0'), 24, 'reserved'],
  [ip4('192.88.99.0'), 24, 'reserved'],
  [ip4('192.168.0.0'), 16, 'private'],
  [ip4('192.175.48.0'), 24, 'reserved'],
  [ip4('198.18.0.0'), 15, 'benchmark'],
  [ip4('198.51.100.0'), 24, 'documentation'],
  [ip4('203.0.113.0'), 24, 'documentation'],
  [ip4('224.0.0.0'), 4, 'multicast'],
  [ip4('240.0.0.0'), 4, 'reserved'],
];

/** Préfixes IPv6 refusés à l'intérieur de 2000::/3 (seule plage unicast globale acceptée). */
const IPV6_BLOCKED_IN_GLOBAL: readonly [
  prefix: string,
  bits: number,
  reason: string,
][] = [
  ['2001::', 23, 'reserved'],
  ['2001:db8::', 32, 'documentation'],
  ['2002::', 16, '6to4'],
  ['3fff::', 20, 'documentation'],
];

function ip4(dotted: string): number {
  const parts = dotted.split('.').map(Number);
  return (
    (((parts[0] ?? 0) << 24) |
      ((parts[1] ?? 0) << 16) |
      ((parts[2] ?? 0) << 8) |
      (parts[3] ?? 0)) >>>
    0
  );
}

function inCidr4(value: number, base: number, bits: number): boolean {
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) >>> 0 === (base & mask) >>> 0;
}

function parsePart(part: string): number | null {
  if (/^0x[0-9a-f]*$/i.test(part))
    return part.length === 2 ? 0 : Number.parseInt(part.slice(2), 16);
  if (/^0[0-7]+$/.test(part)) return Number.parseInt(part.slice(1), 8);
  if (/^(0|[1-9][0-9]*)$/.test(part)) return Number(part);
  return null;
}

/**
 * Interprète un hôte IPv4 sous toutes ses notations (décimale entière `2130706433`,
 * octale `0177.0.0.1`, hexadécimale `0x7f.1`, abrégée `127.1`), comme le font les navigateurs.
 * Renvoie la forme pointée canonique, ou `null` si l'hôte n'est pas une IPv4.
 */
export function parseIpv4Loose(host: string): string | null {
  const parts = host.split('.');
  if (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
  if (parts.length === 0 || parts.length > 4) return null;
  const values: number[] = [];
  for (const part of parts) {
    const value = parsePart(part);
    if (value === null || !Number.isSafeInteger(value)) return null;
    values.push(value);
  }
  const last = values.pop() ?? 0;
  if (values.some((v) => v > 255)) return null;
  if (last >= 256 ** (4 - values.length)) return null;
  let n = last;
  values.forEach((v, i) => {
    n += v * 256 ** (3 - i);
  });
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

/** Convertit une IPv6 textuelle (avec ou sans crochets) en 16 octets ; `null` si invalide. */
export function parseIpv6(input: string): Uint8Array | null {
  const text =
    input.startsWith('[') && input.endsWith(']') ? input.slice(1, -1) : input;
  if (isIP(text) !== 6) return null;
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const toGroups = (s: string): number[] | null => {
    if (s === '') return [];
    const out: number[] = [];
    for (const g of s.split(':')) {
      if (g.includes('.')) {
        if (isIP(g) !== 4) return null;
        const v = ip4(g);
        out.push(v >>> 16, v & 0xffff);
      } else {
        out.push(Number.parseInt(g, 16));
      }
    }
    return out;
  };
  const head = toGroups(halves[0] ?? '');
  const tail = halves.length === 2 ? toGroups(halves[1] ?? '') : [];
  if (!head || !tail) return null;
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...new Array<number>(fill).fill(0), ...tail];
  if (groups.length !== 8) return null;
  const bytes = new Uint8Array(16);
  groups.forEach((g, i) => {
    bytes[i * 2] = g >> 8;
    bytes[i * 2 + 1] = g & 0xff;
  });
  return bytes;
}

function inPrefix6(
  bytes: Uint8Array,
  prefix: Uint8Array,
  bits: number,
): boolean {
  for (let i = 0; i < bits; i++) {
    const byte = i >> 3;
    const mask = 0x80 >> (i & 7);
    if (((bytes[byte] ?? 0) & mask) !== ((prefix[byte] ?? 0) & mask))
      return false;
  }
  return true;
}

/**
 * Raison du refus d'une adresse IP (`'loopback'`, `'private'`, `'ipv4-mapped'`…),
 * ou `null` si l'adresse est publique et joignable.
 */
export function blockedReason(address: string): string | null {
  const bare =
    address.startsWith('[') && address.endsWith(']')
      ? address.slice(1, -1)
      : address;
  const family = isIP(bare);
  if (family === 4) {
    const value = ip4(bare);
    for (const [base, bits, reason] of IPV4_BLOCKED) {
      if (inCidr4(value, base, bits)) return reason;
    }
    return null;
  }
  if (family === 6) {
    if (bare.includes('%')) return 'scoped';
    const bytes = parseIpv6(bare);
    if (!bytes) return 'invalid';
    if (inPrefix6(bytes, parseIpv6('::ffff:0:0') as Uint8Array, 96))
      return 'ipv4-mapped';
    if (inPrefix6(bytes, parseIpv6('::1') as Uint8Array, 128))
      return 'loopback';
    if (inPrefix6(bytes, parseIpv6('fc00::') as Uint8Array, 7))
      return 'unique-local';
    if (inPrefix6(bytes, parseIpv6('fe80::') as Uint8Array, 10))
      return 'link-local';
    if (inPrefix6(bytes, parseIpv6('ff00::') as Uint8Array, 8))
      return 'multicast';
    if (!inPrefix6(bytes, parseIpv6('2000::') as Uint8Array, 3))
      return 'reserved';
    for (const [prefix, bits, reason] of IPV6_BLOCKED_IN_GLOBAL) {
      if (inPrefix6(bytes, parseIpv6(prefix) as Uint8Array, bits))
        return reason;
    }
    return null;
  }
  return 'invalid';
}

export function isPublicAddress(address: string): boolean {
  return blockedReason(address) === null;
}
