import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('assets/images');
fs.mkdirSync(outDir, { recursive: true });

const defs = `
  <defs>
    <linearGradient id="v" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E9D5FF" />
      <stop offset="38%" stop-color="#A855F7" />
      <stop offset="100%" stop-color="#5B21B6" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.55" />
      <stop offset="55%" stop-color="#2E1065" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C084FC" stop-opacity="0" />
      <stop offset="45%" stop-color="#C084FC" stop-opacity="0.75" />
      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0" />
    </linearGradient>
  </defs>
`;

const mark = (scale = 1, color = 'url(#v)') => {
  const s = scale;
  return `
    <g transform="translate(512 512) scale(${s}) translate(-512 -512)">
      <circle cx="512" cy="512" r="330" fill="none" stroke="url(#ring)" stroke-width="3" />
      <circle cx="512" cy="512" r="392" fill="none" stroke="#7C3AED" stroke-opacity="0.18" stroke-width="1.5" />
      <path d="M 326 350 L 506 690 L 698 350"
        fill="none" stroke="${color}" stroke-width="104"
        stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="742" cy="300" r="26" fill="#E9D5FF" />
      <circle cx="742" cy="300" r="48" fill="#C084FC" fill-opacity="0.16" />
    </g>
  `;
};

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs}
  <rect width="1024" height="1024" fill="#000000" />
  <rect width="1024" height="1024" fill="url(#glow)" />
  ${mark(1)}
</svg>`;

const transparentMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs}
  ${mark(0.72)}
</svg>`;

const monochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.72) translate(-512 -512)">
    <path d="M 326 350 L 506 690 L 698 350"
      fill="none" stroke="#FFFFFF" stroke-width="104"
      stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="742" cy="300" r="26" fill="#FFFFFF" />
  </g>
</svg>`;

const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs}
  <g transform="translate(512 440) scale(0.68) translate(-512 -512)">${mark(1)}</g>
  <text x="512" y="790" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
    font-size="132" font-weight="800" letter-spacing="34" fill="#F5F3FF">VYBE</text>
  <text x="512" y="858" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
    font-size="26" font-weight="500" letter-spacing="14" fill="#A78BFA">FEEL THE MUSIC</text>
</svg>`;

const notificationSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <g fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round">
    <path d="M 22 56 L 22 40" />
    <path d="M 37 68 L 37 28" />
    <path d="M 52 60 L 52 36" />
    <path d="M 67 74 L 67 22" />
    <path d="M 82 54 L 82 42" />
  </g>
</svg>`;

const files = [
  ['icon.png', iconSvg, 1024],
  ['adaptive-icon.png', transparentMarkSvg, 1024],
  ['monochrome-icon.png', monochromeSvg, 1024],
  ['splash-icon.png', splashSvg, 1024],
  ['notification-icon.png', notificationSvg, 96],
];

for (const [name, svg, size] of files) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, name));
  console.log(`created assets/images/${name}`);
}

// A reusable default artwork / OG fallback used by the UI.
const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs}
  <rect width="1024" height="1024" fill="#0B0B0F" />
  <rect width="1024" height="1024" fill="url(#glow)" />
  ${mark(0.55)}
</svg>`;

await sharp(Buffer.from(fallbackSvg))
  .resize(1024, 1024)
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, 'artwork-fallback.png'));
console.log('created assets/images/artwork-fallback.png');
