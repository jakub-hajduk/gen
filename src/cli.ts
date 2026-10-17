#!/usr/bin/env node
import { runCli } from './cli/run';
import { PromptCancelledError } from './cli/prompt-adapter';

runCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\n${message}\n`);
  process.exitCode = error instanceof PromptCancelledError ? 130 : 1;
});
