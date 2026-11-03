const root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
root.classList.add('js');
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');revealObserver.unobserve(e.target);}}),{threshold:.08,rootMargin:'0px 0px -25px 0px'});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));
let model=null,follow=true,modelStarted=false,lastExplosion=-1;
const assembly=document.getElementById('assembly');
const slider=document.getElementById('explosion-range');
const output=document.getElementById('explosion-output');
const followButton=document.getElementById('follow-scroll');
const host=document.getElementById('model-host');
let themeButtons=[...document.querySelectorAll('[data-theme-choice]')];
function applyTheme(theme,updateURL=false){root.dataset.theme=theme;themeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===theme)));document.querySelector('meta[name="theme-color"]').content=theme==='warm'?'#f4eade':'#11191c';model?.setTheme(theme);try{localStorage.setItem('avi-theme',theme)}catch(e){}if(updateURL){const url=new URL(location.href);url.searchParams.set('theme',theme);history.replaceState(null,'',url.pathname+url.search+url.hash);}}
themeButtons.forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.themeChoice,true)));
applyTheme(root.dataset.theme==='warm'?'warm':'dark');
const storyFiles={auto:['mechanical_assembly.jpg','electronics_and_network.jpg','conversational_interface.jpg'],glue:['sample_acquisition.png','contour_measurement.png','streak_distribution.png']};
const stories=[...document.querySelectorAll('[data-story]')].map(el=>({el,steps:[...el.querySelectorAll('[data-step]')],images:[...el.querySelectorAll('[data-story-image]')],dots:[...el.querySelectorAll('.step-dots i')],filename:el.querySelector('.window-bar>.mono'),counter:el.querySelector('.window-bar>.mono:last-child'),active:0}));
const stages=[['One mechanism.<br>Eight component groups.','The fixture combines controlled motion with a mechanical path from the drum to the spring supports.','01 / ASSEMBLED'],['Follow the<br>load path.','The drum, end caps, and square rod separate to reveal how the rotating assembly connects to its supports.','02 / SEPARATING'],['Each component.<br>A clearer purpose.','The leaf springs, mounting blocks, specimen stage, and actuator each play a part in a repeatable test.','03 / EXPLODED']];
let stageIndex=-1;
function setExplosion(v){v=Math.max(0,Math.min(1,v));if(Math.abs(v-lastExplosion)<.001)return;lastExplosion=v;slider.value=String(Math.round(v*100));output.textContent=Math.round(v*100)+'%';model?.setExplosion(v,reduced.matches);const index=v<.22?0:v<.7?1:2;if(index!==stageIndex){stageIndex=index;document.getElementById('assembly-state-title').innerHTML=stages[index][0];document.getElementById('assembly-state-copy').textContent=stages[index][1];document.getElementById('assembly-state-label').textContent=stages[index][2];}}
function setFollow(v){follow=v;followButton.classList.toggle('active',v);followButton.setAttribute('aria-pressed',String(v));followButton.querySelector('span:last-child').textContent=v?'Following your scroll':'Manual mode · Resume scroll';}
slider.addEventListener('input',()=>{setFollow(false);setExplosion(Number(slider.value)/100)});
document.getElementById('assemble-button').addEventListener('click',()=>{setFollow(false);setExplosion(0)});
document.getElementById('explode-button').addEventListener('click',()=>{setFollow(false);setExplosion(1)});
document.getElementById('reset-camera').addEventListener('click',()=>model?.reset());
followButton.addEventListener('click',()=>{setFollow(!follow);if(follow)updateScroll()});
document.querySelectorAll('[data-part]').forEach(button=>button.addEventListener('click',()=>model?.highlight(button.dataset.part)));
host.addEventListener('parthighlight',event=>document.querySelectorAll('[data-part]').forEach(button=>{const active=button.dataset.part===event.detail;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}));
async function startModel(){if(modelStarted)return;modelStarted=true;try{const module=await import('./assembly.js');model=module.createAssembly(host);model.setExplosion(Math.max(0,lastExplosion),true);updateScroll();}catch(error){console.error('Assembly initialization failed:',error);document.getElementById('model-hint').textContent='3D is unavailable in this browser. Reference CAD shown.';document.querySelectorAll('.assembly-controls button,.assembly-controls input,[data-part]').forEach(el=>el.disabled=true);}}
new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)startModel();},{rootMargin:'650px'}).observe(assembly);
new IntersectionObserver(entries=>entries.forEach(entry=>model?.setActive(entry.isIntersecting)),{rootMargin:'150px'}).observe(host);
const chapters=[['top','INTRO'],['auto-thaw','01 / SYSTEMS'],['peel-test','02 / TESTING'],['glue-timelapse','03 / VISION'],['about','ABOUT'],['contact','CONTACT']].map(([id,label])=>({el:document.getElementById(id),label}));
const progressBar=document.querySelector('.reading-progress span');
const heroArt=document.querySelector('.hero-art');
const strip=document.querySelector('.discipline-strip>div');
let scheduled=false;
function updateScroll(){scheduled=false;const y=window.scrollY,h=window.innerHeight;const pageMax=document.documentElement.scrollHeight-h;const fraction=pageMax>0?y/pageMax:0;progressBar.style.transform=`scaleX(${fraction})`;document.getElementById('page-progress').textContent=String(Math.round(fraction*100)).padStart(2,'0');
  let chapter=chapters[0].label;for(const c of chapters)if(c.el.getBoundingClientRect().top<h*.35)chapter=c.label;document.getElementById('chapter-marker-text').textContent=chapter;
  if(!reduced.matches){heroArt.style.transform=`translateY(${Math.min(y*.11,75)}px) rotate(${Math.min(y*.002,1.2)}deg)`;strip.style.transform=`translateX(${-Math.min(Math.max(y-h*.35,0)*.08,100)}px)`;}
  for(const s of stories){const r=s.el.getBoundingClientRect();if(r.top>h||r.bottom<0)continue;let index=0;const trigger=h*(window.innerWidth<561?.69:.4);s.steps.forEach((step,i)=>{if(step.getBoundingClientRect().top<trigger)index=i});if(index!==s.active){s.active=index;s.images.forEach((img,i)=>img.classList.toggle('active',i===index));s.dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));s.filename.textContent=storyFiles[s.el.dataset.story][index];s.counter.textContent=`0${index+1} / 03`;}}
  if(follow){const rect=assembly.getBoundingClientRect();const usable=assembly.offsetHeight-(h-84);const p=usable>0?(84-rect.top)/usable:0;setExplosion((p-.08)/.84);}
}
function queueScroll(){if(!scheduled){scheduled=true;requestAnimationFrame(updateScroll)}}
window.addEventListener('scroll',queueScroll,{passive:true});window.addEventListener('resize',queueScroll);updateScroll();
// Existing case-study links now land directly on their inline project section.
if(location.hash.startsWith('#project-')){const id=location.hash.replace('#project-','');const section=document.getElementById(id);if(section){history.replaceState(null,'',location.pathname+location.search+'#'+id);section.scrollIntoView();}}
