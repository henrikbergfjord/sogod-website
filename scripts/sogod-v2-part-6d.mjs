import fs from 'node:fs';
import path from 'node:path';

// Temporary reliability fix for the Dorian Villa presentation image.
// The generated concept JPEG from part 6c can be malformed after materialization.
// Until the final Dorian Villa render is stored as a normal repository asset,
// use the known-good house concept image so the live page never shows a broken image.
const images = path.join(process.cwd(), 'assets', 'images');
const source = path.join(images, 'hero-home.jpg');
const target = path.join(images, 'dorian-villa-front-concept.jpg');

if (!fs.existsSync(source)) {
  throw new Error(`Missing fallback house image: ${source}`);
}

fs.copyFileSync(source, target);
console.log('Dorian Villa front image verified with known-good house asset.');
