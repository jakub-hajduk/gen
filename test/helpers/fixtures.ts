import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export function makeProject(configContents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'snipo-fixture-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));
  writeFileSync(join(dir, 'snipo.config.ts'), configContents);
  return dir;
}

export function writeFile(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

export function makeTempDir(prefix = 'snipo-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}
