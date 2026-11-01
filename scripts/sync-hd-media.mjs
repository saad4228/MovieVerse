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
for (const [id, record] of Object.entries(records)) {
  const poster = await download(record.posterSource);
  for (const width of [600, 1200])
    await sharp(poster)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 95, effort: 6 })
      .toFile(path.join(root, `public/assets/posters/${id}-${width}.webp`));
  if (record.backdropSource) {
    const backdrop = await download(record.backdropSource);
    await sharp(backdrop)
      .resize({ width: 2560, withoutEnlargement: true })
      .webp({ quality: 94, effort: 6 })
      .toFile(path.join(root, `public/assets/backdrops/${id}.webp`));
  }
  console.log(`${id}: original artwork variants saved`);
}
