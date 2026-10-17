import type { RunContext } from './context';
import type { RunHookable } from './hooks';

export async function commitRun(context: RunContext, hooks: RunHookable): Promise<string[]> {
  const paths = [...context.files.files.keys()];

  await hooks.callHook('write:before', { context, files: paths });

  if (!context.dryRun) {
    for (const _ of context.files.writeFilesToDisk()) {
      void _;
    }
  }

  await hooks.callHook('write:after', {
    context,
    files: paths,
    written: !context.dryRun,
  });

  return paths;
}
