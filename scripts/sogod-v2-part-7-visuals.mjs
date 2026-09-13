import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==='.git'||entry.name==='node_modules'||entry.name==='.github') continue;
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(p));
    else if(entry.isFile()&&entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const cards = [
  ['Private island day','assets/images/beaches-hero.jpg'],
  ['Mayon ATV adventure','assets/images/atv-hero.jpg'],
  ['Beach & pool escape','assets/images/beaches-hero.jpg'],
  ['Pools, slides & a family day','assets/images/hero-home.jpg'],
  ['Fresh coconut & farm life','assets/images/philippines-hero.jpg'],
  ['A day with the people of Albay','assets/images/philippines-hero.jpg'],
  ['Your own pool celebration','assets/images/hero-home.jpg'],
  ['Local food, delivered','assets/images/food-culture-hero.jpg'],
  ['A table for everyone','assets/images/boodle-fight-hero.jpg'],
  ['Catering','assets/images/boodle-fight-hero.jpg'],
  ['Flowers & money bouquet','assets/images/hero-home.jpg'],
  ['Local crafts','assets/images/philippines-hero.jpg'],
  ['Shopping & errands','assets/images/connected-hero.jpg'],
  ['Local guide','assets/images/philippines-hero.jpg'],
  ['Airport pickup','assets/images/arrival-hero.jpg'],
  ['Airport drop-off','assets/images/arrival-hero.jpg'],
  ['Scooter rental','assets/images/freedom-hero.jpg']
];

function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

for(const file of walk(ROOT)){
  let html=fs.readFileSync(file,'utf8');
  const before=html;

  if(html.includes('Three different stays.') || html.includes('DORIAN VILLA · OUR HOME BASE')){
    html=html.replace(/<img\b([^>]*?)alt=["']Concept view of Dorian Villa with reception and mini store["']([^>]*)>/i,
      '<img class="dorian-villa-feature-image" src="assets/images/dorian-villa-front-concept.jpg" alt="Dorian Villa concept with reception, mini store and main residence">');
    if(!html.includes('sogod-dorian-visual-upgrade')){
      html=html.replace('</head>',`<style id="sogod-dorian-visual-upgrade">
.dorian-villa-feature-image{width:100%!important;height:clamp(360px,38vw,560px)!important;display:block!important;object-fit:cover!important;object-position:center!important;border-radius:24px!important;box-shadow:0 22px 55px rgba(12,40,31,.16)!important}
@media(min-width:1100px){.dorian-villa-feature-image{min-width:620px}}
@media(max-width:760px){.dorian-villa-feature-image{height:300px!important;border-radius:18px!important}}
</style></head>`);
    }
  }

  if(html.includes('What would make your day?') || html.includes('A little adventure.')){
    for(const [title,img] of cards){
      const re=new RegExp(`<article\\b([^>]*)>(?![\\s\\S]*?experience-card-image)([\\s\\S]*?<h3[^>]*>\\s*${esc(title)}\\s*</h3>[\\s\\S]*?)</article>`,'i');
      html=html.replace(re,(m,attrs,body)=>`<article${attrs}><img class="experience-card-image" src="${img}" alt="${title} — concept illustration" loading="lazy">${body}</article>`);
    }
    if(!html.includes('sogod-experience-image-upgrade')){
      html=html.replace('</head>',`<style id="sogod-experience-image-upgrade">
.experience-card-image{width:calc(100% + 32px)!important;max-width:none!important;height:175px!important;object-fit:cover!important;display:block!important;margin:-16px -16px 16px!important;border-radius:14px 14px 0 0!important}
article:has(.experience-card-image){overflow:hidden!important}
@media(min-width:1200px){.experience-card-image{height:190px!important}}
@media(max-width:760px){.experience-card-image{height:210px!important}}
</style></head>`);
    }
  }

  if(html!==before){
    fs.writeFileSync(file,html);
    console.log('Visual upgrade:',path.relative(ROOT,file));
  }
}
