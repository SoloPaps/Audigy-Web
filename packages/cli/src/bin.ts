#!/usr/bin/env -S node --import tsx
import { loadFixes } from '@audigy/engine';
import { fileFixStore } from '@audigy/engine/fixes-fs';
import { runCli } from './main.js';

const code = await runCli(
  process.argv.slice(2),
  {
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
    env: process.env,
  },
  { fixes: await loadFixes(fileFixStore()) },
);
process.exitCode = code;
