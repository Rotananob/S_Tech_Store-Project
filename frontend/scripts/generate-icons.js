const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = path.join(__dirname, '../public/logo.jpg');
const outputDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [192, 512];

async function generateIcons() {
  try {
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}.png`);
      await sharp(inputImagePath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated ${outputPath}`);
    }
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
