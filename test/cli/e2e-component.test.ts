import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { makeTempDir, writeFile } from '../helpers/fixtures';
import { runCliProcess } from '../helpers/run-cli';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');

function extractExample(name: string): string {
  const marker = `<!-- example:${name} -->`;
  const markerIndex = readme.indexOf(marker);
  assert.notEqual(markerIndex, -1, `README is missing ${marker}`);
  const fenceStart = readme.indexOf('```', markerIndex);
  const contentStart = readme.indexOf('\n', fenceStart) + 1;
  const fenceEnd = readme.indexOf('```', contentStart);
  assert.notEqual(fenceEnd, -1, `README is missing a closing fence for ${name}`);
  return readme.slice(contentStart, fenceEnd);
}

function buildFixture(): string {
  const dir = realpathSync(makeTempDir());
  writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));

  const entry = join(repoRoot, 'src', 'index.ts');
  const rewriteImport = (contents: string, from: string) => {
    const specifier = relative(from, entry);
    return contents.replace(/from 'snipkit'/, `from ${JSON.stringify(specifier)}`);
  };

  writeFile(join(dir, 'snipkit.config.ts'), rewriteImport(extractExample('config'), dir));
  writeFile(
    join(dir, 'generators', 'component.generator.ts'),
    rewriteImport(extractExample('generator'), join(dir, 'generators')),
  );
  writeFile(
    join(dir, 'generators', 'templates', 'component', '{pascalCase:name}.tsx.eta'),
    extractExample('template-component'),
  );
  writeFile(
    join(dir, 'generators', 'templates', 'component', 'index.ts.eta'),
    extractExample('template-index'),
  );
  writeFile(join(dir, 'src', 'components', 'index.ts'), extractExample('barrel'));
  return dir;
}

test('the documented component generator runs from CLI flags only', async () => {
  const dir = buildFixture();

  const result = await runCliProcess(['component', '--name', 'User Profile'], dir);

  assert.equal(result.code, 0, result.stderr);

  const componentDir = join(dir, 'src', 'components', 'user-profile');
  assert.equal(existsSync(join(componentDir, 'UserProfile.tsx')), true);
  assert.equal(existsSync(join(componentDir, 'index.ts')), true);

  assert.equal(
    readFileSync(join(componentDir, 'UserProfile.tsx'), 'utf8'),
    'export const UserProfile = () => <div />;\n',
  );
  assert.equal(
    readFileSync(join(componentDir, 'index.ts'), 'utf8'),
    "export * from './user-profile';\n",
  );
  assert.equal(
    readFileSync(join(dir, 'src', 'components', 'index.ts'), 'utf8'),
    "// Components barrel\nexport { UserProfile } from './user-profile';\n",
  );
});

test('the documented dry run reports files without writing them', async () => {
  const dir = buildFixture();

  const result = await runCliProcess(['component', '--name', 'Billing', '--dry-run'], dir);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Dry run for "component": 3 file\(s\) would be written\./);
  assert.equal(existsSync(join(dir, 'src', 'components', 'billing')), false);
});
