const BASES=[
  ['lotus','🪷','ฐานดอกบัว'],['orchid','🌿','ฐานใบตองพับ'],['jasmine','🍀','ฐานใบไม้'],
  ['rose','🧺','ฐานตะกร้า'],['leaf','🌱','ฐานธรรมชาติ'],['gold','🏵️','ฐานสีทอง']
];
const FLOWERS=[
  ['lotus','🪷','บัวชมพู'],['rose','🌹','กุหลาบ'],['orchid','🌺','กล้วยไม้'],
  ['jasmine','🌼','มะลิ'],['tulip','🌷','ทิวลิป'],['sunflower','🌻','ทานตะวัน']
];
const CANDLES=[
  ['classic','🕯️','เทียนเดี่ยว'],['pair','🕯️🕯️','เทียนคู่'],['incense','🪔','ธูป 3 ดอก'],
  ['golden','✨','แสงทอง'],['lantern','🏮','โคมไฟ'],['sparkle','🎇','แสงประกาย']
];
const state={
  type:'lotus',flower:'lotus',candle:'classic',color:'#ffc977',photo:'',photoProcessing:false,
  items:[],recentItems:[],total:0,minute:null,ownItem:null,ownUntil:0,tickerIndex:0,adminToken:localStorage.getItem('phiPhiHrToken')||'',hrPool:[],renderToken:0
};
const $=id=>document.getElementById(id);
const API=(window.APP_CONFIG||{}).API_URL||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePhoto=s=>/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(s||''))?s:'';
const drifters=new Map();
// Pending items are NOT inserted into the DOM until their turn arrives.
// This prevents all 20 krathongs from appearing stacked at the left edge.
let pendingSeaEntries=[];
let nextSeaEntryAt=0;
const SEA_ENTRY_GAP_MS=2600;
const marineLife=[];
let lastFrame=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function getParts(item){
  return {
    base:BASES.find(t=>t[0]===item.type)||BASES[0],
    flower:FLOWERS.find(t=>t[0]===item.flower)||FLOWERS[0],
    candle:CANDLES.find(t=>t[0]===item.candle)||CANDLES[0]
  };
}

function buildBase(type){
  switch(type){
    case 'lotus':
      return `<span class="base-shape base-lotus"><i></i><i></i><i></i><i></i><i></i><em></em></span>`;
    case 'orchid':
      return `<span class="base-shape base-orchid"><i></i><i></i><i></i><i></i><i></i><em></em></span>`;
    case 'jasmine':
      return `<span class="base-shape base-jasmine"><i></i><i></i><i></i><i></i><em></em></span>`;
    case 'rose':
      return `<span class="base-shape base-rose"><i></i><i></i><i></i><i></i><em></em></span>`;
    case 'leaf':
      return `<span class="base-shape base-leaf"><i></i><i></i><i></i><i></i><em></em></span>`;
    case 'gold':
      return `<span class="base-shape base-gold"><i></i><i></i><i></i><i></i><i></i><em></em></span>`;
    default:
      return `<span class="base-shape base-lotus"><i></i><i></i><i></i><i></i><i></i><em></em></span>`;
  }
}
function buildFlower(type){
  const icon=(FLOWERS.find(t=>t[0]===type)||FLOWERS[0])[1];
  return `<span class="flower-shape flower-${type}">${icon}</span>`;
}
function buildCandle(type){
  switch(type){
    case 'classic':
      return `<span class="candle-shape candle-classic"><i></i></span>`;
    case 'pair':
      return `<span class="candle-shape candle-pair"><i></i><i></i></span>`;
    case 'incense':
      return `<span class="candle-shape candle-incense"><i></i><i></i><i></i><b></b><b></b><b></b></span>`;
    case 'golden':
      return `<span class="candle-shape candle-golden"><i>✦</i><i>✦</i><i>✦</i></span>`;
    case 'lantern':
      return `<span class="candle-shape candle-lantern"><i></i><b></b></span>`;
    case 'sparkle':
      return `<span class="candle-shape candle-sparkle"><i></i><i></i><i></i><i></i></span>`;
    default:
      return `<span class="candle-shape candle-classic"><i></i></span>`;
  }
}
function artHTML(item){
  const parts=getParts(item);
  return `<span class="art-stack"><span class="art-base-box">${buildBase(parts.base[0])}</span><span class="art-flower-box">${buildFlower(parts.flower[0])}</span><span class="art-candle-box">${buildCandle(parts.candle[0])}</span></span>`;
}

function updatePreview(){
  $('previewArt').innerHTML=artHTML(state);
  $('krathongPreview').style.setProperty('--glow',state.color);
  $('photoBadge').hidden=!state.photo;
  $('previewName').textContent=$('name').value.trim()||'ชื่อผู้ลอย';
  if(state.photo) $('photoBadge').style.backgroundImage=`url("${state.photo}")`;
}
function renderChoices(id,values,key){
  $(id).innerHTML=values.map(([k,e,n])=>`<button type="button" class="choice ${k===state[key]?'active':''}" data-value="${k}" aria-pressed="${k===state[key]}"><div class="emoji">${e}</div><b>${n}</b></button>`).join('');
  $(id).addEventListener('click',e=>{
    const b=e.target.closest('[data-value]'); if(!b) return;
    state[key]=b.dataset.value;
    $(id).querySelectorAll('.choice').forEach(x=>{const chosen=x===b;x.classList.toggle('active',chosen);x.setAttribute('aria-pressed',String(chosen));});
    updatePreview();
  });
}
function initChoices(){
  renderChoices('choices',BASES,'type');
  renderChoices('flowerChoices',FLOWERS,'flower');
  renderChoices('candleChoices',CANDLES,'candle');
  $('colors').addEventListener('click',e=>{
    const b=e.target.closest('.color'); if(!b) return;
    state.color=b.dataset.color;
    document.querySelectorAll('.color').forEach(x=>x.classList.toggle('active',x===b));
    updatePreview();
  });
}

function openModal(id){ $(id).hidden=false; document.body.classList.add('noscroll'); }
function closeModal(id){ $(id).hidden=true; if([...document.querySelectorAll('.modal')].every(m=>m.hidden)) document.body.classList.remove('noscroll'); }
$('openBuilder').onclick=()=>openModal('builderModal');
$('openHrTop').onclick=()=>openModal('hrModal');
$('closeBuilder').onclick=()=>closeModal('builderModal');
$('cancelBuilder').onclick=()=>closeModal('builderModal');
$('closeHr').onclick=()=>closeModal('hrModal');
$('closeDialog').onclick=()=>closeModal('dialog');
$('builderModal').onclick=e=>{ if(e.target===$('builderModal')) closeModal('builderModal'); };
$('hrModal').onclick=e=>{ if(e.target===$('hrModal')) closeModal('hrModal'); };
$('dialog').onclick=e=>{ if(e.target===$('dialog')) closeModal('dialog'); };

$('name').addEventListener('input',updatePreview);
$('photo').addEventListener('change',async e=>{
  const f=e.target.files?.[0];
  if(!f) return;
  if(f.size>12*1024*1024){ $('photoStatus').textContent='ไฟล์ใหญ่เกิน 12 MB'; e.target.value=''; return; }
  state.photoProcessing=true; $('release').disabled=true; $('photoStatus').textContent='กำลังเตรียมรูป...';
  try{
    const data=await shrink(f);
    if(!safePhoto(data)) throw Error('รูปแบบภาพไม่รองรับ');
    state.photo=data;
    $('photoStatus').textContent='✓ แนบรูปแล้ว กรุณาติ๊กยินยอมให้แสดงรูปบนกระทง';
    $('clearPhoto').hidden=false;
    updatePreview();
  }catch(err){
    console.error('Photo processing failed:',err);
    $('photoStatus').textContent='ไม่สามารถอ่านรูปนี้ได้ ลองใช้รูป JPG/PNG หรือแปลง HEIC เป็น JPG';
    e.target.value=''; state.photo=''; $('clearPhoto').hidden=true; updatePreview();
  }finally{
    state.photoProcessing=false; $('release').disabled=false;
  }
});
$('clearPhoto').onclick=()=>{
  state.photo=''; $('photo').value=''; $('photoPublic').checked=false;
  $('photoStatus').textContent='ยังไม่ได้เลือกรูป'; $('clearPhoto').hidden=true; updatePreview();
};
function readDataUrl(file){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(Error('อ่านรูปไม่ได้')); reader.readAsDataURL(file); }); }
function imageFromUrl(url){ return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(Error('เปิดรูปไม่ได้')); img.src=url; }); }
async function shrink(file){
  const src=await readDataUrl(file);
  const img=await imageFromUrl(src);
  if(!img.naturalWidth || !img.naturalHeight) throw Error('Invalid image');
  let edge=260;
  for(let attempt=0;attempt<6;attempt++){
    const scale=Math.min(1, edge/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL('image/jpeg',Math.max(.43,.8-attempt*.065));
    if(result.length<150000) return result;
    edge=Math.round(edge*.82);
  }
  throw Error('Photo exceeds upload limit');
}

function setReleaseLoading(isLoading){
  const overlay=$('releaseLoading');
  const btn=$('release');
  const cancel=$('cancelBuilder');
  const close=$('closeBuilder');
  const file=$('photo');
  if(isLoading){
    overlay.hidden=false;
    btn.disabled=true;
    btn.dataset.originalLabel = btn.dataset.originalLabel || btn.innerHTML;
    btn.innerHTML='<span class="btn-spin"></span> กำลังปล่อย...';
    cancel.disabled=true;
    close.disabled=true;
    if(file) file.disabled=true;
    document.body.classList.add('is-releasing-krathong');
  }else{
    overlay.hidden=true;
    btn.disabled=false;
    if(btn.dataset.originalLabel) btn.innerHTML=btn.dataset.originalLabel;
    cancel.disabled=false;
    close.disabled=false;
    if(file) file.disabled=false;
    document.body.classList.remove('is-releasing-krathong');
  }
}

async function request(action,data={},method='POST'){
  if(!API || API.includes('REPLACE-WITH')) throw Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js');
  const url=API.replace(/\/$/,'');
  const resp=await fetch(method==='GET'?url+'?'+new URLSearchParams({action,...data}):url,{
    method,
    headers:method==='POST'?{'Content-Type':'application/json'}:{},
    body:method==='POST'?JSON.stringify({action,...data}):undefined
  });
  const out=await resp.json();
  if(!resp.ok || !out.ok) throw Error(out.error||'API Error');
  return out;
}

function displayWish(item){
  const photo=safePhoto(item.photo);
  $('dialogBody').innerHTML=`<div class="wish-symbol"><div class="krathong-art dialog-art">${artHTML(item)}</div></div>${photo?`<img class="wish-face" src="${photo}" alt="รูปผู้ร่วมกิจกรรม">`:''}<h3>${esc(item.name)}</h3><small>${esc(item.department)}</small><p>${esc(item.wish)}</p><small>${new Date(item.createdAt).toLocaleString('th-TH')}</small>`;
  openModal('dialog');
}

// V7: all atmospheric objects live in a sky-only layer above the horizon (42%).
function initSeaDecor(){
  const sea=$('seaBoard');
  if(sea.dataset.decorReady) return;
  sea.dataset.decorReady='1';
  const sky=document.createElement('div');
  sky.className='atmosphere-sky';
  sky.setAttribute('aria-hidden','true');

  // Slow, staggered fireworks. Each new cycle starts at a randomized position.
  for(let i=0;i<3;i++){
    const pyro=document.createElement('div');
    pyro.className='pyro v7-pyro';
    pyro.innerHTML='<div class="before"></div><div class="after"></div>';
    pyro.style.setProperty('--cycle',(10+Math.random()*7).toFixed(2)+'s');
    pyro.style.setProperty('--delay',(-Math.random()*15).toFixed(2)+'s');
    const relocate=()=>{
      pyro.style.left=(12+Math.random()*76).toFixed(2)+'%';
      pyro.style.top=(16+Math.random()*50).toFixed(2)+'%';
      pyro.style.setProperty('--burst-scale',(0.42+Math.random()*0.33).toFixed(2));
    };
    relocate();
    pyro.addEventListener('animationiteration',e=>{if(e.animationName==='v7Firework') relocate();});
    sky.appendChild(pyro);
  }
  // Drifting clouds in both directions, entirely within the sky.
  for(let i=0;i<5;i++){
    const cloud=document.createElement('div');
    cloud.className='v7-cloud '+(i%2===0?'v7-cloud-right':'v7-cloud-left');
    cloud.style.top=(8+Math.random()*55).toFixed(1)+'%';
    cloud.style.setProperty('--cloud-scale',(0.65+Math.random()*0.9).toFixed(2));
    cloud.style.setProperty('--cloud-duration',(34+Math.random()*35).toFixed(1)+'s');
    cloud.style.setProperty('--cloud-delay',(-Math.random()*60).toFixed(1)+'s');
    sky.appendChild(cloud);
  }
  // Lanterns are created at the horizon and can never enter the sea layer.
  for(let i=0;i<9;i++){
    const lantern=document.createElement('div');
    lantern.className='sky-lantern v7-lantern';
    const reset=()=>{
      lantern.style.left=(5+Math.random()*88).toFixed(2)+'%';
      lantern.style.setProperty('--lantern-size',(12+Math.random()*20).toFixed(1)+'px');
      lantern.style.setProperty('--lantern-drift',(-55+Math.random()*110).toFixed(1)+'px');
      lantern.style.setProperty('--lantern-travel',(sky.clientHeight+75)+'px');
    };
    reset();
    lantern.style.setProperty('--lantern-duration',(15+Math.random()*17).toFixed(1)+'s');
    lantern.style.setProperty('--lantern-delay',(-Math.random()*30).toFixed(1)+'s');
    lantern.addEventListener('animationiteration',e=>{if(e.animationName==='v7LanternRise')reset();});
    sky.appendChild(lantern);
  }
  sea.appendChild(sky);
  // Moon must be painted beneath the sky overlay so lanterns cross in front.
  sky.style.zIndex='4';
  window.addEventListener('resize',()=>{
    for(const lantern of sky.querySelectorAll('.v7-lantern'))
      lantern.style.setProperty('--lantern-travel',(sky.clientHeight+75)+'px');
  },{passive:true});
  // The sea remains rendered below the sky; no islands are created.
  initSeaLife();
}

// Lightweight SVG sea life on the water layer: decorative only, no interaction with participants.
const SEA_LIFE_ART={
  turtle:`<svg viewBox="0 0 150 85" aria-hidden="true"><defs><linearGradient id="turtleShell" x2="0" y2="1"><stop stop-color="#7ed4ad"/><stop offset="1" stop-color="#286f77"/></linearGradient></defs><path class="turtle-flipper front-a" d="M27 41 Q5 22 4 40 Q6 56 29 48" fill="#66b6a5" opacity=".92"/><path class="turtle-flipper front-b" d="M92 35 Q129 9 131 23 Q132 40 101 47" fill="#66b6a5" opacity=".92"/><path class="turtle-flipper back-a" d="M38 58 Q15 78 29 80 Q45 72 56 61" fill="#59a796" opacity=".88"/><path class="turtle-flipper back-b" d="M94 58 Q119 80 130 73 Q130 61 105 52" fill="#59a796" opacity=".88"/><ellipse class="turtle-shell" cx="72" cy="45" rx="46" ry="28" fill="url(#turtleShell)"/><path d="M46 35 L72 21 L97 35 L101 51 L73 66 L44 51 Z M72 21 L73 66 M46 35 L101 51" fill="none" stroke="#b8e2ba" stroke-width="3" opacity=".55"/><circle class="turtle-head" cx="130" cy="43" r="18" fill="#74c9b1"/><circle cx="138" cy="38" r="3" fill="#102e40"/></svg>`,
  ray:`<svg viewBox="0 0 180 95" aria-hidden="true"><defs><linearGradient id="rayShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#83bcd1"/><stop offset="1" stop-color="#326d8c"/></linearGradient></defs><path class="ray-wing wing-left" d="M15 49 Q41 3 91 34 Q76 49 69 66 Q33 57 15 49" fill="url(#rayShade)" stroke="#b8e5ee" stroke-width="2" opacity=".96"/><path class="ray-wing wing-right" d="M91 34 Q127 3 165 46 Q136 52 121 68 Q102 83 89 72 Q85 52 91 34" fill="url(#rayShade)" stroke="#b8e5ee" stroke-width="2" opacity=".96"/><path class="ray-tail" d="M90 71 Q94 83 90 95" fill="none" stroke="#5ea4ba" stroke-width="4"/><circle cx="75" cy="47" r="3" fill="#102d40"/><circle cx="103" cy="47" r="3" fill="#102d40"/></svg>`,
  dolphin:`<svg viewBox="0 0 180 95" aria-hidden="true"><defs><linearGradient id="dolphinSkin" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#91c5da"/><stop offset="1" stop-color="#317193"/></linearGradient></defs><path class="dolphin-body" d="M15 58 Q30 50 36 32 Q34 56 57 50 Q75 13 110 26 L124 12 L127 35 Q144 43 154 52 L176 50 L154 62 Q125 85 90 72 L70 86 L74 66 Q44 70 15 58" fill="url(#dolphinSkin)" stroke="#afdbe7" stroke-width="2"/><path class="dolphin-tail" d="M15 58 Q30 50 36 32 Q34 56 57 50 Q43 60 15 58" fill="#5f95b1" opacity=".95"/><path class="dolphin-fin" d="M91 38 Q104 23 111 32 Q100 37 96 48" fill="#5f95b1" opacity=".92"/><path d="M63 62 Q103 76 141 57" stroke="#c8e9ec" stroke-width="4" opacity=".6" fill="none"/><circle cx="141" cy="48" r="3" fill="#092d40"/></svg>`,
  fish:`<svg viewBox="0 0 130 80" aria-hidden="true"><defs><linearGradient id="fishShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffdc8f"/><stop offset="1" stop-color="#e27c63"/></linearGradient></defs><path class="fish-tail" d="M30 40 L4 14 L5 65 Z" fill="#e99663"/><ellipse class="fish-body" cx="76" cy="41" rx="48" ry="29" fill="url(#fishShade)" stroke="#ffe3b1" stroke-width="2"/><path class="fish-fin" d="M61 37 Q50 22 39 31 Q50 38 58 46" fill="#f1a36d" opacity=".92"/><path d="M64 13 Q70 35 64 68 M86 14 Q91 40 85 67" fill="none" stroke="#fff1bc" stroke-width="7" opacity=".65"/><circle cx="106" cy="33" r="4" fill="#253545"/></svg>`
};
function initSeaLife(){
  const sea=$('seaBoard');
  let layer=sea.querySelector('.marine-layer');
  if(layer) return;
  layer=document.createElement('div');
  layer.className='marine-layer';
  layer.setAttribute('aria-hidden','true');
  sea.appendChild(layer);
  marineLife.length=0;
  const mobile=window.matchMedia('(max-width:760px)').matches;
  const plan=mobile
    ? ['fish','turtle','ray','fish']
    : ['fish','turtle','dolphin','ray','fish','turtle','fish'];
  const specs={
    fish:{size:[40,58],speed:[14,22],amp:[5,10],depth:[.69,.89],tilt:8},
    turtle:{size:[66,86],speed:[8,14],amp:[4,8],depth:[.65,.86],tilt:5},
    ray:{size:[78,104],speed:[10,16],amp:[6,10],depth:[.62,.84],tilt:7},
    dolphin:{size:[88,116],speed:[15,23],amp:[6,11],depth:[.58,.76],tilt:9}
  };
  const rr=(a,b)=>a+Math.random()*(b-a);
  plan.forEach((kind,i)=>{
    const spec=specs[kind];
    const size=rr(spec.size[0],spec.size[1]);
    const dir=(i%2===0)?1:-1;
    const y=sea.clientHeight*rr(spec.depth[0],spec.depth[1]);
    const x=dir>0 ? rr(-sea.clientWidth*.15, sea.clientWidth*.9) : rr(sea.clientWidth*.1, sea.clientWidth*1.15);
    const animal=document.createElement('span');
    animal.className=`marine-animal marine-${kind}`;
    animal.innerHTML=`<span class="marine-body">${SEA_LIFE_ART[kind]}</span>`;
    layer.appendChild(animal);
    marineLife.push({
      el:animal, kind, size, dir, x, y,
      speed:rr(spec.speed[0],spec.speed[1]), amp:rr(spec.amp[0],spec.amp[1]),
      phase:Math.random()*Math.PI*2, sway:rr(.55,1.05),
      tilt:rr(spec.tilt*.55,spec.tilt), lane:y, laneDrift:rr(3,11), lanePhase:Math.random()*Math.PI*2,
      opacity: kind==='fish' ? rr(.52,.72) : kind==='dolphin' ? rr(.30,.48) : rr(.38,.6)
    });
  });
  function syncMarineBounds(){
    for(const m of marineLife){
      m.el.style.width=m.size+'px';
    }
  }
  syncMarineBounds();
  window.addEventListener('resize',syncMarineBounds,{passive:true});
}

// New krathongs enter naturally from the LEFT instead of appearing in the middle.
// Different lanes, gentle speed variation, and staggered entry prevent a sudden cluster.
function randomPosition(sea){
  return {x:-105, y:sea.clientHeight*(.58+Math.random()*.27)};
}
function hydrateSeaItemAssets(el){
  const img=el.querySelector('.side-avatar');
  if(!img) return;
  el.classList.add('photo-pending');
  const done=()=>el.classList.remove('photo-pending');
  img.addEventListener('load',done,{once:true});
  img.addEventListener('error',done,{once:true});
  if(img.complete) done();
}
function seaItemKey(item){
  return [item.id,item.name,item.photo,item.type,item.flower,item.candle,item.color].join('|');
}
function patchDrifterNode(node,item){
  node.style.setProperty('--glow',/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:'#ffc977');
  node.innerHTML=seaItemHTML(item);
  node.onclick=()=>displayWish(item);
  node.dataset.itemKey=seaItemKey(item);
  hydrateSeaItemAssets(node);
}
function seaItemHTML(item){
  const photo=safePhoto(item.photo);
  return `<span class="sea-bob"><span class="krathong-art">${artHTML(item)}</span>${photo?`<img src="${photo}" class="side-avatar" alt="รูปผู้ลอย">`:''}<span class="sea-name">${esc(item.name||'ไม่ระบุชื่อ')}</span></span>`;
}
function addDrifter(item){
  const sea=$('seaBoard');
  const b=document.createElement('button');
  b.type='button'; b.className='sea-item';
  b.setAttribute('aria-label','กระทงของ '+(item.name||''));
  patchDrifterNode(b,item);
  sea.appendChild(b);
  const pos=randomPosition(sea);
  const direction=1;
  // Only one new krathong is created each time the queue releases an item.
  const speed=16+Math.random()*9;
  drifters.set(String(item.id),{
    el:b,item,x:pos.x,y:pos.y,
    vx:speed,vy:0,entrySpeed:42+Math.random()*8,
    entering:true,
    direction,flow:Math.random()*Math.PI*2,turn:0,phase:Math.random()*7
  });
  b.style.left=pos.x+'px';
  b.style.top=pos.y+'px';
}
function renderSea(){
  $('total').textContent=Number(state.total||state.items.length).toLocaleString('th-TH');
  const sea=$('seaBoard');
  let visible=state.items.slice(0,20);
  if(state.ownItem && Date.now()<state.ownUntil && !visible.some(i=>String(i.id)===String(state.ownItem.id))){
    visible=[state.ownItem,...visible.slice(0,19)];
  }
  const ids=new Set(visible.map(x=>String(x.id)));
  for(const [id,v] of drifters){
    if(!ids.has(id)){ v.el.remove(); drifters.delete(id); }
  }
  sea.querySelectorAll('.empty').forEach(x=>x.remove());
  if(!visible.length){
    pendingSeaEntries=[];
    nextSeaEntryAt=0;
    sea.insertAdjacentHTML('beforeend','<div class="empty">ยังไม่มีกระทง มาเป็นคนแรกกันเถอะ 🪷</div>');
    renderWishTicker();
    return;
  }

  // Preserve already-floating krathongs and their position on each API refresh.
  // Queue new ones separately: there is no hidden stack of 20 objects at x=-105.
  pendingSeaEntries=pendingSeaEntries.filter(x=>ids.has(String(x.id)) && !drifters.has(String(x.id)));
  const pendingById=new Map(pendingSeaEntries.map(x=>[String(x.id),x]));
  for(const item of visible){
    const id=String(item.id);
    const old=drifters.get(id);
    if(old){
      old.item=item;
      if(old.el.dataset.itemKey!==seaItemKey(item)) patchDrifterNode(old.el,item);
    }else if(pendingById.has(id)){
      Object.assign(pendingById.get(id),item); // latest content, same queue position
    }else{
      pendingSeaEntries.push(item);
    }
  }
  if(!nextSeaEntryAt && pendingSeaEntries.length) nextSeaEntryAt=performance.now();
  renderWishTicker();
}

function releaseNextSeaEntry(now){
  if(!pendingSeaEntries.length){ nextSeaEntryAt=0; return; }
  if(now<nextSeaEntryAt) return;
  const item=pendingSeaEntries.shift();
  if(item && !drifters.has(String(item.id))) addDrifter(item);
  // The spacing is temporal AND spatial: at 42–50 px/s this creates
  // ~110–130 px between successive entries, rather than a left-edge pileup.
  nextSeaEntryAt=now+SEA_ENTRY_GAP_MS;
}

function animateSea(ts){
  const dt=Math.min(.05,Math.max(0,(ts-lastFrame)/1000||0)); lastFrame=ts;
  const sea=$('seaBoard');
  if(!document.hidden && sea.clientWidth){
    const w=sea.clientWidth,h=sea.clientHeight;
    releaseNextSeaEntry(ts);

    for(const m of marineLife){
      m.phase+=dt*m.sway;
      m.lanePhase+=dt*(m.sway*.55);
      m.x+=m.speed*m.dir*dt;
      const wobble=Math.sin(m.phase*2.1)*m.amp;
      const drift=Math.sin(m.lanePhase)*m.laneDrift;
      m.y=m.lane + wobble + drift;
      const off=m.size*1.4;
      if(m.dir>0 && m.x>w+off){
        m.x=-off;
        m.lane=h*((m.kind==='dolphin'?0.58:0.64)+Math.random()*(m.kind==='fish'?0.24:0.18));
      }else if(m.dir<0 && m.x<-off){
        m.x=w+off;
        m.lane=h*((m.kind==='dolphin'?0.58:0.64)+Math.random()*(m.kind==='fish'?0.24:0.18));
      }
      const tilt=Math.sin(m.phase*1.55)*(m.tilt||6) + (m.dir>0?1:-1)*1.5;
      m.el.style.opacity=m.opacity;
      m.el.style.transform=`translate3d(${m.x}px,${m.y}px,0) scaleX(${m.dir>0?1:-1}) rotate(${tilt}deg)`;
    }

    for(const v of drifters.values()){
      if(v.sinking || v.respawnPending) continue;
      v.phase+=dt;
      v.flow+=dt;
      // All krathongs flow LEFT -> RIGHT; no reversing.
      v.vx=Math.abs(v.vx)||18;
      v.x+=(v.entering ? v.entrySpeed : v.vx)*dt;
      if(v.x>=105) v.entering=false;
      v.y+=Math.sin(v.flow*.6)*dt*1.6;
      v.y=Math.max(h*.55,Math.min(h*.88,v.y));
      const margin=110;
      if(v.x>w+margin){
        v.x=-margin;
        v.y=h*(.58+Math.random()*.27);
      }
      v.el.style.left=v.x+'px';
      v.el.style.top=(v.y+Math.sin(v.phase*1.7)*3)+'px';
    }
  }
  requestAnimationFrame(animateSea);
}

function renderWishTicker(){
  const node=$('wishTicker');
  if(!node) return;
  const source=(state.recentItems.length?state.recentItems:state.items).filter(x=>String(x.wish||'').trim());
  if(!source.length){node.textContent='ร่วมลอยกระทงเพื่อแบ่งปันคำอธิษฐานของคุณ';node.onclick=null;return;}
  state.tickerIndex%=source.length;
  const item=source[state.tickerIndex];
  const short=String(item.wish).length>88?String(item.wish).slice(0,88)+'…':String(item.wish);
  node.textContent='💫 '+(item.name||'ผู้ร่วมกิจกรรม')+' : '+short+'  ·  แตะเพื่ออ่านทั้งหมด';
  node.onclick=()=>displayWish(item);
}
async function loadSea(){
  if(loadSea.busy) return;
  loadSea.busy=true;
  try{
    // Backend selects 20 out of ALL live participants, stable per-minute.
    const out=await request('list',{limit:'20',random:'20'},'GET');
    const nextMinute=out.minute ?? Math.floor(Date.now()/60000);
    const nextItems=out.items||[];
    const nextKey=nextItems.map(x=>String(x.id)).join('|');
    const prevKey=state.items.map(x=>String(x.id)).join('|');
    const structureChanged=state.minute!==nextMinute || nextKey!==prevKey || nextItems.some((x,i)=>seaItemKey(x)!==seaItemKey(state.items[i]||{}));
    state.items=nextItems;
    state.recentItems=out.recent||nextItems;
    state.total=Number(out.total??nextItems.length);
    state.minute=nextMinute;
    initSeaDecor();
    if(structureChanged){
      renderSea();
    }else{
      $('total').textContent=state.total.toLocaleString('th-TH');
      renderWishTicker();
    }
  }catch(e){ console.error('Automatic sea refresh failed:',e); }
  finally{loadSea.busy=false;}
}

$('release').onclick=async()=>{
  const name=$('name').value.trim(), employeeId=$('employeeId').value.trim(), department=$('dept').value, wish=$('wish').value.trim();
  if(state.photoProcessing){ $('status').textContent='กำลังประมวลผลรูป โปรดลองอีกครั้ง'; return; }
  if(!name || !department || !wish){ $('status').textContent='กรุณากรอกชื่อ แผนก และคำอธิษฐาน'; return; }
  if(!$('consent').checked){ $('status').textContent='โปรดยืนยันการยินยอมก่อนส่ง'; return; }
  if(state.photo && !$('photoPublic').checked){ $('status').textContent='โปรดยินยอมให้แสดงรูปบนกระทง หรือกดลบรูปที่เลือก'; return; }
  setReleaseLoading(true); $('status').textContent='กำลังปล่อยกระทง...';
  try{
    const out=await request('create',{name,employeeId,department,wish,type:state.type,flower:state.flower,candle:state.candle,color:state.color,photo:state.photo,photoPublic:!!state.photo&&$('photoPublic').checked,consent:true});
    if(out.item){
      state.ownItem=out.item;state.ownUntil=Date.now()+65000;
      state.total+=1;
      state.recentItems=[out.item,...state.recentItems.filter(x=>String(x.id)!==String(out.item.id))].slice(0,12);
      renderSea();
    }
    $('launch').hidden=false;
    setTimeout(()=>{$('launch').hidden=true;},2300);
    $('status').textContent='กระทงของคุณลอยอยู่ในทะเลแล้ว!';
    setTimeout(()=>{ resetBuilder(); closeModal('builderModal'); },1000);
    localStorage.setItem('phiPhiLastWish',new Date().toISOString());
  }catch(e){ $('status').textContent=e.message; }
  finally{ setReleaseLoading(false); }
};
function resetBuilder(){
  $('builderForm').reset();
  state.type='lotus'; state.flower='lotus'; state.candle='classic'; state.color='#ffc977'; state.photo='';
  [['choices','lotus'],['flowerChoices','lotus'],['candleChoices','classic']].forEach(([id,key])=>$(id).querySelectorAll('.choice').forEach(x=>{const selected=x.dataset.value===key;x.classList.toggle('active',selected);x.setAttribute('aria-pressed',String(selected));}));
  document.querySelectorAll('.color').forEach((x,i)=>x.classList.toggle('active',i===0));
  $('photoStatus').textContent='เลือกรูปจากอัลบั้มหรือถ่ายรูปใหม่ (สูงสุด 12 MB) ระบบจะย่อรูปให้อัตโนมัติ';
  $('clearPhoto').hidden=true; $('status').textContent=''; updatePreview();
}

async function hrLogin(){
  const pin=$('hrPin').value.trim(); if(!pin){ $('hrLoginStatus').textContent='กรุณากรอก PIN'; return; }
  $('hrLoginBtn').disabled=true; $('hrLoginStatus').textContent='กำลังตรวจสอบ...';
  try{
    const out=await request('hr_login',{pin});
    state.adminToken=out.token; localStorage.setItem('phiPhiHrToken',out.token);
    $('hrLoginStatus').textContent='เข้าสู่ระบบสำเร็จ';
    $('hrLoginBox').hidden=true; $('hrPanel').hidden=false;
    await loadAdminList();
  }catch(e){ $('hrLoginStatus').textContent=e.message; }
  finally{ $('hrLoginBtn').disabled=false; }
}
async function loadAdminList(){
  if(!state.adminToken) return;
  const out=await request('admin_list',{token:state.adminToken});
  state.hrPool=out.items||[];
  $('hrTotal').textContent=out.total.toLocaleString('th-TH');
  $('hrList').innerHTML=(out.items||[]).slice(0,100).map(item=>`<tr><td>${esc(item.name)}</td><td>${esc(item.department)}</td><td>${esc(item.wish)}</td><td>${new Date(item.createdAt).toLocaleString('th-TH')}</td></tr>`).join('') || '<tr><td colspan="4">ยังไม่มีข้อมูล</td></tr>';
}
function renderRollingWinner(item,poolSize,final=false){
  const symbol=getParts(item).flower[1];
  $('winnerBox').classList.remove('emptywinner');
  $('winnerBox').classList.toggle('drawing',!final);
  $('winnerBox').innerHTML=`<div class="winner-tag">${final?'ผู้โชคดี':'กำลังสุ่มรางวัล...'}</div><div class="winner-symbol">${symbol}</div>${item.photo?`<img class="winner-face" src="${item.photo}" alt="">`:''}<h4>${esc(item.name||'')}</h4><p>${esc(item.department||'')}</p>${final?`<small>รหัสพนักงาน: ${esc(item.employeeId||'-')}</small><div class="winner-wish">“${esc(item.wish||'')}”</div><small>สุ่มจากผู้เข้าร่วมทั้งหมด ${Number(poolSize||0).toLocaleString('th-TH')} คน</small>`:'<div class="winner-wish">กำลังหมุนรายชื่อผู้เข้าร่วม...</div>'}`;
}
async function runLuckyAnimation(finalWinner,poolSize){
  const pool=(state.hrPool&&state.hrPool.length?state.hrPool:[finalWinner]).filter(Boolean);
  const start=Date.now();
  while(Date.now()-start<2400){
    const pick=pool[Math.floor(Math.random()*pool.length)]||finalWinner;
    renderRollingWinner(pick,poolSize,false);
    await new Promise(r=>setTimeout(r,110));
  }
}
async function drawWinner(){
  const btn=$('drawBtn');
  btn.disabled=true;
  try{
    if(!state.hrPool.length) await loadAdminList();
    const out=await request('draw',{token:state.adminToken});
    await runLuckyAnimation(out.winner,out.poolSize);
    renderRollingWinner(out.winner,out.poolSize,true);
  }catch(e){ alert(e.message); }
  finally{ btn.disabled=false; }
}
function syncHrUi(){
  if(state.adminToken){ $('hrLoginBox').hidden=true; $('hrPanel').hidden=false; loadAdminList().catch(()=>{logoutHr();}); }
  else { $('hrLoginBox').hidden=false; $('hrPanel').hidden=true; }
}
function logoutHr(){ state.adminToken=''; localStorage.removeItem('phiPhiHrToken'); $('hrPin').value=''; $('hrLoginStatus').textContent=''; syncHrUi(); }

$('hrLoginBtn').onclick=hrLogin;
$('drawBtn').onclick=drawWinner;
$('hrRefresh').onclick=()=>loadAdminList().catch(err=>alert(err.message));
$('hrLogoutBtn').onclick=logoutHr;

initChoices();
updatePreview();
syncHrUi();
initSeaDecor();
loadSea();
requestAnimationFrame(animateSea);
setInterval(()=>{state.tickerIndex++;renderWishTicker();},8000);
setInterval(()=>{ if(!document.hidden) loadSea(); },10000);
document.addEventListener('visibilitychange',()=>{ lastFrame=0; if(!document.hidden) loadSea(); });

/* ===== Giant shark: homes in on the visible krathong art, bites exactly at the mouth, then drags it under. ===== */
(function(){
  const actor=$('sharkActor');
  if(!actor || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sea=$('seaBoard');
  const rig=actor.querySelector('.shark-rig'), jaw=actor.querySelector('.shark-jaw');
  const tail=actor.querySelector('.shark-tail-fin');
  const ring=actor.querySelector('.shark-ring'), drops=actor.querySelector('.shark-drops');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  // Use a real SVG mouth landmark after all rotations/translations are applied.
  // Hardcoded offsets are inaccurate whenever the shark breaches or turns.
  const svg=actor.querySelector('.shark-svg');
  const marker=document.createElementNS('http://www.w3.org/2000/svg','circle');
  marker.setAttribute('cx','61');
  marker.setAttribute('cy','124');
  marker.setAttribute('r','1');
  marker.setAttribute('opacity','0');
  marker.setAttribute('pointer-events','none');
  svg.appendChild(marker);
  function alignMouth(mouthX,mouthY){
    const stage=sea.getBoundingClientRect();
    const actual=marker.getBoundingClientRect();
    if(!actual.width && !actual.height) return;
    const dx=stage.left+mouthX-(actual.left+actual.width/2);
    const dy=stage.top+mouthY-(actual.top+actual.height/2);
    actor.style.left=(parseFloat(actor.style.left)+dx)+'px';
    actor.style.top=(parseFloat(actor.style.top)+dy)+'px';
  }
  const APPROACH=2100, BREACH=500, CHOMP=720, DRAG=980, FADE=420, TOTAL=APPROACH+BREACH+CHOMP+DRAG+FADE;
  let busy=false;
  function getTargetPoint(v){
    const seaRect=sea.getBoundingClientRect();
    const art=v.el.querySelector('.krathong-art') || v.el;
    const r=art.getBoundingClientRect();
    return {
      x:r.left-seaRect.left+r.width*.53,
      y:r.top-seaRect.top+r.height*.54
    };
  }
  function splash(count){
    ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
    const sw=parseFloat(actor.style.getPropertyValue('--sw'))||220;
    for(let i=0;i<count;i++){
      const d=document.createElement('i');
      const x=(Math.random()-.55)*sw*.85, up=28+Math.random()*sw*.22;
      d.style.left=(sw*.50)+'px'; d.style.width=d.style.height=(3+Math.random()*6)+'px';
      drops.appendChild(d);
      d.animate([
        {transform:'translate(0,0) scale(1)',opacity:1},
        {transform:`translate(${x*.7}px,${-up*.72}px) scale(1.05)`,opacity:.95,offset:.42},
        {transform:`translate(${x}px,${12+Math.random()*10}px) scale(.7)`,opacity:0}
      ],{duration:700+Math.random()*250,easing:'ease-out'}).onfinish=()=>d.remove();
    }
  }
  function sinkKrathong(v){
    if(v.sinking || !v.el.isConnected) return;
    v.sinking=true;
    v.el.classList.add('krathong-bitten');
    setTimeout(()=>{ if(v.el.isConnected) v.el.classList.add('krathong-sinking'); },160);
    setTimeout(()=>{
      if(!v.el.isConnected) return;
      v.el.classList.remove('krathong-bitten','krathong-sinking');
      v.el.classList.add('krathong-respawning');
      v.sinking=false;
      v.respawnPending=true;
      const margin=135;
      v.x=-margin-(Math.random()*90);
      v.y=sea.clientHeight*(.58+Math.random()*.25);
      v.vx=14+Math.random()*11;
      v.el.style.left=v.x+'px';
      v.el.style.top=v.y+'px';
      setTimeout(()=>{
        if(!v.el.isConnected)return;
        v.respawnPending=false;
        v.el.classList.remove('krathong-respawning');
      },280);
    },1680);
  }
  async function attack(){
    if(busy || document.hidden) return false;
    const W=sea.clientWidth, H=sea.clientHeight;
    const targets=[...drifters.values()].filter(v=>v.el.isConnected && !v.sinking && !v.respawnPending && v.x>W*.18 && v.x<W*.84 && v.y>H*.53 && v.y<H*.88);
    if(!targets.length) return false;
    busy=true;
    const target=targets[Math.floor(Math.random()*targets.length)];
    const base=target.el.querySelector('.krathong-art');
    const size=base?.getBoundingClientRect().width||82;
    const sw=clamp(size*3.05, 210, 365);
    actor.style.setProperty('--sw',sw+'px');
    actor.style.setProperty('--flip','1');
    const waterline=H*.545;
    const initial=getTargetPoint(target);
    const mouthStartX=Math.max(W+sw*.62, initial.x + sw*1.38);
    const mouthStartY=clamp(initial.y + sw*.64, waterline + sw*.48, H*.95);
    let start=null, biteDone=false, burst=false;
    return await new Promise(resolve=>{
      function frame(now){
        if(start===null) start=now;
        const t=now-start;
        if(t>=TOTAL || !target.el.isConnected){
          actor.classList.remove('on','is-biting','is-diving'); actor.style.opacity='0'; jaw.style.transform=''; rig.style.transform='';
          busy=false; resolve(true); return;
        }
        const point=getTargetPoint(target);
        // Never clamp the bite target: clamping makes a shark miss edge krathongs.
        const biteX=point.x+2;
        const biteY=point.y+1;
        const dragX=biteX - sw*.34;
        const dragY=clamp(point.y + sw*.78, waterline + sw*.30, H*.98);
        let mouthX=biteX, mouthY=biteY, bodyDip=.22, rot=0, jawDeg=0, opacity=1;
        const swim=Math.sin(t/235), kick=Math.sin(t/160);
        if(t<APPROACH){
          const z=smooth(t/APPROACH);
          mouthX=mouthStartX + (biteX - mouthStartX)*z;
          mouthY=mouthStartY + (biteY + 12 - mouthStartY)*z;
          bodyDip=.34 + swim*.065;
          rot=-10 + z*18 + swim*2.2;
          opacity=clamp(t/320,0,1);
        }else if(t<APPROACH+BREACH){
          const z=smooth((t-APPROACH)/BREACH);
          mouthX=biteX + Math.sin(z*Math.PI)*4;
          mouthY=(biteY + 8) + (biteY - (biteY + 8))*z;
          bodyDip=.28 - z*.55 + swim*.028;
          rot=10 + z*18 + swim*1.8;
          jawDeg=-12 - z*30;
          if(!burst){ burst=true; splash(18); }
        }else if(t<APPROACH+BREACH+CHOMP){
          const z=(t-APPROACH-BREACH)/CHOMP;
          mouthX=biteX - z*4;
          mouthY=biteY + Math.sin(z*Math.PI)*2;
          bodyDip=-.26 + Math.sin(z*Math.PI*2.8)*.045;
          rot=28 + Math.sin(z*Math.PI*3.1)*3.6 + swim*.7;
          jawDeg=-40 + Math.sin(z*Math.PI*4.2)*15;
          if(z>.18 && !biteDone){ biteDone=true; splash(24); sinkKrathong(target); }
        }else if(t<APPROACH+BREACH+CHOMP+DRAG){
          const z=smooth((t-APPROACH-BREACH-CHOMP)/DRAG);
          mouthX=biteX + (dragX - biteX)*z;
          mouthY=biteY + (dragY - biteY)*z;
          bodyDip=-.2 + z*.72 + swim*.02;
          rot=24 - z*24;
          jawDeg=-7 + z*7;
        }else{
          const z=smooth((t-APPROACH-BREACH-CHOMP-DRAG)/FADE);
          mouthX=dragX - sw*.1*z;
          mouthY=dragY + sw*.14*z;
          bodyDip=.5 + z*.25;
          rot=-3 - z*10;
          opacity=1-z;
        }
        // Establish a rough position, then measure and correct the mouth in screen space.
        // The correction includes the flip wrapper and the current rig rotation.
        actor.style.left=(mouthX-sw*.60)+'px';
        actor.style.top=(mouthY-sw*1.22)+'px';
        actor.style.opacity=opacity;
        actor.classList.add('on');
        actor.classList.toggle('is-biting',t>=APPROACH && t<APPROACH+BREACH+CHOMP);
        actor.classList.toggle('is-diving',t>=APPROACH+BREACH+CHOMP);
        actor.style.setProperty('--swim-kick',kick.toFixed(3));
        rig.style.transform=`translateY(${bodyDip*sw*.55}px) rotate(${rot}deg)`;
        jaw.style.transform=`rotate(${jawDeg}deg)`;
        alignMouth(mouthX,mouthY);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }
  async function loop(){
    await sleep(6500);
    while(true){
      const ok=await attack();
      await sleep(ok ? (9000 + Math.random()*7000) : 2800);
    }
  }
  loop();
})();
