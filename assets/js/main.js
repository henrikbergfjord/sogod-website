const buttons = document.querySelectorAll('[data-lang]');
const translatable = document.querySelectorAll('[data-en][data-tl]');
function setLang(lang){
  translatable.forEach(el => { el.textContent = el.dataset[lang]; });
  buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  document.documentElement.lang = lang === 'tl' ? 'tl' : 'en';
  localStorage.setItem('sogod-lang', lang);
}
buttons.forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));
setLang(localStorage.getItem('sogod-lang') || 'en');
const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

const slides=[...document.querySelectorAll('.slide')];
if(slides.length){
  let i=0;
  const show=n=>{slides.forEach((s,idx)=>s.classList.toggle('active',idx===n));};
  const next=()=>{i=(i+1)%slides.length;show(i)};
  const prev=()=>{i=(i-1+slides.length)%slides.length;show(i)};
  document.querySelector('.next')?.addEventListener('click',next);
  document.querySelector('.prev')?.addEventListener('click',prev);
  setInterval(next,5000);
}
