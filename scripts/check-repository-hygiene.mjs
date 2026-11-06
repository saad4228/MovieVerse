import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {currentFiles, git, repositoryRoot} from './security/repository.mjs';

export function forbiddenReason(file) {
  const normalized = file.replaceAll('\\', '/');
  if (normalized === '.env.example') return null;
  if (/(^|\/)(?:\.env(?:\.[^/]+)?|\.dev\.vars[^/]*|id_rsa[^/]*|id_ed25519[^/]*)$/i.test(normalized)) return 'private environment or SSH key';
  if (/\.(?:pem|key|pk8|p12|pfx|pkcs12|jks|keystore|crt|cer|der|csr|p7b|p7c)$/i.test(normalized)) return 'private-key/certificate container';
  if (/\.(?:db|sqlite|sqlite3)(?:-[^/]*)?$|\.dump(?:\.gz|\.sql)?$|\.backup\.sql$|\.sql\.(?:gz|zip)$|(?:^|\/)(?:backup|dump)\.sql$/i.test(normalized)) return 'database or database export';
  if (/(^|\/)(?:node_modules|dist|\.next|\.vinext|\.wrangler|\.sites-runtime|\.codex|\.agents|outputs|work|coverage|playwright-report|test-results[^/]*|database-backups|database-dumps|backups)(?:\/|$)/.test(normalized)) return 'private/generated directory';
  if (/(^|\/)playwright\/\.auth\/|(?:storage-state|auth-state)[^/]*\.json$|\.(?:har|trace|network|log|tsbuildinfo)$/i.test(normalized)) return 'session state or generated diagnostics';
  if (/\.(?:zip|tgz|tar\.gz)$/i.test(normalized)) return 'generated archive';
  if (normalized === 'next-env.d.ts') return 'generated framework declaration';
  return null;
}

export const ignoreProbes = [
  '.env', '.env.local', '.env.production', '.dev.vars', '.dev.vars.production',
  'private/server.pem', 'private/server.key', 'private/server.pfx', 'private/server.p12',
  'private/server.crt', 'private/server.cer', 'private/server.der', 'private/server.jks', 'private/id_ed25519',
  'local.sqlite', 'local.sqlite-wal', 'local.sqlite3', 'local.db', 'local.db-shm', 'backup.dump', 'backup.sql.gz', 'backup.sql', 'private.backup.sql', 'database-dumps/local.sql',
  'trace.zip', 'requests.har', 'capture.trace', 'capture.network', 'storage-state.json', 'auth-state-user.json',
  'playwright/.auth/user.json', 'test-results-new/run/trace.zip',
  'node_modules/package/index.js', 'dist/server/index.js', '.wrangler/state/data.sqlite',
  '.sites-runtime/profile.json', '.vinext/dev/lock.json', '.next/types/routes.d.ts',
  'outputs/report.json', 'work/debug.mjs', 'coverage/index.html', 'playwright-report/index.html',
  '.agents/context.txt', '.codex/context.txt', 'next-env.d.ts', 'tsconfig.tsbuildinfo', 'export.tar.gz', 'backup.zip',
];

export function checkHygiene(root, staged = false) {
  const findings = currentFiles(root, staged).flatMap(file => {
    const reason = forbiddenReason(file);
    return reason ? [{file, reason}] : [];
  });
  const output = git(root, ['check-ignore', '--no-index', '-z', '--stdin'], ignoreProbes.join('\0') + '\0');
  const ignored = new Set(output.toString().split('\0').filter(Boolean));
  for (const file of ignoreProbes) if (!ignored.has(file)) findings.push({file, reason: 'required ignore rule missing'});
  // Public configuration and source migrations must not be accidentally hidden.
  const publicPaths = ['.env.example', 'drizzle/0000_rainy_unus.sql', 'db/schema.ts', 'deployment.public.json'];
  const publicIgnored = git(root, ['check-ignore', '--no-index', '-z', '--stdin'], [...publicPaths, ignoreProbes[0]].join('\0') + '\0').toString().split('\0');
  for (const file of publicPaths) if (publicIgnored.includes(file)) findings.push({file, reason: 'public example/source incorrectly ignored'});
  return {mode: staged ? 'staged' : 'working-tree', checkedIgnoreRules: ignoreProbes.length, findings};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkHygiene(repositoryRoot(), process.argv.includes('--staged'));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.findings.length ? 1 : 0;
  } catch {
    console.error('Repository hygiene check could not complete. Check Git access and ignore rules.');
    process.exitCode = 2;
  }
}
