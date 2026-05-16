const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function updateIcons() {
  const sourceImage = process.argv[2];

  if (!sourceImage) {
    console.error('Usage: node update-assets.js <path-to-source-image>');
    process.exit(1);
  }

  if (!fs.existsSync(sourceImage)) {
    console.error(`Source image not found: ${sourceImage}`);
    process.exit(1);
  }

  // Check if sharp is installed
  try {
    require.resolve('sharp');
  } catch (e) {
    console.log('Installing sharp for image processing...');
    execSync('npm install --save-dev sharp', { stdio: 'inherit' });
  }

  const sharp = require('sharp');
  const assetsDir = path.join(__dirname, 'assets');

  const targets = [
    { name: 'icon.png', width: 1024, height: 1024 },
    { name: 'adaptive-icon.png', width: 1024, height: 1024 },
    { name: 'favicon.png', width: 48, height: 48 },
    { name: 'splash-icon.png', width: 2048, height: 2048, fit: 'contain', background: '#ffffff' }
  ];

  console.log('Generating icons...');

  for (const target of targets) {
    const targetPath = path.join(assetsDir, target.name);
    await sharp(sourceImage)
      .resize(target.width, target.height, {
        fit: target.fit || 'cover',
        background: target.background || { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(targetPath);
    console.log(`✓ Generated ${target.name}`);
  }

  console.log('\nAll icons updated successfully!');
}

updateIcons().catch(err => {
  console.error('Error updating icons:', err);
  process.exit(1);
});
