import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the one architectural rule that keeps this package trustworthy: the rule engine is pure.
 *
 * If a future change reaches for the AWS SDK, the filesystem, the network, or the clock from inside
 * a rule, the status decision stops being reproducible and this test fails.
 */

const SOURCE_ROOT = join(import.meta.dirname, '.');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!path.endsWith('.ts')) return [];
    if (path.endsWith('.test.ts')) return [];
    // Test fixtures are inputs to tests, not part of the engine.
    if (path.includes(`${join('src', 'testing')}`)) return [];
    return [path];
  });
}

const FORBIDDEN_IMPORTS = [
  '@aws-sdk/',
  'aws-sdk',
  'node:fs',
  'node:net',
  'node:http',
  'node:https',
  'node:child_process',
];

describe('rule engine purity', () => {
  const files = sourceFiles(SOURCE_ROOT);

  it('finds the source files it is meant to check', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(FORBIDDEN_IMPORTS)('imports nothing from %s', (forbidden) => {
    for (const file of files) {
      expect(readFileSync(file, 'utf8')).not.toContain(forbidden);
    }
  });

  it('never reads the clock itself, so every decision is reproducible', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toContain('Date.now()');
      expect(source).not.toContain('new Date()');
    }
  });

  it('never logs, so no document content can leak through this package', () => {
    for (const file of files) {
      expect(readFileSync(file, 'utf8')).not.toContain('console.');
    }
  });
});
