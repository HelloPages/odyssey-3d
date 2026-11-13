'use strict';
// Each scene has its own real GIF; only visible scenes are allowed to animate.
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let galleryPaused=reduceMotion.matches;
const pictures=[...document.querySelectorAll('.game-motion')];
const visiblePictures=new Set();
function updatePictures(){
  const active=[...visiblePictures].filter(img=>!img.closest('[hidden]')).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top).slice(0,3);
  pictures.forEach(img=>{const play=!galleryPaused&&!document.hidden&&active.includes(img);const next=play?img.dataset.gif:img.dataset.static;if(img.getAttribute('src')!==next)img.src=next;img.dataset.playing=String(play);});
}
if(pictures.length){
 const observer=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?visiblePictures.add(e.target):visiblePictures.delete(e.target));updatePictures();},{threshold:.18});
 pictures.forEach(img=>{observer.observe(img);img.addEventListener('error',()=>{if(img.getAttribute('src')!==img.dataset.static){img.src=img.dataset.static;img.dataset.playing='false';}});});
 const motionButtons=[document.querySelector('#gallery-motion'),...document.querySelectorAll('[data-motion-toggle]')];
 function label(){
  for(const button of motionButtons){
   button.textContent=galleryPaused?'播放動畫':'暫停動畫';
   button.setAttribute('aria-pressed',String(galleryPaused));
  }
  updatePictures();
 }
 for(const button of motionButtons)button.addEventListener('click',()=>{galleryPaused=!galleryPaused;label();});
 reduceMotion.addEventListener('change',()=>{galleryPaused=reduceMotion.matches;label();});label();
 document.addEventListener('visibilitychange',updatePictures);
 const search=document.querySelector('#search'),genre=document.querySelector('#genre'),source=document.querySelector('#catalog-source'),more=document.querySelector('#load-more'),cards=[...document.querySelectorAll('.game-card')];let limit=12;
 function filter(reset=true){
  if(reset)limit=12;const q=search.value.toLocaleLowerCase().trim();let count=0,shown=0;
  cards.forEach(card=>{const match=card.dataset.search.toLocaleLowerCase().includes(q)&&(!genre.value||card.dataset.genre===genre.value)&&card.dataset.status===source.value;if(match)count++;const show=match&&shown<limit;card.hidden=!show;if(show)shown++;});
  document.querySelector('#game-count').textContent=`顯示 ${shown} / ${count} 款遊戲`;
  document.querySelector('#no-results').hidden=count!==0;document.querySelector('#other-note').hidden=source.value!=='other';more.hidden=shown>=count;
  more.textContent=`再看 ${Math.min(12,count-shown)} 款 ↓`;updatePictures();
 }
 search.addEventListener('input',()=>filter());genre.addEventListener('change',()=>filter());source.addEventListener('change',()=>filter());
 document.querySelectorAll('[data-featured-game]').forEach(button=>button.addEventListener('click',()=>{
  search.value=button.dataset.featuredGame;
  genre.value='';
  source.value='current';
  filter();
  const result=cards.find(card=>!card.hidden);
  result?.querySelector('h2')?.focus({preventScroll:true});
  result?.scrollIntoView({block:'start',behavior:reduceMotion.matches?'instant':'smooth'});
 }));
 more.addEventListener('click',()=>{const firstHidden=cards.filter(x=>x.hidden&&x.dataset.status===source.value&&x.dataset.search.toLocaleLowerCase().includes(search.value.toLocaleLowerCase().trim())&&(!genre.value||x.dataset.genre===genre.value))[0];limit+=12;filter(false);firstHidden?.querySelector('h2')?.focus({preventScroll:true});});
 document.querySelector('#clear-search').addEventListener('click',()=>{search.value='';genre.value='';filter();search.focus();});filter();
}

// The middle position briefly shows the two scenes as alternating lens strips.
const flipArt = document.querySelector('.flip-art');
if (flipArt) {
 const viewButtons = [...document.querySelectorAll('[data-flip]')];
 let view = 0;
 let start;
 function showView(next) {
  view = next;
  flipArt.dataset.view = String(next);
  viewButtons.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.flip)===next)));
 }
 flipArt.addEventListener('pointermove', event=>{
  if(event.pointerType!=='mouse' || galleryPaused || reduceMotion.matches)return;
  const box = flipArt.getBoundingClientRect();
  const offset = (event.clientX-box.left)/box.width;
  flipArt.style.setProperty('--flip-tilt',`${(offset-.5)*10}deg`);
  if(offset<.44)showView(0);
  else if(offset>.56)showView(1);
  else flipArt.dataset.view='split';
 });
 flipArt.addEventListener('pointerleave', ()=>{flipArt.style.removeProperty('--flip-tilt');showView(view);});
 flipArt.addEventListener('pointerdown', event=>{if(event.pointerType==='touch')start={x:event.clientX,y:event.clientY};});
 flipArt.addEventListener('pointercancel', ()=>{start=undefined;});
 flipArt.addEventListener('pointerup', event=>{
  if(start && event.pointerType==='touch'){
   const dx=event.clientX-start.x,dy=event.clientY-start.y;
   if(Math.abs(dx)>30 && Math.abs(dx)>Math.abs(dy))showView(dx<0?1:0);
  }
  start=undefined;
 });
 viewButtons.forEach(button=>button.addEventListener('click',()=>showView(Number(button.dataset.flip))));
}

// Two star fields travel toward the viewer at different speeds, as on the launch page.
const dust = document.querySelector('.showcase-dust');
if (dust) {
 const ctx = dust.getContext('2d');
 const showcase = dust.parentElement;
 let frame = 0;
 let inView = false;
 let previous = 0;
 const stars = Array.from({length:52}, (_, index) => ({
  angle: Math.random() * 2 * Math.PI,
  distance: Math.random(),
  speed: index < 37 ? .065 : .16,
  size: index < 37 ? .8 : 1.6,
 }));
 if(ctx){
  function draw(time) {
   const seconds = Math.min((time - previous) / 1000, .04);
   previous = time;
   ctx.clearRect(0, 0, dust.width, dust.height);
   const radius = Math.hypot(dust.width, dust.height) * .71;
   for (const star of stars) {
    const distance = star.distance;
    const spread = distance * distance * radius;
    const x = dust.width * .57 + Math.cos(star.angle) * spread;
    const y = dust.height * .51 + Math.sin(star.angle) * spread;
    ctx.fillStyle = `rgba(255,255,255,${.1 + distance * .48})`;
    ctx.beginPath();
    ctx.arc(x, y, star.size * (.4 + distance), 0, Math.PI * 2);
    ctx.fill();
    if(!galleryPaused) star.distance = (distance + seconds * star.speed) % 1;
   }
   frame = 0;
   schedule();
  }
  function schedule() {
   if(!frame && inView && !document.hidden && !galleryPaused && !reduceMotion.matches) frame = requestAnimationFrame(draw);
  }
  new ResizeObserver(() => {
   dust.width = dust.clientWidth;
   dust.height = dust.clientHeight;
   schedule();
  }).observe(showcase);
  new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; schedule();}).observe(showcase);
  document.addEventListener('visibilitychange',schedule);
  for(const button of document.querySelectorAll('#gallery-motion,[data-motion-toggle]'))button.addEventListener('click',schedule);
  reduceMotion.addEventListener('change',schedule);
 }
}
const checks=[...document.querySelectorAll('.checklist input')];checks.forEach(c=>c.addEventListener('change',()=>{document.querySelector('#check-status').textContent=`已確認 ${checks.filter(x=>x.checked).length} / ${checks.length} 項`;}));
