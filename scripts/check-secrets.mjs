import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {currentFiles, historicalTextBlobs, isBinaryAsset, readCurrentFile, repositoryRoot} from './security/repository.mjs';

const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,})\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/g],
  ['aws-access-id', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['google-api-key', /\bAIza[A-Za-z0-9_-]{30,}\b/g],
  ['stripe-secret', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ['npm-token', /\bnpm_[A-Za-z0-9]{30,}\b/g],
  ['credential-url', /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?):\/\/[^\s"':/]+:[^\s"'@]{3,}@/gi],
  ['session-cookie', /mv_session(?:=|%3D)[a-f0-9-]{36}/g],
  ['literal-credential', /(?:^|[,{;.\n]|\b(?:const|let|var))\s*["']?(?:[A-Za-z_]*(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|passwd|admin[_-]?token|service[_-]?role|tmdb[_-]?read[_-]?token)[A-Za-z_]*)["']?\s*[:=]\s*["']([^"'\r\n]{6,180})["']/gim],
];
const placeholder = /^(?:<[^>]+>|\$\{[^}]+\}|(?:your|replace|insert|placeholder|redacted|example)[\s_-].*|\*+|x{6,})$/i;
export const fingerprint = value => createHash('sha256').update(value).digest('hex');

export function scanText(file, text, {allowlist = [], knownSecrets = []} = {}) {
  const findings = [];
  let allowed = 0;
  for (const [rule, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = rule === 'literal-credential' ? match[1] : match[0];
      if (rule === 'literal-credential' && placeholder.test(value)) continue;
      const exception = allowlist.some(entry => entry.path === file && entry.rule === rule && entry.fingerprint === fingerprint(value));
      if (exception) { allowed++; continue; }
      findings.push({file, line: text.slice(0, match.index).split('\n').length, rule});
    }
  }
  // Local credentials are read privately, used only for comparison, never printed.
  for (const {name, value} of knownSecrets) {
    const index = text.indexOf(value);
    if (index >= 0) findings.push({file, line: text.slice(0, index).split('\n').length, rule: `configured-local-secret:${name}`});
  }
  return {findings, allowed};
}

function localSecrets(root) {
  const secrets = [];
  for (const file of readdirSync(root).filter(name => /^(?:\.env(?:\..+)?|\.dev\.vars(?:\..+)?)$/.test(name) && !name.endsWith('.example'))) {
    const text = readFileSync(path.join(root, file), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || !/TOKEN|SECRET|PASSWORD|API_KEY/i.test(match[1])) continue;
      const value = match[2].replace(/^(["'])(.*)\1$/, '$2');
      if (value.length >= 12 && !placeholder.test(value)) secrets.push({name: match[1], value});
    }
  }
  return secrets;
}

export function runSecretCheck(root, {staged = false, history = false} = {}) {
  const allowlist = JSON.parse(readFileSync(path.join(root, 'scripts/security/secret-allowlist.json'), 'utf8'));
  if (!Array.isArray(allowlist) || allowlist.some(entry =>
    !entry.path?.startsWith('tests/') || entry.rule !== 'literal-credential' ||
    !/^[a-f0-9]{64}$/.test(entry.fingerprint) || typeof entry.reason !== 'string' || !entry.reason.trim()
  )) throw new Error('Invalid reviewed-fixture configuration.');
  const knownSecrets = localSecrets(root);
  const sources = history ? historicalTextBlobs(root) : currentFiles(root, staged).filter(file => !isBinaryAsset(file)).map(file => ({file, data: readCurrentFile(root, file, staged)}));
  const findings = [];
  let scanned = 0, allowed = 0;
  for (const {file, data, revision} of sources) {
    if (!data || data.includes(0)) continue;
    const result = scanText(file, data.toString('utf8'), {allowlist, knownSecrets});
    findings.push(...result.findings.map(finding => ({...finding, ...(revision ? {object: revision} : {})})));
    allowed += result.allowed;
    scanned++;
  }
  return {mode: history ? 'reachable-history' : staged ? 'staged' : 'working-tree', scanned, reviewedFixtureMatches: allowed, findings};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = runSecretCheck(repositoryRoot(), {staged: process.argv.includes('--staged'), history: process.argv.includes('--history')});
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.findings.length ? 1 : 0;
  } catch {
    console.error('Secret check could not complete. Check repository access and scanner configuration; no sensitive values are logged.');
    process.exitCode = 2;
  }
}
