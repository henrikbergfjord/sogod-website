import fs from 'node:fs';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#062e27">
<title>SOGOD · Dorian Villa · Albay</title>
<style>
:root{--green:#062e27;--gold:#e9b943}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:#061f1a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
.page{min-height:100vh;background:linear-gradient(180deg,rgba(5,31,25,.12),rgba(5,31,25,.08) 55%,rgba(5,31,25,.24)),url('/assets/images/hero-home.jpg') center 48%/cover no-repeat fixed;position:relative}
.page:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(2,20,16,.72) 0%,rgba(2,20,16,.43) 28%,rgba(2,20,16,.08) 55%,rgba(2,20,16,.02) 100%)}
.shell{position:relative;z-index:2;min-height:100vh;display:flex;flex-direction:column}
.wrap{width:min(1340px,calc(100% - 64px));margin:auto}
.top{position:relative;z-index:10;height:78px;display:flex;align-items:center;padding:0 max(32px,calc((100vw - 1340px)/2));background:rgba(4,39,31,.70);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.08)}
.brand{font:30px/1 Georgia,"Times New Roman",serif;text-decoration:none;letter-spacing:.3px}
.brand small{display:block;margin-top:5px;font:7px/1 Arial,sans-serif;letter-spacing:3px;color:#e9bd55}
.nav{margin-left:auto;display:flex;align-items:center;gap:34px}
.nav a{font-size:13px;text-decoration:none;color:#fff}
.nav .active{color:#f0c15d;position:relative}
.nav .active:after{content:"";position:absolute;left:0;right:0;bottom:-13px;height:1px;background:#f0c15d}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:13px 24px;border-radius:28px;background:var(--gold);color:#16372f!important;text-decoration:none;font-size:13px;font-weight:800}
.ghost{display:inline-flex;align-items:center;justify-content:center;padding:12px 22px;border:1px solid rgba(255,255,255,.74);border-radius:28px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;background:rgba(5,37,30,.18);backdrop-filter:blur(4px)}
.menu-btn{display:none;margin-left:auto;border:0;background:none;color:#fff;font-size:26px}
.hero{flex:1;display:flex;align-items:flex-start;padding:76px 0 28px}
.hero-grid{display:grid;grid-template-columns:.94fr 1.06fr;min-height:500px}
.hero-copy{max-width:610px;padding-top:18px}
.eyebrow{font-size:11px;letter-spacing:3px;font-weight:850;color:#f0c15d;text-transform:uppercase}
.hero h1{font:clamp(64px,6vw,92px)/.93 Georgia,"Times New Roman",serif;letter-spacing:-2px;margin:14px 0 8px}
.hero h2{font:clamp(30px,2.6vw,40px)/1.05 Georgia,"Times New Roman",serif;font-weight:400;margin:0 0 18px}
.hero p{font-size:17px;line-height:1.58;color:rgba(255,255,255,.88);margin:0 0 26px;max-width:545px}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap}
.cards-wrap{margin-top:auto;transform:translateY(12px)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{min-height:250px;position:relative;overflow:hidden;border-radius:14px;border:1px solid rgba(255,255,255,.26);box-shadow:0 18px 45px rgba(0,0,0,.25);isolation:isolate}
.card:before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,rgba(2,20,16,.94) 0%,rgba(2,20,16,.62) 38%,rgba(2,20,16,.10) 78%)}
.card.stay{background:url('/assets/images/hero-home.jpg') center 52%/cover no-repeat}
.card.plan{background:url('/assets/images/boodle-fight-hero.jpg') center center/cover no-repeat}
.card.help{background:url('/assets/images/boodle-fight-hero.jpg') center/cover no-repeat}
.card-content{position:absolute;left:26px;right:26px;bottom:23px;z-index:2}
.card .tag{font-size:11px;font-weight:850;letter-spacing:2.4px;color:#f0c15d;text-transform:uppercase;margin-bottom:6px}
.card h3{font:30px/1.04 Georgia,"Times New Roman",serif;margin:0 0 8px}
.card p{font-size:13px;line-height:1.45;color:rgba(255,255,255,.92);margin:0 0 12px;max-width:380px}
.card a{font-size:12.5px;font-weight:800;color:#f4c75e;text-decoration:none}
.benefits-shell{background:rgba(4,39,31,.88);backdrop-filter:blur(8px);border-top:1px solid rgba(255,255,255,.10);border-bottom:1px solid rgba(255,255,255,.10)}
.benefits{display:grid;grid-template-columns:repeat(4,1fr)}
.benefit{display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;padding:19px 22px;border-right:1px solid rgba(255,255,255,.12)}
.benefit:last-child{border-right:0}
.bicon{font-size:26px;color:#f0c15d;text-align:center}
.benefit strong{display:block;font-size:13px;margin-bottom:4px}
.benefit span{font-size:10.5px;color:rgba(255,255,255,.70);line-height:1.35}
.footer{background:rgba(2,23,18,.92);backdrop-filter:blur(8px);padding:22px 0 24px}
.footer .wrap{display:flex;align-items:end;justify-content:space-between;gap:24px}
.motto{font:italic 27px/1.1 Georgia,"Times New Roman",serif;color:#e9b943}
.footer-copy{text-align:right;font-size:12px;line-height:1.5;color:rgba(255,255,255,.82)}
@media(max-width:1050px){.wrap{width:min(100% - 40px,980px)}.top{padding:0 20px}.nav{gap:18px}.hero-grid{grid-template-columns:1fr}.hero{padding-top:58px}.cards{grid-template-columns:1fr 1fr}.card.help{grid-column:1/-1}.benefits{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){.page{background-attachment:scroll;background-position:60% center}.top{height:66px}.nav{display:none;position:absolute;top:66px;left:0;right:0;background:rgba(4,39,31,.98);padding:15px 20px 22px;flex-direction:column;align-items:stretch;gap:0}.nav.open{display:flex}.nav a{padding:12px 6px;border-bottom:1px solid rgba(255,255,255,.08)}.nav .btn{margin-top:12px;border:0}.nav .active:after{display:none}.menu-btn{display:block}.hero{padding:44px 0 22px}.hero-copy{padding-top:0}.hero h1{font-size:55px}.hero h2{font-size:28px}.hero p{font-size:14.5px}.cards-wrap{transform:none;margin-top:28px}.cards{grid-template-columns:1fr}.card.help{grid-column:auto}.card{min-height:300px}.benefits{grid-template-columns:1fr}.benefit{border-right:0;border-bottom:1px solid rgba(255,255,255,.10)}.benefit:last-child{border-bottom:0}.footer .wrap{flex-direction:column;align-items:flex-start}.footer-copy{text-align:left}}
</style>
</head>
<body>
<div class="page">
<div class="shell">
<header class="top">
<a class="brand" href="/index.html">SOGOD<small>STAY · EXPERIENCE · LOCAL HELP</small></a>
<button class="menu-btn" aria-label="Open menu" aria-controls="main-navigation" aria-expanded="false" onclick="const open=document.querySelector('.nav').classList.toggle('open');this.setAttribute('aria-expanded',String(open));this.setAttribute('aria-label',open?'Close menu':'Open menu')">☰</button>
<nav class="nav" id="main-navigation"><a class="active" href="/index.html">Home</a><a href="/stay.html">Stay</a><a href="/experiences.html">Experiences</a><a href="/local-help.html">Local Help</a><a href="/about.html">About</a><a class="btn" href="/request.html">Plan with us →</a></nav>
</header>
<section class="hero"><div class="wrap"><div class="hero-grid"><div class="hero-copy"><div class="eyebrow">SOGOD · ALBAY · PHILIPPINES</div><h1>Dorian Villa</h1><h2>Stay · Relax · Belong</h2><p>A private base for discovering Albay — with comfortable stays, local experiences and practical help gathered in one place.</p><p>Planned property · Concept illustration. Opening dates and availability will be confirmed before booking.</p><div class="hero-actions"><a class="btn" href="/stay.html">Discover our stays →</a><a class="ghost" href="/experiences.html">Plan your stay</a></div></div></div><div class="cards-wrap"><div class="cards">
<article class="card stay"><div class="card-content"><div class="tag">Stay</div><h3>Our Villa & Stays</h3><p>Three unique rental units are being prepared for guests — modern, comfortable and close to everything in Albay.</p><a href="/stay.html">See our stays →</a></div></article>
<article class="card plan"><div class="card-content"><div class="tag">Experiences</div><h3>Plan Your Stay</h3><p>Activities, tours, transport, food and unique local experiences — gathered in one place.</p><a href="/experiences.html">Explore Albay →</a></div></article>
<article class="card help"><div class="card-content"><div class="tag">Local Help</div><h3>More Than a Stay</h3><p>Local support, practical help and trusted contacts — we are here for you.</p><a href="/local-help.html">Get local help →</a></div></article>
</div></div></div></section>
<section class="benefits-shell"><div class="wrap benefits"><div class="benefit"><div class="bicon">⌂</div><div><strong>Private & Comfortable</strong><span>Villa, apartment or residence</span></div></div><div class="benefit"><div class="bicon">♧</div><div><strong>Family & Group Friendly</strong><span>Space for special moments</span></div></div><div class="benefit"><div class="bicon">♡</div><div><strong>Local Support</strong><span>Practical help before and during your stay</span></div></div><div class="benefit"><div class="bicon">♤</div><div><strong>Authentic Albay</strong><span>Nature, culture, food and local experiences</span></div></div></div></section>
<footer class="footer"><div class="wrap"><div class="motto">People · Places · A Brighter Tomorrow</div><div class="footer-copy">Experience the real Philippines.<br>With local people. For brighter tomorrows.</div></div></footer>
</div></div>
<script>document.addEventListener('click',e=>{const nav=document.querySelector('.nav');if(!e.target.closest('.top')&&nav.classList.contains('open')){nav.classList.remove('open');const b=document.querySelector('.menu-btn');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Open menu')}});</script>
</body></html>`;

fs.writeFileSync('index.html', html);
console.log('SOGOD Home V4 exact-layout built');