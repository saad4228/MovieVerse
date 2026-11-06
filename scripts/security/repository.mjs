import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

export function git(root, args, input) {
  return execFileSync('git', args, {
    cwd: root, input, maxBuffer: 128 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

export function repositoryRoot(cwd = process.cwd()) {
  return git(cwd, ['rev-parse', '--show-toplevel']).toString().trim();
}

export function currentFiles(root, staged = false) {
  const args = staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    : ['ls-files', '--cached', '--others', '--exclude-standard', '-z'];
  return [...new Set(git(root, args).toString().split('\0').filter(Boolean))].sort();
}

export function readCurrentFile(root, file, staged = false) {
  if (staged) return git(root, ['show', `:${file}`]);
  const target = path.resolve(root, file);
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('Invalid repository path.');
  return existsSync(target) ? readFileSync(target) : null;
}

export const isBinaryAsset = file => /\.(?:png|jpe?g|webp|gif|ico|mp4|webm|mp3|wav|woff2?|ttf|eot|pdf|zip|gz|tgz|glb|gltf)$/i.test(file);

export function historicalTextBlobs(root) {
  const candidates = new Map();
  for (const line of git(root, ['rev-list', '--objects', '--all']).toString().split('\n')) {
    const space = line.indexOf(' ');
    if (space < 0) continue;
    const id = line.slice(0, space), file = line.slice(space + 1);
    if (!isBinaryAsset(file)) candidates.set(id, file);
  }
  if (!candidates.size) return [];
  const response = git(root, ['cat-file', '--batch'], [...candidates.keys()].join('\n') + '\n');
  const blobs = [];
  let offset = 0;
  while (offset < response.length) {
    const end = response.indexOf(10, offset);
    if (end < 0) throw new Error('Invalid Git object response.');
    const [id, type, rawSize] = response.subarray(offset, end).toString().split(' ');
    const size = Number(rawSize);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error('Invalid Git object size.');
    offset = end + 1;
    const data = response.subarray(offset, offset + size);
    offset += size + 1;
    if (type === 'blob') blobs.push({file: candidates.get(id), revision: id.slice(0, 12), data});
  }
  return blobs;
}
