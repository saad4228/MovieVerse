import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const root = process.cwd();
const records = JSON.parse(
  await readFile(path.join(root, "data/media-catalog.json"), "utf8"),
);
await mkdir(path.join(root, "public/assets/posters"), { recursive: true });
await mkdir(path.join(root, "public/assets/backdrops"), { recursive: true });
async function download(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Artwork download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const backdropsOnly = process.argv.includes("--backdrops-only");
for (const [id, record] of Object.entries(records)) {
  if (requested.length && !requested.includes(id)) continue;
  if (!backdropsOnly) {
    const poster = await download(record.posterSource);
    for (const [width, target] of [[600, record.posterSmall], [1200, record.poster]])
      await sharp(poster)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 95, effort: 6 })
        .toFile(path.join(root, "public", target));
  }
  if (record.backdropSource) {
    const backdrop = await download(record.backdropSource);
    await sharp(backdrop)
      .resize({ width: 3840, withoutEnlargement: true })
      .webp({ quality: 94, effort: 6 })
      .toFile(path.join(root, "public", record.backdrop));
    if (record.backdropSmall)
      await sharp(backdrop)
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 91, effort: 6 })
        .toFile(path.join(root, "public", record.backdropSmall));
    for (const alternative of record.alternativeBackdrops || [])
      await sharp(await download(alternative.source))
        .resize({ width: 3840, withoutEnlargement: true })
        .webp({ quality: 94, effort: 6 })
        .toFile(path.join(root, "public", alternative.url));
  }
  console.log(`${id}: original artwork variants saved`);
}
