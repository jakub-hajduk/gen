import { createHooks, type Hookable } from 'hookable';
import type { Action } from '../actions/types';
import type { SnipkitConfig } from '../config/define-config';
import type { Generator } from '../config/define-generator';
import type { RunContext } from './context';

export interface RunHooks {
  'config:resolve': (payload: {
    configPath: string;
    configDir: string;
    config: SnipkitConfig;
  }) => void | Promise<void>;
  'prompts:resolve': (payload: {
    generator: Generator;
    answers: Record<string, unknown>;
  }) => void | Promise<void>;
  'action:before': (payload: {
    action: Action;
    index: number;
    context: RunContext;
  }) => void | Promise<void>;
  'action:after': (payload: {
    action: Action;
    index: number;
    context: RunContext;
  }) => void | Promise<void>;
  'write:before': (payload: { context: RunContext; files: string[] }) => void | Promise<void>;
  'write:after': (payload: {
    context: RunContext;
    files: string[];
    written: boolean;
  }) => void | Promise<void>;
}

export type RunHookable = Hookable<RunHooks>;

export function createRunHooks(): RunHookable {
  return createHooks<RunHooks>();
}
