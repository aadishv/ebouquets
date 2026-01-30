import { removeBackground } from '@imgly/background-removal-node';
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

async function processTulip() {
  const trimAmount = parseInt(process.argv[2]);
  if (isNaN(trimAmount)) {
    console.error("Please provide a trim amount, e.g., `bun trim_tulip.js 20` or `bun trim_tulip.js -20` to expand.");
    process.exit(1);
  }

  const inputPath = path.join(process.cwd(), 'public', 'tulip.png');
  const tempPath = path.join(process.cwd(), 'public', 'tulip_temp.png');
  
  console.log(`Trimming ${trimAmount}px from both sides of the tulip...`);
  try {
    const image = await loadImage(inputPath);
    const newWidth = Math.max(1, image.width - (trimAmount * 2));
    const canvas = createCanvas(newWidth, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw image shifted by trimAmount
    ctx.drawImage(image, -trimAmount, 0);
    
    fs.writeFileSync(tempPath, canvas.toBuffer('image/png'));
    
    console.log(`Refreshing background removal...`);
    const blob = await removeBackground(tempPath);
    const buffer = Buffer.from(await blob.arrayBuffer());
    
    fs.writeFileSync(inputPath, buffer);
    console.log(`Successfully processed tulip. New width: ${newWidth}px`);
    
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  } catch (e) {
    console.error(`Failed to process tulip:`, e);
  }
}

processTulip();
