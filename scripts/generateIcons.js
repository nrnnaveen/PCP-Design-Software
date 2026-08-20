import fs from 'fs';
import path from 'path';

// Generate standard FloZ EDA icon SVG
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="trace1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="trace2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#dc2626" />
    </linearGradient>
  </defs>
  <!-- Background Rounded Shield -->
  <rect width="512" height="512" rx="100" fill="url(#bg)" stroke="#334155" stroke-width="12" />
  
  <!-- PCB Grid Pattern -->
  <circle cx="128" cy="128" r="6" fill="#475569" />
  <circle cx="256" cy="128" r="6" fill="#475569" />
  <circle cx="384" cy="128" r="6" fill="#475569" />
  <circle cx="128" cy="256" r="6" fill="#475569" />
  <circle cx="256" cy="256" r="6" fill="#475569" />
  <circle cx="384" cy="256" r="6" fill="#475569" />
  <circle cx="128" cy="384" r="6" fill="#475569" />
  <circle cx="256" cy="384" r="6" fill="#475569" />
  <circle cx="384" cy="384" r="6" fill="#475569" />

  <!-- 45-degree PCB Copper Traces -->
  <path d="M 128 384 L 200 384 L 256 328 L 256 200 L 312 144 L 384 144" fill="none" stroke="url(#trace1)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 128 144 L 200 144 L 256 200 L 328 200 L 384 256 L 384 384" fill="none" stroke="url(#trace2)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Vias with Gold Annular Rings -->
  <circle cx="128" cy="384" r="28" fill="#eab308" />
  <circle cx="128" cy="384" r="14" fill="#0f172a" />

  <circle cx="384" cy="144" r="28" fill="#eab308" />
  <circle cx="384" cy="144" r="14" fill="#0f172a" />

  <circle cx="128" cy="144" r="28" fill="#eab308" />
  <circle cx="128" cy="144" r="14" fill="#0f172a" />

  <circle cx="384" cy="384" r="28" fill="#eab308" />
  <circle cx="384" cy="384" r="14" fill="#0f172a" />

  <!-- Center IC Chip Landmark -->
  <rect x="216" y="216" width="80" height="80" rx="12" fill="#1e293b" stroke="#64748b" stroke-width="8" />
  <circle cx="236" cy="236" r="6" fill="#38bdf8" />
  <text x="256" y="264" fill="#f8fafc" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">FloZ</text>
</svg>`;

fs.mkdirSync(path.resolve('assets'), { recursive: true });
fs.writeFileSync(path.resolve('assets/icon.svg'), svgIcon, 'utf-8');

// Also generate 1x1 fallback PNG header if canvas or tool not available
// We will write a valid 512x512 PNG buffer or use simple base64 PNG
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHzc1p5ygAAAABJRU5ErkJggg==',
  'base64'
);
fs.writeFileSync(path.resolve('assets/icon.png'), pngBuffer);

console.log('✓ Assets generated in assets/icon.svg and assets/icon.png');
