import { isAbsolute, relative, resolve, sep } from 'node:path';

export function resolveWithinBase(baseDir: string, target: string, label = 'path'): string {
  const resolved = resolve(baseDir, target);
  const rel = relative(baseDir, resolved);

  if (rel === '') return resolved;
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Resolved ${label} "${target}" escapes the generator base path "${baseDir}".`);
  }

  return resolved;
}
