import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { runCliProcess } from '../helpers/run-cli';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const srcEntry = join(repoRoot, 'src', 'index.ts');

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function buildPluginProject(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'gen-e2e-discovery-')));
  write(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));
  write(
    join(dir, 'gen.config.ts'),
    "export default { generators: ['./generators/*.generator.ts'] };\n",
  );

  const pluginDir = join(dir, 'generators');
  const specifier = relative(pluginDir, srcEntry);
  write(
    join(pluginDir, 'plugin.generator.ts'),
    `import { addTemplates, defineGenerator, text } from ${JSON.stringify(specifier)};

export default {
  generators: [
    defineGenerator({
      name: 'welcome',
      basePath: 'src',
      prompts: { who: text({ message: 'Who' }) },
      actions: [
        addTemplates({
          from: 'templates/welcome',
          to: '<%= it.format.kebabCase(it.answers.who) %>',
        }),
      ],
    }),
    defineGenerator({
      name: 'farewell',
      basePath: 'src',
      prompts: { who: text({ message: 'Who' }) },
      actions: [
        addTemplates({
          from: 'templates/farewell',
          to: '<%= it.format.kebabCase(it.answers.who) %>',
        }),
      ],
    }),
  ],
};
`,
  );

  write(join(pluginDir, 'templates', 'welcome', 'hello.txt.eta'), 'Hello <%= it.answers.who %>!');
  write(join(pluginDir, 'templates', 'farewell', 'bye.txt.eta'), 'Bye <%= it.answers.who %>!');
  return dir;
}

test('a plugin module exporting several generators is flattened and runs from local templates', async () => {
  const dir = buildPluginProject();

  const welcome = await runCliProcess(['welcome', '--who', 'Ada Lovelace'], dir);
  assert.equal(welcome.code, 0, welcome.stderr);
  assert.equal(
    readFileSync(join(dir, 'src', 'ada-lovelace', 'hello.txt'), 'utf8'),
    'Hello Ada Lovelace!',
  );

  const farewell = await runCliProcess(['farewell', '--who', 'Ada Lovelace'], dir);
  assert.equal(farewell.code, 0, farewell.stderr);
  assert.equal(
    readFileSync(join(dir, 'src', 'ada-lovelace', 'bye.txt'), 'utf8'),
    'Bye Ada Lovelace!',
  );

  assert.equal(existsSync(join(dir, 'src', 'ada-lovelace', 'hello.txt')), true);
});
