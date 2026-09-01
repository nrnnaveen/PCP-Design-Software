/**
 * Script to generate a 1200x630 PNG OpenGraph / Social Share image
 * Uses built-in node:zlib and CRC32 without external dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generateOgPng(outputPath) {
  const width = 1200;
  const height = 630;

  // Uncompressed RGBA scanlines: 1 filter byte + width * 4 bytes per row
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Background gradient: dark navy/slate (#0d1117 to #161b22)
      const grad = (y / height) * 0.4 + (x / width) * 0.2;
      let r = Math.floor(13 + grad * 12);
      let g = Math.floor(17 + grad * 14);
      let b = Math.floor(23 + grad * 18);

      // Grid lines every 30px (CAD blueprint grid)
      if (x % 30 === 0 || y % 30 === 0) {
        r = Math.min(255, r + 15);
        g = Math.min(255, g + 20);
        b = Math.min(255, b + 30);
      }
      if (x % 150 === 0 || y % 150 === 0) {
        r = Math.min(255, r + 25);
        g = Math.min(255, g + 35);
        b = Math.min(255, b + 50);
      }

      // Border outline (8px)
      if (x < 8 || x >= width - 8 || y < 8 || y >= height - 8) {
        r = 37;
        g = 99;
        b = 235; // Blue-600
      }

      // Center decorative badge / IC outline
      if (x >= 450 && x <= 750 && y >= 200 && y <= 350) {
        if (x <= 453 || x >= 747 || y <= 203 || y >= 347) {
          r = 59;
          g = 130;
          b = 246; // Blue-500
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = 255; // Alpha
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression method
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // Interlace: None
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const finalPng = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, finalPng);
  console.log(`Generated 1200x630 PNG: ${outputPath} (${finalPng.length} bytes)`);
}

const out = path.resolve(__dirname, '../public/og-image.png');
generateOgPng(out);
