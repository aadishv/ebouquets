/**
 * Generate a bouquet image by compositing multiple flower images
 * Images are arranged horizontally with overlap
 */

const FLOWER_HEIGHT = 150;
const FLOWER_OVERLAP = 0.35; // 35% overlap

/**
 * Load an image from URL into a canvas
 */
async function loadImage(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Scale image to target height while maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      const width = Math.round(FLOWER_HEIGHT * aspectRatio);
      
      canvas.width = width;
      canvas.height = FLOWER_HEIGHT;
      ctx.drawImage(img, 0, 0, width, FLOWER_HEIGHT);
      
      resolve(canvas);
    };
    
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    
    img.src = url;
  });
}

/**
 * Composite multiple flower images into a single bouquet
 */
export async function generateBouquetImage(
  flowerUrls: string[]
): Promise<string | null> {
  if (flowerUrls.length === 0) return null;

  try {
    // Load all flower images
    const flowerCanvases = await Promise.all(
      flowerUrls.map((url) => loadImage(url))
    );

    // Calculate positions and total width
    let totalWidth = 0;
    const positions: number[] = [];
    
    for (let i = 0; i < flowerCanvases.length; i++) {
      const flowerCanvas = flowerCanvases[i];
      if (i === 0) {
        positions.push(0);
        totalWidth = flowerCanvas.width;
      } else {
        const prevCanvas = flowerCanvases[i-1];
        const overlap = prevCanvas.width * FLOWER_OVERLAP;
        const x = positions[i-1] + prevCanvas.width - overlap;
        positions.push(x);
        totalWidth = x + flowerCanvas.width;
      }
    }

    // Create bouquet canvas with padding for fanning
    const bouquetCanvas = document.createElement("canvas");
    const paddedWidth = totalWidth + 20;
    const paddedHeight = FLOWER_HEIGHT + 25;
    bouquetCanvas.width = paddedWidth;
    bouquetCanvas.height = paddedHeight;
    
    const ctx = bouquetCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // White background for JPEGs
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, paddedWidth, paddedHeight);

    // Draw flowers with fanning effect
    const midPoint = totalWidth / 2;
    for (let i = 0; i < flowerCanvases.length; i++) {
      const flowerCanvas = flowerCanvases[i];
      const x = positions[i];
      
      ctx.save();
      
      const centerX = x + flowerCanvas.width / 2;
      const offsetFromCenter = centerX - midPoint;
      
      // Fan out effect: rotate and offset vertically based on distance from center
      const rotation = (offsetFromCenter / (totalWidth || 1)) * 0.6; 
      const yOffset = Math.abs(offsetFromCenter / (totalWidth || 1)) * 20;
      
      ctx.translate(centerX + 10, (FLOWER_HEIGHT / 2) + yOffset + 2);
      ctx.rotate(rotation);
      ctx.drawImage(flowerCanvas, -flowerCanvas.width / 2, -FLOWER_HEIGHT / 2);
      
      ctx.restore();
    }

    // Convert to JPEG with quality compression
    const trim = 10;
    const finalHeight = Math.max(1, paddedHeight - 2 * trim);
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = paddedWidth;
    finalCanvas.height = finalHeight;
    const finalCtx = finalCanvas.getContext("2d");
    if (!finalCtx) return bouquetCanvas.toDataURL("image/jpeg", 0.8);
    
    finalCtx.fillStyle = "#ffffff";
    finalCtx.fillRect(0, 0, paddedWidth, finalHeight);
    finalCtx.drawImage(bouquetCanvas, 0, trim, paddedWidth, finalHeight, 0, 0, paddedWidth, finalHeight);
    return finalCanvas.toDataURL("image/jpeg", 0.8);
  } catch (error) {
    console.error("Failed to generate bouquet image:", error);
    return null;
  }
}

/**
 * Generate multiple bouquet images (one per recipient)
 */
export async function generateBouquetImages(
  ordersByRecipient: Record<string, { flowers: string[] }[]>
): Promise<Record<string, string | null>> {
  const bouquets: Record<string, string | null> = {};

  for (const [recipient, orders] of Object.entries(ordersByRecipient)) {
    const allFlowerUrls = orders.flatMap((order) => order.flowers);
    bouquets[recipient] = await generateBouquetImage(allFlowerUrls);
  }

  return bouquets;
}
