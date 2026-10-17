import { existsSync } from 'node:fs';
import type { RunContext } from './context';

export function stageFile(context: RunContext, absolutePath: string, contents: string): void {
  const alreadyStaged = context.files.files.has(absolutePath);

  if (!alreadyStaged && existsSync(absolutePath) && !context.force) {
    throw new Error(
      `Refusing to overwrite existing file "${absolutePath}". Re-run with --force to replace it.`,
    );
  }

  context.files.write(absolutePath, contents);
}

/**
 * Stages an intentional in-place source update. Unlike generated files, source
 * updates are expected to modify existing files, so they are not collisions.
 */
export function stageSourceFile(context: RunContext, absolutePath: string, contents: string): void {
  context.files.write(absolutePath, contents);
}
