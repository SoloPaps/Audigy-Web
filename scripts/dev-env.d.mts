import type { SpawnOptions } from 'node:child_process';

export function parseEnv(text: string): Record<string, string>;

export function assignMissing(
  env: NodeJS.ProcessEnv,
  parsed: Readonly<Record<string, string>>,
): void;

export function loadRootEnv(
  root: string,
  env?: NodeJS.ProcessEnv,
): Promise<void>;

export function webPublicEnvFile(
  parsed: Readonly<Record<string, string>>,
): string | null;

export function syncWebEnv(root: string): Promise<boolean>;

export function commandOptions(
  env?: NodeJS.ProcessEnv,
  platform?: NodeJS.Platform,
): SpawnOptions;
