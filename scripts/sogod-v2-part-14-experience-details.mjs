import fs from 'node:fs';
import path from 'node:path';

const items = [
  {
    slug:'mayon-atv',
    title:'Mayon ATV Adventure',
    kicker:'Adventure · Mayon',
    image:'/assets/images/atv-hero.jpg',
    intro:'Ride through volcanic landscapes and countryside around Mayon with a local ATV operator.',
    what:'An outdoor ATV experience designed around the Mayon area. Final route, operator, safety rules and riding time are confirmed before reservation.',
    duration:'To be confirmed with operator',
    age:'Operator rules to be confirmed',
    location:'Mayon area, Albay',
    address:'Exact meeting point confirmed with booking',
    price:'Price to be confirmed',
    level:'Moderate outdoor activity',
    bring:'Closed shoes, sun protection, water and clothes suitable for dust or mud.',
    included:'Final inclusions depend on the selected operator and route.',
    note:'Weather, volcanic safety zones and operator availability can affect the final plan.'
  },
  {
    slug:'beach-day',
    title:'Beach Day',
    kicker:'Water & nature · Albay',
    image:'/assets/images/beaches-hero.jpg',
    intro:'A relaxed day by the water, with transport and practical arrangements built around your stay.',
    what:'A flexible beach outing rather than a fixed package. SOGOD can help identify a suitable beach, arrange transport and coordinate practical details.',
    duration:'Half day or full day',
    age:'Suitable for families; final conditions depend on location',
    location:'Albay / nearby coastal area',
    address:'Final destination confirmed before departure',
    price:'Price depends on destination and transport',
    level:'Easy',
    bring:'Swimwear, towel, sun protection, drinking water and cash for local purchases.',
    included:'Only the services specifically confirmed in your proposal.',
    note:'Sea conditions, weather and local access can change.'
  },
  {
    slug:'bicol-food',
    title:'Bicol Food & Local Flavours',
    kicker:'Food · Local culture',
    image:'/assets/images/food-culture-hero.jpg',
    intro:'Discover Bicol flavours through a local meal, food stop or a simple dining experience matched to your plans.',
    what:'A flexible food experience that can range from a casual local meal to a planned family-style dining stop. Venue and menu are confirmed before reservation.',
    duration:'Usually 1–3 hours',
    age:'All ages',
    location:'Bacacay / Tabaco / Legazpi area',
    address:'Restaurant or meeting point confirmed in your plan',
    price:'Depends on venue, menu and group size',
    level:'Easy',
    bring:'Tell us in advance about allergies, dietary needs and food preferences.',
    included:'Only food, transport or reservations listed in the final proposal.',
    note:'Menus and opening hours can change, especially for smaller local venues.'
  },
  {
    slug:'airport-pickup',
    title:'Airport Pickup',
    kicker:'Arrival · Transport',
    image:'/assets/images/arrival-hero.jpg',
    intro:'A simpler arrival with transport planned from the airport to your accommodation or agreed destination.',
    what:'Pre-arranged pickup based on your flight information, group size and luggage requirements.',
    duration:'Depends on airport, traffic and destination',
    age:'All ages',
    location:'Airport arrival to agreed destination',
    address:'Pickup point confirmed before travel',
    price:'Price to be confirmed before reservation',
    level:'Easy',
    bring:'Flight number, arrival time, passenger count and luggage details.',
    included:'Vehicle and driver according to the final confirmed proposal.',
    note:'Flight delays and major schedule changes should be communicated as early as possible.'
  }
];

const css = `
:root{--green:#062e27;--cream:#f5f0e6;--paper:#fffdf8;--ink:#18352f;--muted:#61726d;--gold:#e9b943;--line:#ded8ca}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit}.wrap{width:min(1160px,calc(100% - 44px));margin:auto}
.top{height:78px;display:flex;align-items:center;padding:0 max(22px,calc((100vw - 1160px)/2));background:#052d25;color:#fff}.brand{font:30px Georgia,"Times New Roman",serif;text-decoration:none}.brand small{display:block;font:7px Arial,sans-serif;letter-spacing:3px;color:#e9bd55;margin-top:4px}.nav{margin-left:auto;display:flex;gap:24px;align-items:center}.nav a{text-decoration:none;font-size:13px}.btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 22px;border-radius:28px;background:var(--gold);color:#16372f!important;text-decoration:none;font-size:13px;font-weight:800}
.hero{background:#052d25;color:#fff;padding:48px 0 58px}.hero-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:48px;align-items:center}.eyebrow{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#efc45d;font-weight:850}.hero h1{font:clamp(44px,5vw,70px)/1 Georgia,"Times New Roman",serif;margin:12px 0 16px}.hero p{font-size:17px;line-height:1.65;color:rgba(255,255,255,.84)}.hero-photo{min-height:390px;border-radius:22px;background-size:cover;background-position:center;box-shadow:0 24px 50px rgba(0,0,0,.25)}
.content{display:grid;grid-template-columns:1.25fr .75fr;gap:42px;padding:56px 0 72px}.main h2{font:36px Georgia,"Times New Roman",serif;margin:0 0 14px}.main p{line-height:1.75;color:var(--muted)}.panel{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:0 12px 28px rgba(37,58,50,.07);height:max-content}.fact{padding:13px 0;border-bottom:1px solid var(--line)}.fact:last-child{border-bottom:0}.fact span{display:block;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#9a731d;font-weight:800;margin-bottom:4px}.fact strong{font-size:14px;line-height:1.45}.info{margin-top:26px;background:#fffaf0;border:1px solid #ead9ad;border-radius:14px;padding:18px 20px;color:#5b5c52;line-height:1.6;font-size:14px}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}.ghost{display:inline-flex;align-items:center;padding:12px 20px;border:1px solid #8da39c;border-radius:28px;text-decoration:none;font-size:13px;font-weight:750}
.footer{background:#052a23;color:#fff;padding:28px 0}.footer .wrap{display:flex;justify-content:space-between;align-items:end;gap:24px}.motto{font:italic 25px Georgia,"Times New Roman",serif;color:#e9b943}.fcopy{font-size:12px;color:rgba(255,255,255,.74);text-align:right}
@media(max-width:820px){.nav{display:none}.hero-grid,.content{grid-template-columns:1fr}.hero-photo{min-height:300px}.footer .wrap{flex-direction:column;align-items:flex-start}.fcopy{text-align:left}}
`;

fs.mkdirSync('experiences',{recursive:true});

for (const x of items) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${x.title} · SOGOD</title><meta name="description" content="${x.intro}"><style>${css}</style></head>
<body>
<header class="top"><a class="brand" href="/index.html">SOGOD<small>STAY · EXPERIENCE · LOCAL HELP</small></a><nav class="nav"><a href="/index.html">Home</a><a href="/stay.html">Stay</a><a href="/experiences.html">Experiences</a><a href="/local-help.html">Local Help</a><a href="/about.html">About</a><a class="btn" href="/request.html?experience=${x.slug}">Plan with us →</a></nav></header>

<section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">${x.kicker}</div><h1>${x.title}</h1><p>${x.intro}</p><div class="actions"><a class="btn" href="/request.html?experience=${x.slug}">Add to my stay →</a><a class="ghost" href="/experiences.html">← All experiences</a></div></div><div class="hero-photo" style="background-image:url('${x.image}')" role="img" aria-label="${x.title}"></div></div></section>

<main class="wrap content"><section class="main"><h2>What to expect</h2><p>${x.what}</p><h2 style="margin-top:34px">Before you go</h2><p><strong>What to bring:</strong> ${x.bring}</p><p><strong>What is included:</strong> ${x.included}</p><div class="info"><strong>Planning note:</strong> ${x.note}<br><br>Prices, age limits, opening times, meeting points and operator details are only treated as confirmed when they are included in your final SOGOD proposal.</div><div class="actions"><a class="btn" href="/request.html?experience=${x.slug}">Ask SOGOD to arrange this →</a></div></section>
<aside class="panel">
<div class="fact"><span>Duration</span><strong>${x.duration}</strong></div>
<div class="fact"><span>Age</span><strong>${x.age}</strong></div>
<div class="fact"><span>Location</span><strong>${x.location}</strong></div>
<div class="fact"><span>Address / meeting point</span><strong>${x.address}</strong></div>
<div class="fact"><span>Expected price</span><strong>${x.price}</strong></div>
<div class="fact"><span>Activity level</span><strong>${x.level}</strong></div>
</aside></main>

<footer class="footer"><div class="wrap"><div class="motto">People · Places · A Brighter Tomorrow</div><div class="fcopy">Experience the real Philippines.<br>With local people. For brighter tomorrows.</div></div></footer>
</body></html>`;
  fs.writeFileSync(path.join('experiences',`${x.slug}.html`),html);
}
console.log(`Built ${items.length} SOGOD experience detail pages`);
