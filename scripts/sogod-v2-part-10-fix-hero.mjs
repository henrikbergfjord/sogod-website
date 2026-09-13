import fs from 'node:fs';
const img='assets/images/dorian-villa-hero-source.jpg';
const target='assets/images/dorian-villa-hero.jpg';
if(fs.existsSync(img)) fs.copyFileSync(img,target);
let html=fs.readFileSync('index.html','utf8');
html=html.replace("url('/assets/images/dorian-villa-hero.jpg')","url('/assets/images/dorian-villa-hero.jpg')");
fs.writeFileSync('index.html',html);
console.log('Hero asset finalized');