import fs from 'fs';
import zlib from 'zlib';

function create512Png() {
  const width = 512;
  const height = 512;

  // Raw RGBA pixels with scanline filter byte 0
  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Draw FloZ EDA dark rounded icon
      const dx = x - 256;
      const dy = y - 256;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 240) {
        // Transparent outer border
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      } else if (dist > 230) {
        // Outer dark rim
        rawData[pxOffset] = 51;
        rawData[pxOffset + 1] = 65;
        rawData[pxOffset + 2] = 85;
        rawData[pxOffset + 3] = 255;
      } else if ((x > 120 && x < 150 && y > 120 && y < 390) || (x > 120 && x < 390 && y > 120 && y < 150) || (x > 120 && x < 350 && y > 240 && y < 270)) {
        // FloZ 'F' symbol in bright blue / gold
        rawData[pxOffset] = 56;
        rawData[pxOffset + 1] = 189;
        rawData[pxOffset + 2] = 248;
        rawData[pxOffset + 3] = 255;
      } else {
        // Dark EDA canvas background
        rawData[pxOffset] = 15;
        rawData[pxOffset + 1] = 23;
        rawData[pxOffset + 2] = 42;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync('assets/icon.png', png);
  console.log('✓ Authentic 512x512 PNG generated at assets/icon.png (size:', png.length, 'bytes)');
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crcData = buf.subarray(4, 8 + len);
  const crc = crc32(crcData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Standard IEEE 802.3 CRC32
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

create512Png();
