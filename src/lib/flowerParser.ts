/**
 * Map flower names to local image paths
 */
const FLOWER_IMAGE_MAP: Record<string, string> = {
  "rose": "/rose.png",
  "roses": "/rose.png",
  "tulip": "/tulip.png",
  "tulips": "/tulip.png",
  "orange tulip": "/tulip.png",
  "orange tulips": "/tulip.png",
  "cornflower": "/cornflower.png",
  "cornflowers": "/cornflower.png",
  "blue cornflower": "/cornflower.png",
  "blue cornflowers": "/cornflower.png",
  "gardenia": "/gardenia.png",
  "gardenias": "/gardenia.png",
  "dandelion": "/dandelion.png",
  "dandelions": "/dandelion.png",
  "white dandelion": "/dandelion.png",
  "white dandelions": "/dandelion.png",
};

export interface ParsedFlower {
  name: string;
  url?: string;
}

export function parseFlowerHtml(htmlContent: string): ParsedFlower[] {
  if (!htmlContent) return [];

  const flowers: ParsedFlower[] = [];
  const entries = htmlContent.split(/","/).map(s => s.trim());

  for (let entry of entries) {
    entry = entry.replace(/^"|"$/g, '');
    const nameMatch = entry.match(/<p>\s*([^:<]+):/i);
    if (nameMatch) {
      const flowerName = nameMatch[1].trim().toLowerCase();
      let localImagePath = FLOWER_IMAGE_MAP[flowerName];
      
      if (!localImagePath) {
        for (const [key, path] of Object.entries(FLOWER_IMAGE_MAP)) {
          if (flowerName.includes(key) || key.includes(flowerName)) {
            localImagePath = path;
            break;
          }
        }
      }
      
      if (localImagePath) {
        flowers.push({
          name: flowerName,
          url: localImagePath,
        });
      }
    }
  }

  return flowers;
}
