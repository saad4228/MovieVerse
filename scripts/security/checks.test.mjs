import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {fingerprint, runSecretCheck, scanText} from '../check-secrets.mjs';
import {checkHygiene, forbiddenReason} from '../check-repository-hygiene.mjs';

// Entirely synthetic markers, built at runtime; never real provider credentials.
const syntheticToken = () => ['ghp', 'A'.repeat(36)].join('_');
test('detects provider markers and reports locations without matched values', () => {
  const token = syntheticToken();
  const result = scanText('example.ts', `first line\nconst marker = "${token}";`);
  assert.deepEqual(result.findings, [{file: 'example.ts', line: 2, rule: 'github-token'}]);
  assert.equal(JSON.stringify(result).includes(token), false);
});
test('detects private-key, connection-string and session-cookie exposure', () => {
  const key = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');
  const url = ['postgresql://someone:', 'synthetic-password@host/db'].join('');
  const cookie = ['mv_session=', '1'.repeat(8), '-2222-3333-4444-', '5'.repeat(12)].join('');
  const result = scanText('private.txt', `${key}\n${url}\n${cookie}`);
  assert.deepEqual(result.findings.map(f => f.rule).sort(), ['credential-url', 'private-key', 'session-cookie']);
});
test('ignores obvious documentation placeholders rather than real literals', () => {
  const name = ['ADMIN', 'TOKEN'].join('_');
  assert.equal(scanText('README.md', `${name}="<private-value>"`).findings.length, 0);
  assert.equal(scanText('source.ts', `${name}="a-new-literal-value"`).findings.length, 1);
});
test('does not mistake password field labels or autocomplete ternaries for credentials', () => {
  const jsx = '<input name="password" autoComplete={register ? "new-password" : "current-password"} aria-label={visible ? "Hide password" : "Show password"} />';
  assert.equal(scanText('Account.tsx', jsx).findings.length, 0);
});
test('fixture exceptions match the exact path, rule and fingerprint only', () => {
  const value = 'synthetic-fixture-password';
  const text = `password: "${value}"`;
  const allowlist = [{path: 'tests/account.ts', rule: 'literal-credential', fingerprint: fingerprint(value)}];
  assert.equal(scanText('tests/account.ts', text, {allowlist}).findings.length, 0);
  assert.equal(scanText('source.ts', text, {allowlist}).findings.length, 1);
  assert.equal(scanText('tests/account.ts', text.replace(value, 'different-fixture-password'), {allowlist}).findings.length, 1);
});
test('a configured local secret is never exempted by a fixture exception', () => {
  const value = 'synthetic-fixture-password';
  const allowlist = [{path: 'test.ts', rule: 'literal-credential', fingerprint: fingerprint(value)}];
  const result = scanText('test.ts', `password:"${value}"`, {allowlist, knownSecrets: [{name: 'TEST_SECRET', value}]});
  assert.equal(result.findings[0].rule, 'configured-local-secret:TEST_SECRET');
});
test('rejects database, key, environment, session and generated artifact paths', () => {
  for (const file of ['.dev.vars', '.env.local', 'signing.key', 'cert.pfx', 'private.sqlite-wal', 'backup.dump', 'backup.sql', 'exports/local.backup.sql', 'trace.zip', 'capture.har', 'playwright/.auth/user.json', 'outputs/notes.json', 'dist/index.js']) {
    assert.ok(forbiddenReason(file), file);
  }
});
test('preserves public examples, migrations, runtime assets and notices', () => {
  for (const file of ['.env.example', 'drizzle/0000_rainy_unus.sql', 'public/assets/movie.webp', 'db/schema.ts', 'vendor/shadcn-tailwind-4.13.0.LICENSE.md', 'deployment.public.json', '.openai/hosting.json']) {
    assert.equal(forbiddenReason(file), null, file);
  }
});
test('Git integration catches an untracked copied secret and ignores its private source', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'movieverse-security-'));
  try {
    execFileSync('git', ['init', '--quiet'], {cwd: temporary});
    mkdirSync(path.join(temporary, 'scripts/security'), {recursive: true});
    writeFileSync(path.join(temporary, 'scripts/security/secret-allowlist.json'), '[]');
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    writeFileSync(path.join(temporary, '.gitignore'), readFileSync(path.join(root, '.gitignore')));
    const secret = 'synthetic-local-value-for-comparison';
    writeFileSync(path.join(temporary, '.dev.vars'), `TEST_SECRET=${secret}`);
    writeFileSync(path.join(temporary, 'accidental-copy.js'), `export default "${secret}";`);
    const result = runSecretCheck(temporary);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].file, 'accidental-copy.js');
    assert.equal(JSON.stringify(result).includes(secret), false);
    assert.equal(checkHygiene(temporary).findings.length, 0);
    // Tracked files remain detectable even if an ignore rule would hide new files.
    writeFileSync(path.join(temporary, 'bad.sqlite'), 'synthetic DB');
    execFileSync('git', ['add', '-f', 'bad.sqlite'], {cwd: temporary});
    assert.ok(checkHygiene(temporary).findings.some(f => f.file === 'bad.sqlite'));
    execFileSync('git', ['add', 'accidental-copy.js'], {cwd: temporary});
    writeFileSync(path.join(temporary, 'accidental-copy.js'), 'export default "safe";');
    assert.ok(runSecretCheck(temporary, {staged: true}).findings.some(f => f.file === 'accidental-copy.js'));
  } finally {
    // Only this freshly created OS temporary test directory is removed.
    if (path.dirname(temporary) !== path.resolve(tmpdir()) || !path.basename(temporary).startsWith('movieverse-security-')) throw new Error('Unsafe temporary cleanup path.');
    rmSync(temporary, {recursive: true, force: true});
  }
});
