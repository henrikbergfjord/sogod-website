import fs from 'node:fs';

const page = 'request.html';
if (!fs.existsSync(page)) throw new Error('request.html not found after materialization');

const items = [
  ['Private island day', '/assets/images/philippines-hero.jpg'],
  ['Mayon ATV adventure', '/assets/images/atv-hero.jpg'],
  ['Beach & pool escape', '/assets/images/freedom-hero.jpg'],
  ['Pools, slides & a family day', '/assets/images/hero-home.jpg'],
  ['Fresh coconut & farm life', '/assets/images/philippines-hero.jpg'],
  ['A day with the people of Albay', '/assets/images/philippines-hero.jpg'],
  ['Your own pool celebration', '/assets/images/hero-home.jpg'],
  ['Local food, delivered', '/assets/images/boodle-fight-hero.jpg'],
  ['A table for everyone', '/assets/images/boodle-fight-hero.jpg'],
  ['A gift with a personal touch', '/assets/images/money-guide-hero.jpg'],
  ['Made here, taken home', '/assets/images/philippines-hero.jpg'],
  ['A helping hand nearby', '/assets/images/connected-hero.jpg'],
  ['Your local guide', '/assets/images/philippines-hero.jpg'],
  ['Airport pickup', '/assets/images/arrival-hero.jpg'],
  ['Airport drop-off', '/assets/images/arrival-hero.jpg'],
  ['Scooter rental', '/assets/images/freedom-hero.jpg']
];

let html = fs.readFileSync(page, 'utf8');
for (const [title] of items) {
  if (!html.includes(title)) throw new Error(`Request option missing from page: ${title}`);
}

const css = `
<style id="sogod-request-thumbnails">
  .sogod-service-thumb{width:76px;height:58px;object-fit:cover;border-radius:10px;flex:0 0 76px;border:1px solid rgba(10,55,44,.12);background:#eee;box-shadow:0 2px 10px rgba(0,0,0,.07)}
  .sogod-service-label{display:flex!important;align-items:center!important;gap:12px!important;min-width:0}
  .sogod-service-label .sogod-service-title{font-weight:700;line-height:1.2}
  @media(max-width:700px){.sogod-service-thumb{width:64px;height:50px;flex-basis:64px}.sogod-service-label{gap:9px!important}}
</style>`;

const js = `
<script id="sogod-request-thumbnails-js">
(() => {
  const items = ${JSON.stringify(items)};
  const normalize = s => String(s || '').replace(/\\s+/g,' ').trim();
  const install = () => {
    let installed = 0;
    for (const [title, src] of items) {
      const target = [...document.querySelectorAll('label')].find(el => normalize(el.textContent).includes(title));
      if (!target || target.querySelector('.sogod-service-thumb')) continue;
      target.classList.add('sogod-service-label');
      const textNodes = [...target.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && normalize(n.textContent).includes(title));
      const img = document.createElement('img');
      img.className = 'sogod-service-thumb'; img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      const span = document.createElement('span'); span.className = 'sogod-service-title'; span.textContent = title;
      for (const n of textNodes) n.remove();
      const checkbox = target.querySelector('input[type="checkbox"]');
      if (checkbox && checkbox.nextSibling) checkbox.after(img, span); else target.prepend(img, span);
      installed++;
    }
    document.documentElement.dataset.sogodThumbs = String(installed);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
})();
</script>`;

if (!html.includes('id="sogod-request-thumbnails"')) html = html.replace('</head>', `${css}\n</head>`);
if (!html.includes('id="sogod-request-thumbnails-js"')) html = html.replace('</body>', `${js}\n</body>`);
fs.writeFileSync(page, html);
console.log(`Request thumbnails patch installed for ${items.length} options`);
