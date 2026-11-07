export const MAX_NODE_BATCH_BYTES = 24_000;

export const payloadBytes = value => new TextEncoder().encode(JSON.stringify(value)).byteLength;

export function chunkPayloadItems(base, field, items, maxBytes = MAX_NODE_BATCH_BYTES) {
  const chunks = [];
  let current = [];
  for (const item of items) {
    const candidate = [...current, item];
    if (payloadBytes({ ...base, [field]: candidate }) <= maxBytes) {
      current = candidate;
      continue;
    }
    if (!current.length)
      throw new Error(`A single ${field} item exceeds the ${maxBytes}-byte batch limit.`);
    chunks.push({ ...base, [field]: current });
    current = [item];
    if (payloadBytes({ ...base, [field]: current }) > maxBytes)
      throw new Error(`A single ${field} item exceeds the ${maxBytes}-byte batch limit.`);
  }
  if (current.length) chunks.push({ ...base, [field]: current });
  return chunks;
}

export async function sendChunked(send, base, field, items, maxBytes = MAX_NODE_BATCH_BYTES) {
  const chunks = chunkPayloadItems(base, field, items, maxBytes);
  for (const chunk of chunks) await send(chunk);
  return chunks.length;
}

export async function uploadCollection({ send, collection, movies, eligible, publicationStart = 0, maxBytes = MAX_NODE_BATCH_BYTES }) {
  await sendChunked(
    payload => send("movies", payload),
    { collection },
    "movies",
    movies,
    maxBytes,
  );
  for (let offset = publicationStart; offset < eligible.length; offset += 20) {
    const items = eligible.slice(offset, offset + 20).map(item => ({ movieId: item.movieId, rank: item.rank }));
    await send("membership", { collection, cursor: offset + items.length, items });
  }
  await send("publish", { collection });
}
