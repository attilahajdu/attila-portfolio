// Extracted from Attila Hajdu's published Drip, Water Model v0.3, 2026-10-20.
// Equations and distributions retained. Seeded sampling makes comparisons repeatable.
let seed = 73421;
function random(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const REFS = [
  {n:1, title:'Elsworth, Huang et al., "Measuring the environmental impact of delivering AI at Google scale"', pub:'Google, technical paper (arXiv:2508.15734) and accompanying blog', date:'August 2025', url:'https://arxiv.org/abs/2508.15734', note:'Production measurement of the median Gemini Apps text prompt in May 2025: 0.24 Wh energy, 0.26 mL on-site water, 0.03 gCO2e. Water figure covers on-site consumption only and excludes upstream electricity-generation water.'},
  {n:2, title:'Luccioni, Jernite & Strubell, "Power Hungry Processing: Watts Driving the Cost of AI Deployment?"', pub:'ACM FAccT 2024 (arXiv:2311.16863)', date:'2024', url:'https://arxiv.org/abs/2311.16863', note:'First systematic measurement of inference energy across 88 models and 10 tasks. Image generation mean ≈2.9 Wh per image, up to ≈11.5 Wh; text generation orders of magnitude lower.'},
  {n:3, title:'Jegham, Gamazaychikov & Luccioni, "Lights, Camera, Carbon: Architectural Scaling Laws for Video Generation Energy Consumption"', pub:'Sustainable AI Group (arXiv:2607.04553), under peer review', date:'2026', url:'https://arxiv.org/abs/2607.04553', note:'A standard 5-second video on common open models measured at ≈57.5 to 114.8 Wh, with energy scaling near-quadratically in duration and resolution. MIT Technology Review measured CogVideoX at ≈944 Wh per 5-second clip (2025).'},
  {n:4, title:'Delavande, Pierrard & Luccioni, "Video Killed the Energy Budget: Characterizing the Latency and Power Regimes of Open Text-to-Video Models"', pub:'arXiv:2509.19222', date:'2025', url:'https://arxiv.org/abs/2509.19222', note:'Compute-bound scaling model for video diffusion validating the duration and resolution scaling regimes used in our video estimator.'},
  {n:5, title:'Luccioni & Gamazaychikov, "AI Energy Score v2"', pub:'Hugging Face', date:'2025', url:'https://huggingface.co/blog/sasha/ai-energy-score-v2', note:'Standardised open-model benchmarks: roughly 0.03 Wh (8B parameters) to ≈1.9 Wh (405B) per text response; reasoning modes average ≈30 times more energy than non-reasoning.'},
  {n:6, title:'Li, Yang, Islam & Ren, "Making AI Less Thirsty: Uncovering and Addressing the Secret Water Footprint of AI Models"', pub:'UC Riverside / UT Arlington (arXiv:2304.03271)', date:'2023, revised 2025', url:'https://arxiv.org/abs/2304.03271', note:'Framework separating on-site (scope 1) cooling water from off-site (scope 2) electricity water. Our two-boundary model follows this structure.'},
  {n:7, title:'Macknick, Newmark, Heath & Hallett, "Operational water consumption and withdrawal factors for electricity generating technologies"', pub:'NREL / Environmental Research Letters', date:'2012, with subsequent updates', url:'https://www.nrel.gov/docs/fy11osti/50900.pdf', note:'Consumptive versus withdrawal water intensity by generation technology. Grid-average consumptive intensity typically falls between ≈0.4 and 2.5 L/kWh depending on the mix.'},
  {n:8, title:'Uptime Institute Global Data Center Survey; Google Environmental Report 2025; Microsoft Environmental Sustainability Report', pub:'Uptime Institute; Google; Microsoft', date:'2024 to 2025', url:'https://uptimeinstitute.com/resources', note:'Industry average PUE ≈1.56, hyperscale fleets ≈1.09 to 1.2. Published fleet-average WUE: Google ≈1.1 L/kWh, Microsoft ≈0.49 L/kWh, consumptive, per IT kWh. Individual sites vary widely.'},
  {n:9, title:'Altman, "The Gentle Singularity" (per-query claim)', pub:'OpenAI (company blog)', date:'June 2025', url:'https://blog.samaltman.com/the-gentle-singularity', note:'Company-stated averages of ≈0.34 Wh and ≈0.32 mL per ChatGPT query. Methodology not published, so treated as claim-grade evidence with widened uncertainty.'},
  {n:10, title:'Mistral AI, "Our contribution to a global environmental standard for AI" (lifecycle analysis of Mistral Large 2)', pub:'Mistral AI, with Carbone 4 and ADEME', date:'July 2025', url:'https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai', note:'First provider lifecycle assessment of an LLM, reporting per-response water and carbon including upstream effects. Used as corroborating evidence for text-inference magnitudes.'},
  {n:11, title:'Aczel, Chamanara, Matin, Farsi, Marwala & Madani, "Environmental Cost of AI\'s Energy Use: Carbon, Water and Land Footprints"', pub:'United Nations University Institute for Water, Environment and Health (UNU-INWEH), DOI 10.53328/INR26RMA002', date:'2026', url:'https://collections.unu.edu/eserv/UNU:10647/UNU-INWEH-Report-The_Env_Cost_of_AI-2026.pdf', note:'UN assessment of AI\'s carbon, water and land footprints. Uses the lifecycle water footprint of electricity (global average 9.9 L/kWh, country range 2 to 66), a wider boundary than our consumptive default: their 28.6 mL per typical image and 4.1 L per complex video clip use the same energy figures as ours with that wider water boundary. Also documents per-clip video energy up to ~415 Wh and near-quadratic scaling in resolution and frames, and that commercial minute-long videos are stitched from short native clips.'}
];
const REF = {}; REFS.forEach(r=>REF[r.n]=r);

/* Distribution helpers */
function rTri(min, mode, max){const u=random(),F=(mode-min)/(max-min);return u<F?min+Math.sqrt(u*(max-min)*(mode-min)):max-Math.sqrt((1-u)*(max-min)*(max-mode));}
function rLogN(p10,p50,p90){const mu=Math.log(p50),sigma=(Math.log(p90)-Math.log(p10))/(2*1.28155);let u=0,v=0;while(u===0)u=random();while(v===0)v=random();const z=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);return Math.exp(mu+sigma*z);}

/* Infrastructure coefficients */
const INFRA = {
  pue:{
    hyperscale:{sample:()=>rTri(1.06,1.12,1.25),label:'PUE (hyperscale fleet)',disp:'tri(1.06, 1.12, 1.25)',boundary:'facility energy / IT energy',grade:'B',ref:8},
    unknown:{sample:()=>rTri(1.08,1.3,1.7),label:'PUE (undisclosed facility)',disp:'tri(1.08, 1.30, 1.70)',boundary:'facility energy / IT energy',grade:'C',ref:8}
  },
  wue:{
    google:{sample:()=>rTri(0.7,1.1,1.6),label:'WUE, Google fleet average',disp:'tri(0.7, 1.1, 1.6) L/kWh',boundary:'consumption, on-site, per IT kWh',grade:'B',ref:8},
    msft:{sample:()=>rTri(0.3,0.49,0.9),label:'WUE, Microsoft fleet average',disp:'tri(0.30, 0.49, 0.90) L/kWh',boundary:'consumption, on-site, per IT kWh',grade:'B',ref:8},
    unknown:{sample:()=>rTri(0.05,0.5,2.0),label:'WUE, undisclosed operator',disp:'tri(0.05, 0.5, 2.0) L/kWh',boundary:'consumption, on-site, per IT kWh',grade:'C',ref:8}
  },
  grid:{sample:()=>rLogN(0.4,1.2,2.6),label:'Grid water intensity (consumptive)',disp:'logN(P10 0.4, P50 1.2, P90 2.6) L/kWh',boundary:'consumption, upstream electricity',grade:'C',ref:7},
  gridLife:{sample:()=>rLogN(4,9.9,25),label:'Grid water intensity (lifecycle, incl. hydropower reservoir evaporation)',disp:'logN(P10 4, P50 9.9, P90 25) L/kWh · UNU-INWEH global average 9.9, country range 2–66',boundary:'lifecycle water footprint of electricity',grade:'C',ref:11}
};

/* Providers · catalogue reviewed August 2026.
   Sora (OpenAI) was discontinued on 26 April 2026 and is deliberately absent;
   people who used it can pick "A tool that has since shut down".
   Claude does not offer image generation, so it never appears in the image flow. */
const PROVIDERS = {
  gemini:{name:'Gemini (Google)',wue:'google',pue:'hyperscale',textPath:'measured'},
  chatgpt:{name:'ChatGPT (OpenAI)',wue:'msft',pue:'hyperscale',textPath:'claim'},
  claude:{name:'Claude (Anthropic)',wue:'unknown',pue:'hyperscale',textPath:'benchmark'},
  copilot:{name:'Copilot (Microsoft)',wue:'msft',pue:'hyperscale',textPath:'benchmark'},
  grok:{name:'Grok (xAI)',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  deepseek:{name:'DeepSeek',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  mistral:{name:'Le Chat (Mistral AI)',wue:'unknown',pue:'hyperscale',textPath:'benchmark'},
  midjourney:{name:'Midjourney',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  gptimage:{name:'ChatGPT images (OpenAI)',wue:'msft',pue:'hyperscale',textPath:'claim'},
  nanobanana:{name:'Gemini images / Nano Banana (Google)',wue:'google',pue:'hyperscale',textPath:'measured'},
  flux:{name:'Flux (Black Forest Labs)',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  ideogram:{name:'Ideogram',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  firefly:{name:'Firefly (Adobe)',wue:'unknown',pue:'hyperscale',textPath:'benchmark'},
  veo:{name:'Veo (Google)',wue:'google',pue:'hyperscale',textPath:'benchmark'},
  kling:{name:'Kling (Kuaishou)',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  runway:{name:'Runway',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  hailuo:{name:'Hailuo (MiniMax)',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  seedance:{name:'Seedance (ByteDance)',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  wan:{name:'Wan (Alibaba)',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  luma:{name:'Luma Dream Machine',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  pika:{name:'Pika',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  cursor:{name:'Cursor',wue:'unknown',pue:'hyperscale',textPath:'benchmark'},
  claudecode:{name:'Claude Code (Anthropic)',wue:'unknown',pue:'hyperscale',textPath:'benchmark'},
  windsurf:{name:'Windsurf',wue:'unknown',pue:'hyperscale',textPath:'benchmark'},
  retired:{name:'A tool that has since shut down',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  multiple:{name:'More than one tool',wue:'unknown',pue:'unknown',textPath:'benchmark'},
  unsure:{name:"I'm not sure",wue:'unknown',pue:'unknown',textPath:'benchmark'}
};

/* Modality energy models */
const ENERGY = {
  text:{
    measured:{label:'Energy per text response (production-measured median, Gemini)',disp:'logN(P10 0.15, P50 0.24, P90 0.55) Wh',grade:'A',ref:1,base:()=>rLogN(0.15,0.24,0.55)},
    claim:{label:'Energy per text response (provider-claimed average)',disp:'logN(P10 0.15, P50 0.34, P90 1.5) Wh',grade:'C',ref:9,base:()=>rLogN(0.15,0.34,1.5)},
    benchmark:{label:'Energy per text response (open-model benchmarks, frontier scale)',disp:'logN(P10 0.15, P50 0.8, P90 4) Wh',grade:'C',ref:5,base:()=>rLogN(0.15,0.8,4)},
    reasoningMult:{label:'Reasoning-mode energy multiplier',disp:'tri(2, 8, 30) ×',grade:'C',ref:5,sample:()=>rTri(2,8,30)}
  },
  image:{
    perAttempt:{label:'Energy per image generation attempt',disp:'logN(P10 0.5, P50 2.9, P90 11) Wh',grade:'B',ref:2,sample:()=>rLogN(0.5,2.9,11)},
    upscale:{label:'Energy per upscale pass',disp:'tri(0.5, 1.5, 4) Wh',grade:'C',ref:2,sample:()=>rTri(0.5,1.5,4)}
  },
  video:{
    base5s:{label:'Energy per 5 s video attempt (720p-class baseline)',disp:'logN(P10 35, P50 90, P90 550) Wh',grade:'C',ref:3,sample:()=>rLogN(35,90,550)},
    durExp:{label:'Duration scaling exponent, within one native clip',disp:'tri(1.5, 1.9, 2.1)',grade:'C',ref:4,sample:()=>rTri(1.5,1.9,2.1)},
    clipLen:{label:'Native clip length before stitching',disp:'tri(5, 8, 12) s · longer videos = stitched clips, scaling linearly across segments',grade:'C',ref:11,sample:()=>rTri(5,8,12)},
    resFactor:{sd:0.55,hd:1.0,uhd:()=>rTri(1.15,2.2,6),label:'4K multiplier (usually an upscale pass; native 4K diffusion would be far higher)',disp:'tri(1.15, 2.2, 6) ×',grade:'C',ref:11}
  },
  coding:{
    reqPerHr:{occasional:[6,15,30],regular:[20,40,70],heavy:[45,80,140],agent:[80,160,320]},
    perReq:{label:'Energy per coding request (long-context text inference)',disp:'logN(P10 0.2, P50 1.0, P90 8) Wh',grade:'D',ref:5,sample:()=>rLogN(0.2,1.0,8)}
  }
};

/* Provider evidence explorer, August 2026 */
const EXPLORER = [
  {name:'Gemini · Google', strength:'strong', know:[['yes','Production-measured energy and on-site water per median text prompt [1]'],['yes','Fleet PUE and WUE published [8]'],['no','Per-request data centre or cooling system'],['no','Per-prompt figures for image and video generation']]},
  {name:'ChatGPT · OpenAI', strength:'partial', know:[['est','Company-claimed per-query energy and water; methodology unpublished [9]'],['est','Widely reported as served largely from Microsoft Azure, whose fleet WUE is published [8]'],['no','Model- or modality-level measurements'],['no','Per-request infrastructure details']]},
  {name:'Claude · Anthropic', strength:'partial', know:[['est','Comparable open-model benchmarks used as proxy [5]'],['no','Per-prompt energy or water disclosure to date'],['no','Facility-level WUE'],['yes','Text and coding only; Claude does not offer image or video generation']]},
  {name:'Mistral · Le Chat', strength:'partial', know:[['yes','Published a lifecycle assessment of Mistral Large 2 with ADEME [10]'],['est','Per-response figures include upstream effects, a wider boundary than ours'],['no','Facility-level WUE or PUE'],['no','Per-request infrastructure details']]},
  {name:'Veo · Google video', strength:'partial', know:[['yes','Runs on infrastructure with published fleet PUE and WUE [8]'],['no','Per-generation energy disclosure'],['est','Energy extrapolated from open video-model scaling laws [3][4]'],['no','Serving hardware or step counts']]},
  {name:'Kling · Hailuo · Seedance · Wan', strength:'weak', know:[['est','Energy extrapolated from open video-model measurements [3][4]'],['no','Environmental disclosures found for these services to date'],['no','Facility locations, PUE or WUE'],['est','Regional grid water intensity differs; treated as an undisclosed grid']]},
  {name:'Midjourney · Flux · Ideogram', strength:'weak', know:[['est','Energy from independent image-generation benchmarks [2]'],['no','Environmental disclosures found to date'],['no','Facility-level infrastructure data'],['yes','Benchmark image energies span a 30-fold range, which our distribution reflects']]},
  {name:'Discontinued tools (e.g. Sora, closed April 2026)', strength:'weak', know:[['yes','Sora web and app were discontinued on 26 April 2026; its API closes 24 September 2026'],['est','Historical usage can still be estimated from the same open benchmarks'],['no','Retrospective disclosures from the operator'],['yes','Estimates for retired tools carry the widest ranges']]}
];

/* =====================================================================
   ESTIMATION ENGINE
===================================================================== */
const MC_N = 8000;
const METHODOLOGY = 'Water Model v0.3 · energy-model 0.2 · direct-water 0.1 · electricity-water 0.1 · uncertainty 0.1 · evidence 2026-08 · catalogue 2026-08';

function pct(sorted,p){const i=(sorted.length-1)*p;const lo=Math.floor(i),hi=Math.ceil(i);return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);}

function buildEvents(s){
  const ev=[];
  if(s.task==='chat'){
    const n=s.exactResponses||{quick:2,short:10,long:30,research:80}[s.convLen]||10;
    const rf={none:0,some:0.3,lots:0.8,unsure:0.3}[s.reasoning]??0.3;
    ev.push({modality:'text',count:n,reasoningFrac:rf,label:'Text responses',accepted:true});
  }
  if(s.task==='image'){
    const kept=s.exactImages||{one:1,few:4,several:8,many:15}[s.imgCount]||4;
    const extra={none:0,few:Math.max(2,Math.round(kept*0.5)),lots:kept*2,unsure:Math.round(kept*0.8)}[s.versions]??0;
    ev.push({modality:'image',count:kept,label:'Image generations',accepted:true});
    if(extra>0)ev.push({modality:'image',count:extra,label:'Discarded versions',accepted:false});
    if(s.upscale==='yes')ev.push({modality:'imageUpscale',count:1,label:'Upscaling',accepted:true});
    ev.push({modality:'text',count:Math.round((kept+extra)*1.2),reasoningFrac:0,label:'Prompts',accepted:true,minor:true});
  }
  if(s.task==='video'){
    const kept=s.exactVideos||{one:1,few:3,several:8,many:14}[s.vidCount]||1;
    const dur={s5:5,s10:10,s30:30,m1:60}[s.vidDur]||10;
    const res={std:'sd',hd:'hd',uhd:'uhd',unsure:'hd'}[s.vidRes]||'hd';
    const retries={none:0,few:2,several:4,lots:8,unsure:3}[s.retries]??0;
    ev.push({modality:'video',count:kept,dur,res,label:'Video attempts (kept)',accepted:true});
    if(retries>0)ev.push({modality:'video',count:retries,dur,res,label:'Discarded generations',accepted:false});
    ev.push({modality:'text',count:(kept+retries)*2,reasoningFrac:0,label:'Text prompts',accepted:true,minor:true});
  }
  if(s.task==='coding'){
    const hrs={h05:0.5,h1:1.5,h4:4,h8:8,days:20}[s.codeDur]||2;
    const intensity=s.codeIntensity||'regular';
    const rf=intensity==='agent'?0.6:(s.codeUses||[]).includes('agent')?0.5:0.25;
    ev.push({modality:'coding',hours:hrs,intensity,reasoningFrac:rf,label:'AI coding assistance',accepted:true});
    if((s.codeUses||[]).includes('assets'))ev.push({modality:'image',count:6,label:'Generated assets',accepted:true});
  }
  return ev;
}

function estimate(state,ov){
  ov=ov||{};
  const events=buildEvents(state);
  const prov=PROVIDERS[state.provider]||PROVIDERS.unsure;
  const wueDef=INFRA.wue[prov.wue],pueDef=INFRA.pue[prov.pue];
  const textDef=ENERGY.text[prov.textPath]||ENERGY.text.benchmark;

  const totals=[],directs=[],elecs=[],energies=[];
  const perEvent=events.map(()=>[]);
  const samp={wue:[],pue:[],grid:[],escale:[]};

  for(let i=0;i<MC_N;i++){
    const wue=ov.wue!=null?ov.wue:wueDef.sample();
    const pue=ov.pue!=null?ov.pue:pueDef.sample();
    const gridDef=ov.lifecycle?INFRA.gridLife:INFRA.grid;
    const grid=ov.grid!=null?ov.grid:gridDef.sample();
    const textE=textDef.base();
    const reasonM=ENERGY.text.reasoningMult.sample();
    const imgE=ENERGY.image.perAttempt.sample();
    const vidBase=ENERGY.video.base5s.sample();
    const vidExp=ENERGY.video.durExp.sample();
    const clipLen=ENERGY.video.clipLen.sample();
    const uhdF=ENERGY.video.resFactor.uhd();
    const codeE=ENERGY.coding.perReq.sample();

    let E=0;
    events.forEach((e,ix)=>{
      let eE=0;
      if(e.modality==='text'){const per=textE*(1-e.reasoningFrac)+textE*reasonM*e.reasoningFrac;eE=e.count*per;}
      else if(e.modality==='image'){eE=e.count*imgE;}
      else if(e.modality==='imageUpscale'){eE=ENERGY.image.upscale.sample();}
      else if(e.modality==='video'){
        const rf=e.res==='uhd'?uhdF:ENERGY.video.resFactor[e.res];
        /* longer videos are stitched from native clips: near-quadratic within
           a clip [3][4], linear across segments [11] */
        const nClips=Math.max(1,Math.ceil(e.dur/clipLen));
        const within=e.dur/nClips;
        eE=e.count*nClips*vidBase*Math.pow(within/5,vidExp)*rf;
      }
      else if(e.modality==='coding'){const [lo,mo,hi]=ENERGY.coding.reqPerHr[e.intensity];const reqs=rTri(lo,mo,hi)*e.hours;const per=codeE*(1-e.reasoningFrac)+codeE*reasonM*0.5*e.reasoningFrac;eE=reqs*per;}
      perEvent[ix].push(eE);E+=eE;
    });

    const kwh=E/1000;
    const wDirect=kwh*wue, wElec=kwh*pue*grid;
    totals.push(wDirect+wElec);directs.push(wDirect);elecs.push(wElec);energies.push(kwh);
    samp.wue.push(wue);samp.pue.push(pue);samp.grid.push(grid);samp.escale.push(E);
  }

  const sT=[...totals].sort((a,b)=>a-b),sD=[...directs].sort((a,b)=>a-b),sE=[...elecs].sort((a,b)=>a-b),sK=[...energies].sort((a,b)=>a-b);
  const q=s=>({p05:pct(s,.05),p10:pct(s,.1),p50:pct(s,.5),p90:pct(s,.9)});
  const eventMed=perEvent.map(arr=>{const kwh=pct([...arr].sort((a,b)=>a-b),.5)/1000;return kwh*(pct([...samp.wue].sort((a,b)=>a-b),.5)+pct([...samp.pue].sort((a,b)=>a-b),.5)*pct([...samp.grid].sort((a,b)=>a-b),.5));});
  const attr=attribution(samp,totals);
  const ratio=q(sT).p90/Math.max(q(sT).p10,1e-9);
  const confidence=ratio<4?'high':ratio<12?'medium':'low';

  const grades=[wueDef.grade,INFRA.grid.grade];
  events.forEach(e=>{
    if(e.minor)return;
    if(e.modality==='text')grades.push(textDef.grade);
    if(e.modality==='image'||e.modality==='imageUpscale')grades.push(ENERGY.image.perAttempt.grade);
    if(e.modality==='video')grades.push(ENERGY.video.base5s.grade);
    if(e.modality==='coding')grades.push(ENERGY.coding.perReq.grade);
  });
  const grade=grades.sort()[grades.length-1];

  const estimatorId = state.task==='chat' ? (prov.textPath==='measured'?'text.production_measured.v2':prov.textPath==='claim'?'text.provider_claim.v2':'text.open_benchmark.v2')
    : state.task==='image' ? 'image.benchmark.luccioni2024.v2'
    : state.task==='video' ? 'video.segmented_scaling.v3'
    : 'coding.session_decomposition.v2';

  return {events,eventMed,total:q(sT),direct:q(sD),elec:q(sE),energy:q(sK),confidence,grade,attr,prov,wueDef,pueDef,textDef,estimatorId,samples:sT,
          coefs:usedCoefs(events,prov,wueDef,pueDef,textDef,ov.lifecycle?INFRA.gridLife:INFRA.grid)};
}

function attribution(samp,totals){
  const lt=totals.map(v=>Math.log(Math.max(v,1e-12)));
  function corr(xs){
    const lx=xs.map(v=>Math.log(Math.max(v,1e-12)));
    const n=lx.length,mx=lx.reduce((a,b)=>a+b)/n,my=lt.reduce((a,b)=>a+b)/n;
    let sxy=0,sxx=0,syy=0;
    for(let i=0;i<n;i++){const dx=lx[i]-mx,dy=lt[i]-my;sxy+=dx*dy;sxx+=dx*dx;syy+=dy*dy;}
    return sxx&&syy?(sxy/Math.sqrt(sxx*syy))**2:0;
  }
  const raw={
    'Model compute energy':corr(samp.escale),
    'Cooling system (WUE)':corr(samp.wue),
    'Electricity grid mix':corr(samp.grid),
    'Facility overhead (PUE)':corr(samp.pue)
  };
  const sum=Object.values(raw).reduce((a,b)=>a+b,0)||1;
  const norm=Object.entries(raw).map(([k,v])=>[k,v/sum]).filter(([,v])=>v>=0.03).sort((a,b)=>b[1]-a[1]);
  const kept=norm.reduce((a,[,v])=>a+v,0)||1;
  return norm.map(([k,v])=>[k,v/kept]);
}

function usedCoefs(events,prov,wueDef,pueDef,textDef,gridDef){
  const list=[wueDef,pueDef,gridDef||INFRA.grid];
  const mods=new Set(events.filter(e=>!e.minor).map(e=>e.modality));
  if(mods.has('text')||events.some(e=>e.modality==='text')){list.push(textDef);list.push(ENERGY.text.reasoningMult);}
  if(mods.has('image')||mods.has('imageUpscale'))list.push(ENERGY.image.perAttempt);
  if(events.some(e=>e.modality==='imageUpscale'))list.push(ENERGY.image.upscale);
  if(mods.has('video')){list.push(ENERGY.video.base5s,ENERGY.video.durExp,ENERGY.video.clipLen);}
  if(events.some(e=>e.modality==='video'&&e.res==='uhd'))list.push(ENERGY.video.resFactor);
  if(mods.has('coding'))list.push(ENERGY.coding.perReq);
  return list;
}


export function estimateSession(state, overrides = {}) { seed = 73421; return estimate(state, overrides); }
export { REFS, METHODOLOGY, buildEvents };
