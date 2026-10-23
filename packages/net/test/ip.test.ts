import { describe, expect, it } from 'vitest';
import {
  blockedReason,
  isPublicAddress,
  parseIpv4Loose,
} from '../src/index.js';

describe('blockedReason', () => {
  it.each([
    ['127.0.0.1', 'loopback'],
    ['127.255.255.254', 'loopback'],
    ['10.0.0.1', 'private'],
    ['10.255.255.255', 'private'],
    ['172.16.0.1', 'private'],
    ['172.31.255.255', 'private'],
    ['192.168.0.1', 'private'],
    ['169.254.169.254', 'link-local'],
    ['100.64.0.1', 'cgnat'],
    ['100.127.255.255', 'cgnat'],
    ['0.0.0.0', 'this-network'],
    ['224.0.0.1', 'multicast'],
    ['255.255.255.255', 'reserved'],
    ['192.0.2.10', 'documentation'],
    ['::1', 'loopback'],
    ['::', 'reserved'],
    ['fc00::1', 'unique-local'],
    ['fd12:3456::1', 'unique-local'],
    ['fe80::1', 'link-local'],
    ['febf::1', 'link-local'],
    ['ff02::1', 'multicast'],
    ['::ffff:127.0.0.1', 'ipv4-mapped'],
    ['::ffff:7f00:1', 'ipv4-mapped'],
    ['[::ffff:8.8.8.8]', 'ipv4-mapped'],
    ['64:ff9b::7f00:1', 'reserved'],
    ['2001:db8::1', 'documentation'],
    ['2002:7f00:1::', '6to4'],
    ['fe80::1%eth0', 'scoped'],
    ['not-an-ip', 'invalid'],
  ])('refuse %s (%s)', (ip, reason) => {
    expect(blockedReason(ip)).toBe(reason);
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each([
    '93.184.216.34',
    '8.8.8.8',
    '172.32.0.1',
    '100.128.0.1',
    '2606:4700::1111',
    '2a00:1450:4007::64',
  ])('accepte %s', (ip) => {
    expect(blockedReason(ip)).toBeNull();
  });
});

describe('parseIpv4Loose', () => {
  it.each([
    ['2130706433', '127.0.0.1'],
    ['0x7f.1', '127.0.0.1'],
    ['0177.0.0.1', '127.0.0.1'],
    ['127.1', '127.0.0.1'],
    ['0x7f000001', '127.0.0.1'],
    ['10.0.0.1.', '10.0.0.1'],
  ])('%s → %s', (input, expected) => {
    expect(parseIpv4Loose(input)).toBe(expected);
  });

  it.each([
    'example.com',
    '1.2.3.4.5',
    '256.0.0.1',
    '4294967296',
    '09.0.0.1',
    '',
  ])('%s n’est pas une IPv4', (input) => {
    expect(parseIpv4Loose(input)).toBeNull();
  });
});
