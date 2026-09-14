import fs from 'node:fs';
const required=[
  'assets/images/dorian-villa-hero.jpg',
  'assets/images/atv-hero.jpg',
  'assets/images/philippines-hero.jpg',
  'assets/images/hero-home.jpg',
  'assets/images/freedom-hero.jpg',
  'assets/images/boodle-fight-hero.jpg'
];
for(const p of required){
  if(!fs.existsSync(p)) throw new Error(`Missing required asset: ${p}`);
  const b=fs.readFileSync(p);
  if(p.endsWith('.jpg')){
    if(b.length<5000) throw new Error(`Image too small or placeholder: ${p} (${b.length} bytes)`);
    if(!(b[0]===0xff&&b[1]===0xd8&&b[b.length-2]===0xff&&b[b.length-1]===0xd9)) throw new Error(`Invalid JPEG: ${p}`);
  }
}
const html=fs.readFileSync('index.html','utf8');
if(!html.includes("/assets/images/hero-home.jpg")) throw new Error('Homepage is not referencing verified Dorian Villa hero');
if(!html.includes('Explore Albay')) throw new Error('Homepage experience grid missing');
console.log('Homepage assets verified');