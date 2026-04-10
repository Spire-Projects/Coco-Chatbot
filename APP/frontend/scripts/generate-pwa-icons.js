/**
 * Script para generar íconos PWA desde una imagen base
 * Requiere: npm install -D sharp
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [192, 512];
const inputImage = join(__dirname, '../public/logo.png');
const outputDir = join(__dirname, '../public');

async function generateIcons() {
  console.log('🎨 Generando íconos PWA...\n');

  for (const size of sizes) {
    // Ícono normal
    const outputNormal = join(outputDir, `pwa-${size}x${size}.png`);
    await sharp(inputImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputNormal);
    console.log(`✓ Generado: pwa-${size}x${size}.png`);

    // Ícono maskable (con padding para adaptive icons)
    const outputMaskable = join(outputDir, `pwa-maskable-${size}x${size}.png`);
    const padding = Math.floor(size * 0.1); // 10% padding
    await sharp(inputImage)
      .resize(size - padding * 2, size - padding * 2, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputMaskable);
    console.log(`✓ Generado: pwa-maskable-${size}x${size}.png`);
  }

  console.log('\n✅ Todos los íconos PWA generados exitosamente!');
}

generateIcons().catch(console.error);
