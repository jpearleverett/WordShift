/**
 * The 13 room backgrounds ship as near-lossless WebP (launch readiness PS-2:
 * 12.0 MB of PNG became 6.4 MB, max per-channel difference 2 on every visible
 * pixel). The window-sky masks stay PNG and are overlaid on the room with the
 * same box, so a room and its mask must keep one aspect ratio or the tinted
 * sky slides off the painted window.
 *
 * Dimensions are read from the file headers directly (no sharp: this suite
 * must run everywhere the rest of Jest does).
 */
import fs from 'fs';
import path from 'path';

const MOBILE = path.resolve(__dirname, '../..');
const ROOM_VIEW = fs.readFileSync(path.join(MOBILE, 'src/components/home/RoomView.tsx'), 'utf8');

function webpSize(file: string): { width: number; height: number } {
  const b = fs.readFileSync(file);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  }
  // Lossy 'VP8 ': 14-bit dimensions after the 3-byte start code.
  return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
}

function pngSize(file: string): { width: number; height: number } {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function requires(pattern: RegExp): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of ROOM_VIEW.matchAll(pattern)) out.set(m[1], path.resolve(MOBILE, 'src/components/home', m[2]));
  return out;
}

describe('room background art', () => {
  const rooms = requires(/(\w+): require\('(\.\.\/\.\.\/\.\.\/assets\/rooms\/[a-z_]+\.webp)'\)/g);
  const masks = requires(/(\w+): require\('(\.\.\/\.\.\/\.\.\/assets\/rooms\/windows\/[a-z_]+\.png)'\)/g);

  it('requires all thirteen room backgrounds as WebP files that exist', () => {
    expect(rooms.size).toBe(13);
    for (const file of rooms.values()) expect(fs.existsSync(file)).toBe(true);
    expect(ROOM_VIEW).not.toMatch(/assets\/rooms\/[a-z_]+\.png/);
  });

  it('keeps every window mask on its room art aspect ratio', () => {
    expect(masks.size).toBeGreaterThanOrEqual(10);
    for (const [theme, maskFile] of masks) {
      const roomFile = rooms.get(theme);
      expect(roomFile).toBeDefined();
      const room = webpSize(roomFile!);
      const mask = pngSize(maskFile);
      expect(room).toEqual({ width: 1456, height: 720 });
      // Masks are downscaled to 400 wide; a row of rounding is allowed.
      expect(Math.abs(mask.height - (mask.width * room.height) / room.width)).toBeLessThanOrEqual(2);
    }
  });
});
