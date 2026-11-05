/** Only bounded, square JPEGs are stored and served as account photos. */
export function validateProfilePhoto(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 180000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))
    throw new Error("Choose a JPEG, PNG or WebP photo using the photo picker.");
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(value.slice(value.indexOf(",") + 1)), c => c.charCodeAt(0)); }
  catch { throw new Error("This photo could not be read. Please choose another image."); }
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217)
    throw new Error("The photo must be a valid JPEG image.");
  let offset = 2;
  const frames = [192,193,194,195,197,198,199,201,202,203,205,206,207];
  while (offset + 8 < bytes.length) {
    if (bytes[offset++] !== 255) break;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) break;
    if (marker === 1 || marker >= 208 && marker <= 215) continue;
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    if (frames.includes(marker)) {
      const height = bytes[offset + 3] * 256 + bytes[offset + 4];
      const width = bytes[offset + 5] * 256 + bytes[offset + 6];
      if (width >= 32 && width <= 512 && width === height) return value;
      break;
    }
    offset += length;
  }
  throw new Error("The profile photo must be a square image up to 512 pixels. Use the photo picker to prepare it.");
}

export async function readPhotoRequest(req: Request): Promise<{image: unknown}> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Choose a photo first.");
  const decoder = new TextDecoder(); let text = "", size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 200000) { await reader.cancel(); throw new Error("The prepared photo is too large."); }
      text += decoder.decode(chunk.value, {stream:true});
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
