import {estimateSession, REFS, buildEvents} from './drip-model.js';
const $ = id => document.getElementById(id);
const state = { task:'image', provider:'unsure', exactImages:4, versions:'few', upscale:'no' };
let currentStep=1, guess=null, result=null;
const decisions = {
  1:{title:'Ask what people did.',copy:'People know how many images they wanted. They shouldn’t need to know a data centre’s cooling efficiency to get started.',trade:'Fewer questions make this approachable, but leave infrastructure unknown. Drip carries those unknowns into the estimate instead of pretending they disappeared.'},
  2:{title:'Count the invisible attempts.',copy:'The final image hides the work that came before it. Counting discarded versions makes that hidden cost tangible, without asking people to reconstruct every prompt.',trade:'“A few” is easier to answer than an exact count, but it is an assumption. Here it means half the kept count, rounded, with a minimum of two. “Lots” means twice the kept count. The count is always shown.'},
  3:{title:'Let people question the answer.',copy:'The headline makes the result approachable. The range makes its uncertainty visible. The explanation lets a curious person go deeper without overwhelming everyone else.',trade:'A median is easy to remember and easy to mistake for a fact. The range stays beside it. These are modelled scenarios, not a measured footprint or a guarantee about your actual session.'}
};
function format(litres){const ml=litres*1000;if(ml<1)return ml.toFixed(2)+' mL';if(ml<10)return ml.toFixed(1)+' mL';if(ml<1000)return Math.round(ml)+' mL';return litres.toFixed(1)+' L';}
function eventCounts(){const events=buildEvents(state);return {kept:state.exactImages, discarded:events.find(e=>!e.accepted)?.count||0, prompts:events.find(e=>e.minor)?.count||0};}
function updateInputs(){
  const {kept,discarded,prompts}=eventCounts();
  $('kept-value').textContent=kept;$('kept-count').textContent=kept;$('discard-count').textContent=discarded;$('total-attempts').textContent=kept+discarded;
  $('attempt-copy').textContent=`${kept+discarded} image generations, plus ${prompts} text prompts.`;
  $('known-summary').textContent=`${kept} kept ${kept===1?'image':'images'}. ${discarded} discarded versions. Your inputs describe a session; they are not observed usage.`;
  $('attempts').innerHTML=Array.from({length:kept+discarded},(_,i)=>`<span class="attempt ${i>=kept?'discarded':''}" aria-hidden="true">${i>=kept?'×':'✓'}</span>`).join('');
  $('attempts').setAttribute('aria-label',`${kept} kept images and ${discarded} discarded versions`);
  document.querySelectorAll('[data-versions]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.versions===state.versions)));
  result=null;
}
function drawDistribution(r){
  const w=520,offset=20,bottom=74,bins=36,lo=r.total.p10,hi=r.total.p90;
  const counts=Array(bins).fill(0);r.samples.forEach(v=>{const i=Math.floor((v-lo)/(hi-lo)*bins);if(i>=0&&i<bins)counts[i]++;});
  const max=Math.max(...counts),x=v=>offset+(v-lo)/(hi-lo)*w;
  const bars=counts.map((c,i)=>{const h=c/max*54;return `<rect x="${offset+i*w/bins}" y="${bottom-h}" width="${w/bins-2}" height="${h}" rx="1" fill="#244deb"/>`;}).join('');
  $('distribution').innerHTML=`<title>Central 80% of 8,000 simulated estimates, from P10 to P90. Both outer tails are omitted.</title>${bars}<path d="M${offset} ${bottom+3}H${offset+w}" stroke="#bac5ad"/><path d="M${x(r.total.p50)} 6V${bottom+3}" stroke="#202421" stroke-width="1" stroke-dasharray="3 3"/><text x="${Math.min(x(r.total.p50)+5,480)}" y="12" font-size="8" fill="#202421">median</text>`;
}

function renderResult(){
  result ||= estimateSession(state);
  const {kept,discarded,prompts}=eventCounts();
  $('result-number').textContent=format(result.total.p50);
  $('result-context').textContent=`${kept} kept + ${discarded} discarded · ${prompts} text prompts · provider unknown`;
  $('range-value').textContent=`${format(result.total.p10)} – ${format(result.total.p90)}`;
  $('range-low').textContent='P10 '+format(result.total.p10);$('range-high').textContent='P90 '+format(result.total.p90);
  $('direct-value').textContent=format(result.direct.p50);$('electric-value').textContent=format(result.elec.p50);
  $('model-formula').textContent=`${kept+discarded} image attempts + ${prompts} text prompts → estimated computing energy → on-site cooling water + electricity-related water. Unknown-provider assumptions; no upscaling.`;
  const band=result.total.p50<.01?'low':result.total.p50<=.1?'mid':'high';
  const labels={low:'under 10 mL',mid:'10–100 mL',high:'over 100 mL'};
  $('guess-result').textContent=guess ? `You guessed ${labels[guess]}. ${guess===band?'The median falls in that band.':'The model’s median falls in a different band.'} The range matters more than being “right”.` : 'This is a modelled session, not a reading from a water meter. Actual use may fall outside this range.';
  drawDistribution(result);
  $('comparison').hidden=true;$('compare-toggle').setAttribute('aria-expanded','false');
  $('compare-toggle').hidden=discarded===0;
  if(discarded>0){const alternative=estimateSession({...state,versions:'none'});const percent=Math.round((1-alternative.total.p50/result.total.p50)*100);$('comparison').innerHTML=`<div><span>This session</span><b>${format(result.total.p50)}</b></div><div><span>Same ${kept} kept images, no discarded versions</span><b>${format(alternative.total.p50)}</b></div><p>About ${percent}% lower in this model. Same assumptions, fewer generations. This comparison assumes the first attempts produce the images you need.</p>`;}

}
function goStep(n,focus=false){
  currentStep=n;
  for(let i=1;i<=3;i++)$('stage-'+i).hidden=i!==n;
  document.querySelectorAll('[data-step]').forEach(b=>{const active=+b.dataset.step===n;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  $('step-count').textContent=`0${n} / 03`;
  const d=decisions[n];$('decision-title').textContent=d.title;$('decision-copy').textContent=d.copy;$('extra-note').textContent=d.trade;
  $('extra-note').hidden=true;$('notes-toggle').setAttribute('aria-expanded','false');$('notes-toggle').querySelector('span').textContent='+';
  if(n===3)renderResult();
  if(focus){const heading=$('stage-'+n).querySelector('h3');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});if(matchMedia('(max-width: 800px)').matches)$('stage-'+n).scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
}
$('compare-toggle').addEventListener('click',()=>{const open=$('compare-toggle').getAttribute('aria-expanded')!=='true';$('comparison').hidden=!open;$('compare-toggle').setAttribute('aria-expanded',String(open));});
$('kept').addEventListener('input',e=>{state.exactImages=Number(e.target.value);updateInputs();});
document.querySelectorAll('[data-step],[data-next]').forEach(b=>b.addEventListener('click',()=>goStep(Number(b.dataset.step||b.dataset.next),Boolean(b.dataset.next))));
document.querySelectorAll('[data-versions]').forEach(b=>b.addEventListener('click',()=>{state.versions=b.dataset.versions;updateInputs();}));
document.querySelectorAll('[data-guess]').forEach(b=>b.addEventListener('click',()=>{guess=guess===b.dataset.guess?null:b.dataset.guess;document.querySelectorAll('[data-guess]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.guess===guess)));}));
$('notes-toggle').addEventListener('click',()=>{const open=$('notes-toggle').getAttribute('aria-expanded')!=='true';$('notes-toggle').setAttribute('aria-expanded',String(open));$('extra-note').hidden=!open;$('notes-toggle').querySelector('span').textContent=open?'−':'+';});
$('reset').addEventListener('click',()=>{state.exactImages=4;state.versions='few';guess=null;$('kept').value=4;document.querySelectorAll('[data-guess]').forEach(b=>b.setAttribute('aria-pressed','false'));document.querySelectorAll('.model-details').forEach(d=>d.open=false);updateInputs();goStep(1,true);});
const sources=[{id:2,title:'Image-generation energy benchmarks',context:'Luccioni, Jernite & Strubell · ACM FAccT 2024'},{id:5,title:'Text-inference energy benchmarks',context:'AI Energy Score v2 · used for accompanying prompts'},{id:7,title:'Water consumption from electricity generation',context:'Macknick et al. · NREL'},{id:8,title:'Data-centre infrastructure assumptions',context:'Drip’s combined fleet-report reference; not a measurement of this session'}];
$('source-list').innerHTML=sources.map(s=>{const ref=REFS.find(r=>r.n===s.id);return `<li><a href="${ref.url}" target="_blank" rel="noopener">${s.title} ↗</a><small>${s.context}</small></li>`;}).join('');
const mediaRoot='https://attilahajdu.com/portfolio-ai-avatar-videos-2025/';
const mediaFiles={en:'ai-atti-intro.mp4',fr:'fr-ai-atti-intro.mp4',de:'de-ai-atti-intro.mp4',es:'es-ai-atti-intro.mp4',zh:'cn-ai-atti-intro.mp4'};
function setLanguage(lang){$('media-video').src=mediaRoot+mediaFiles[lang];document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===lang)));}
function openMedia(type){const reel=type==='reel';$('media-title').textContent=reel?'Selected work through 2023':'Meet Attila';$('language-options').hidden=reel;$('media-caption').textContent=reel?'Earlier work. Recent enterprise programmes are shared privately.':'One recording, five languages, with a bit of AI help in between.';if(reel)$('media-video').src=mediaRoot+'attila_portfolio_2023.mp4';else setLanguage('en');$('media-dialog').showModal();}
$('intro-open').addEventListener('click',()=>openMedia('intro'));$('reel-open').addEventListener('click',()=>openMedia('reel'));
$('media-close').addEventListener('click',()=>$('media-dialog').close());
$('media-dialog').addEventListener('close',()=>{$('media-video').pause();$('media-video').removeAttribute('src');$('media-video').load();});
$('media-dialog').addEventListener('click',e=>{if(e.target===$('media-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.language)));
updateInputs();
