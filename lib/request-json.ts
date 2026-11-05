/** An expected client error, safe to return without exposing internal failures. */
export class RequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Bound actual body bytes; Content-Length may be missing or inaccurate. */
export async function readRequestJson(
  request: Request,
  limit = 40_000,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("JSON required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new RequestError("Request too large.", 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new RequestError("Please send valid JSON.");
  }
}
