import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = fileURLToPath(new URL('../', import.meta.url));

function temporaryProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'elb-prisma-generation-'));
  fs.mkdirSync(path.join(root, 'scripts/lib'), { recursive: true });
  fs.mkdirSync(path.join(root, 'prisma'));
  for (const file of ['scripts/lib/prisma-client.mjs', 'prisma/schema.prisma', 'prisma.config.ts', 'package-lock.json']) {
    fs.copyFileSync(path.join(project, file), path.join(root, file));
  }
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n');
  fs.symlinkSync(path.join(project, 'node_modules'), path.join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const output = path.join(root, 'src/generated/prisma'); fs.mkdirSync(output, { recursive: true });
  return { root, output };
}

function generate(root) {
  const helper = pathToFileURL(path.join(root, 'scripts/lib/prisma-client.mjs')).href;
  return spawnSync(process.execPath, ['--input-type=module', '-e', `import { ensurePrismaClient } from ${JSON.stringify(helper)}; ensurePrismaClient();`], {
    cwd: root, windowsHide: true, encoding: 'utf8', timeout: 120000,
    env: { ...process.env, DATABASE_URL: 'mysql://synthetic:synthetic@127.0.0.1:9/elb_generation_no_database_queries', PRISMA_HIDE_UPDATE_MESSAGE: '1' },
  });
}

function cleanup(root) {
  const resolved = fs.realpathSync(root), temporary = fs.realpathSync(os.tmpdir());
  assert.equal(path.dirname(resolved), temporary, 'Cleanup stays inside the explicit OS temporary directory.');
  assert.match(path.basename(resolved), /^elb-prisma-generation-[a-zA-Z0-9]+$/);
  // Unlink the dependency junction before removing our uniquely minted temp tree.
  fs.unlinkSync(path.join(resolved, 'node_modules'));
  fs.rmSync(resolved, { recursive: true, force: true });
}

test('Prisma CLI regenerates a removed client when only its owned stamp remains', () => {
  const { root, output } = temporaryProject();
  try {
    fs.writeFileSync(path.join(output, '.generation.json'), '{"fingerprint":"retired-branch"}\n');
    const result = generate(root);
    assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
    const stamp = JSON.parse(fs.readFileSync(path.join(output, '.generation.json'), 'utf8'));
    assert.match(stamp.fingerprint, /^[a-f0-9]{64}$/);
    assert.ok(stamp.files.includes('client.ts'));
    for (const file of stamp.files) assert.ok(fs.existsSync(path.join(output, file)), 'Generated client file: ' + file);
  } finally {
    cleanup(root);
  }
});

test('Prisma generation preserves and refuses an unknown file beside its stamp', () => {
  const { root, output } = temporaryProject();
  try {
    const stamp = '{"fingerprint":"retired-branch"}\n', userContent = 'Local notes must not be deleted.\n';
    fs.writeFileSync(path.join(output, '.generation.json'), stamp);
    fs.writeFileSync(path.join(output, 'user-notes.txt'), userContent);
    const result = generate(root);
    assert.notEqual(result.status, 0, 'The real CLI must refuse an unknown nonempty output directory.');
    assert.match(result.stderr + result.stdout, /not empty|could not be generated/i);
    assert.equal(fs.readFileSync(path.join(output, 'user-notes.txt'), 'utf8'), userContent);
    assert.equal(fs.readFileSync(path.join(output, '.generation.json'), 'utf8'), stamp);
    assert.equal(fs.existsSync(path.join(output, 'client.ts')), false);
  } finally {
    cleanup(root);
  }
});
