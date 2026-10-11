const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createOgImage() {
  const width = 1200;
  const height = 630;
  
  let logoBase64 = '';
  try {
    const logoBuf = fs.readFileSync(path.join(__dirname, '../public/logo.jpg'));
    logoBase64 = 'data:image/jpeg;base64,' + logoBuf.toString('base64');
  } catch(e) {
    console.error('Logo read error:', e.message);
  }

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0c14" />
        <stop offset="50%" stop-color="#121522" />
        <stop offset="100%" stop-color="#1e0a0d" />
      </linearGradient>
      <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#8B1A1A" />
        <stop offset="100%" stop-color="#ef4444" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="60" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Dark Luxury Tech Background -->
    <rect width="100%" height="100%" fill="url(#bg)" />
    
    <!-- Atmospheric Crimson Glows -->
    <circle cx="1080" cy="120" r="280" fill="#8B1A1A" opacity="0.28" filter="url(#glow)" />
    <circle cx="120" cy="560" r="220" fill="#8B1A1A" opacity="0.22" filter="url(#glow)" />

    <!-- Top Left Brand Badge -->
    <g transform="translate(80, 70)">
      ${logoBase64 ? `<image href="${logoBase64}" x="0" y="0" width="80" height="80" />` : ''}
      <text x="100" y="38" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="1">S TECH STORE</text>
      <text x="100" y="68" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-size="15" font-weight="800" fill="#ef4444" letter-spacing="2.5">OFFICIAL TECH HUB CAMBODIA</text>
    </g>

    <!-- Main Title Card -->
    <g transform="translate(80, 200)">
      <rect x="0" y="0" width="1040" height="240" rx="24" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5" />
      
      <text x="50" y="65" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#ffffff">
        ហាងលក់ និងជួសជុលកុំព្យូទ័រ ស្មាតហ្វូន
      </text>
      <text x="50" y="125" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#94a3b8">
        Genuine Laptops • Custom Gaming PC • IT Solutions &amp; Repairs
      </text>

      <!-- Mini Feature Pills inside Card -->
      <g transform="translate(50, 160)">
        <!-- Pill 1 -->
        <rect x="0" y="0" width="260" height="46" rx="12" fill="#8B1A1A" fill-opacity="0.3" stroke="#ef4444" stroke-width="1.5" />
        <text x="25" y="30" font-family="'Segoe UI', sans-serif" font-size="17" font-weight="800" fill="#fecaca">Official Warranty</text>

        <!-- Pill 2 -->
        <rect x="280" y="0" width="310" height="46" rx="12" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5" />
        <text x="305" y="30" font-family="'Segoe UI', sans-serif" font-size="17" font-weight="800" fill="#ffffff">Fast Delivery 25 Provinces</text>

        <!-- Pill 3 -->
        <rect x="610" y="0" width="300" height="46" rx="12" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5" />
        <text x="635" y="30" font-family="'Segoe UI', sans-serif" font-size="17" font-weight="800" fill="#ffffff">Best Price Guaranteed</text>
      </g>
    </g>

    <!-- Bottom Footer Bar -->
    <rect x="0" y="560" width="1200" height="70" fill="#07080c" />
    <line x1="0" y1="560" x2="1200" y2="560" stroke="#8B1A1A" stroke-width="2" />
    
    <text x="80" y="605" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ffffff" letter-spacing="1">
      www.s-tech-store.tech
    </text>
    
    <text x="1120" y="605" text-anchor="end" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ef4444">
      Phnom Penh, Cambodia • Telegram @STechStore
    </text>
  </svg>
  `;

  const outPng = path.join(__dirname, '../public/og-image.png');
  const outJpg = path.join(__dirname, '../public/og-image.jpg');

  await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toFile(outPng);
    
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toFile(outJpg);

  console.log('SUCCESS: Generated 1200x630 og-image.png and og-image.jpg');
}

createOgImage().catch(console.error);
