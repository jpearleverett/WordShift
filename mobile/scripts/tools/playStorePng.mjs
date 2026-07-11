import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const IHDR_CHUNK_TYPE = Buffer.from('IHDR');
const MINIMUM_PNG_HEADER_BYTES = 33;

export function parsePngMetadata(buffer, label = 'PNG data') {
  if (
    !Buffer.isBuffer(buffer)
    || buffer.length < PNG_SIGNATURE.length
    || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw new Error(`${label} has an invalid PNG signature`);
  }
  if (buffer.length < MINIMUM_PNG_HEADER_BYTES) {
    throw new Error(`${label} is missing a complete IHDR chunk`);
  }

  const ihdrLength = buffer.readUInt32BE(8);
  const ihdrType = buffer.subarray(12, 16);
  if (ihdrLength !== 13 || !ihdrType.equals(IHDR_CHUNK_TYPE)) {
    throw new Error(`${label} does not begin with a valid IHDR chunk`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
  };
}

export async function readPngMetadata(filePath) {
  const buffer = await fs.readFile(filePath);
  return parsePngMetadata(buffer, path.basename(filePath));
}

export async function readPng(filePath) {
  const buffer = await fs.readFile(filePath);
  parsePngMetadata(buffer, path.basename(filePath));
  return PNG.sync.read(buffer);
}

export async function writeOpaquePng(filePath, png) {
  const { width, height, data } = png ?? {};
  if (
    !Number.isInteger(width)
    || width <= 0
    || !Number.isInteger(height)
    || height <= 0
    || !(data instanceof Uint8Array)
    || data.length !== width * height * 4
  ) {
    throw new Error('writeOpaquePng requires positive dimensions and RGBA pixel data');
  }

  const flattened = new PNG({ width, height });
  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3] / 255;
    flattened.data[offset] = Math.round(data[offset] * alpha);
    flattened.data[offset + 1] = Math.round(data[offset + 1] * alpha);
    flattened.data[offset + 2] = Math.round(data[offset + 2] * alpha);
    flattened.data[offset + 3] = 255;
  }

  const encoded = PNG.sync.write(flattened, {
    colorType: 2,
    inputColorType: 6,
    inputHasAlpha: true,
  });
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, encoded);
}
