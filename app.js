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
  items:[],recentItems:[],total:0,minute:null,ownItem:null,ownUntil:0,tickerIndex:0,adminToken:localStorage.getItem('phiPhiHrToken')||'',hrPool:[]
};
const $=id=>document.getElementById(id);
const API=(window.APP_CONFIG||{}).API_URL||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePhoto=s=>/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(s||''))?s:'';
const drifters=new Map();
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
  turtle:`<svg viewBox="0 0 150 85" aria-hidden="true"><defs><linearGradient id="turtleShell" x2="0" y2="1"><stop stop-color="#7ed4ad"/><stop offset="1" stop-color="#286f77"/></linearGradient></defs><path d="M28 40 Q4 22 3 40 Q5 57 29 48 M92 35 Q128 9 130 23 Q131 40 101 47 M38 58 Q15 78 29 80 Q45 72 56 61 M94 58 Q119 80 130 73 Q130 61 105 52" fill="#66b6a5" opacity=".85"/><ellipse cx="72" cy="45" rx="46" ry="28" fill="url(#turtleShell)"/><path d="M46 35 L72 21 L97 35 L101 51 L73 66 L44 51 Z M72 21 L73 66 M46 35 L101 51" fill="none" stroke="#b8e2ba" stroke-width="3" opacity=".55"/><circle cx="130" cy="43" r="18" fill="#74c9b1"/><circle cx="138" cy="38" r="3" fill="#102e40"/></svg>`,
  ray:`<svg viewBox="0 0 180 95" aria-hidden="true"><defs><linearGradient id="rayShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#83bcd1"/><stop offset="1" stop-color="#326d8c"/></linearGradient></defs><path d="M15 49 Q41 3 91 34 Q127 3 165 46 Q136 52 121 68 Q102 83 89 72 Q66 83 51 63 Q31 49 15 49" fill="url(#rayShade)" stroke="#b8e5ee" stroke-width="2" opacity=".96"/><path d="M90 71 Q94 83 90 95" fill="none" stroke="#5ea4ba" stroke-width="4"/><circle cx="75" cy="47" r="3" fill="#102d40"/><circle cx="103" cy="47" r="3" fill="#102d40"/></svg>`,
  dolphin:`<svg viewBox="0 0 180 95" aria-hidden="true"><defs><linearGradient id="dolphinSkin" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#91c5da"/><stop offset="1" stop-color="#317193"/></linearGradient></defs><path d="M15 58 Q30 50 36 32 Q34 56 57 50 Q75 13 110 26 L124 12 L127 35 Q144 43 154 52 L176 50 L154 62 Q125 85 90 72 L70 86 L74 66 Q44 70 15 58" fill="url(#dolphinSkin)" stroke="#afdbe7" stroke-width="2"/><path d="M63 62 Q103 76 141 57" stroke="#c8e9ec" stroke-width="4" opacity=".6" fill="none"/><circle cx="141" cy="48" r="3" fill="#092d40"/></svg>`,
  fish:`<svg viewBox="0 0 130 80" aria-hidden="true"><defs><linearGradient id="fishShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffdc8f"/><stop offset="1" stop-color="#e27c63"/></linearGradient></defs><path d="M30 40 L4 14 L5 65 Z" fill="#e99663"/><ellipse cx="76" cy="41" rx="48" ry="29" fill="url(#fishShade)" stroke="#ffe3b1" stroke-width="2"/><path d="M64 13 Q70 35 64 68 M86 14 Q91 40 85 67" fill="none" stroke="#fff1bc" stroke-width="7" opacity=".65"/><circle cx="106" cy="33" r="4" fill="#253545"/></svg>`
};
function initSeaLife(){
  const sea=$('seaBoard');
  if(sea.querySelector('.marine-layer')) return;
  const layer=document.createElement('div');
  layer.className='marine-layer';
  layer.setAttribute('aria-hidden','true');
  const kinds=['turtle','ray','dolphin','fish','fish','ray','turtle'];
  const mobile=window.matchMedia('(max-width:760px)').matches;
  kinds.slice(0,mobile?5:7).forEach((kind,i)=>{
    const animal=document.createElement('span');
    animal.className=`marine-animal marine-${kind}`;
    animal.innerHTML=SEA_LIFE_ART[kind];
    animal.style.top=(53+(i*7.3)%33)+'%';
    animal.style.setProperty('--marine-size',(kind==='dolphin'?80:kind==='turtle'?69:kind==='ray'?79:42)+(Math.random()*12)+'px');
    animal.style.setProperty('--marine-duration',(24+Math.random()*30).toFixed(1)+'s');
    animal.style.setProperty('--marine-delay',(-Math.random()*45).toFixed(1)+'s');
    animal.style.setProperty('--travel',(sea.clientWidth+260)+'px');
    animal.style.setProperty('--depth',(Math.random()*7-3).toFixed(1)+'px');
    layer.appendChild(animal);
  });
  sea.appendChild(layer);
  window.addEventListener('resize',()=>{
    layer.querySelectorAll('.marine-animal').forEach(el=>el.style.setProperty('--travel',(sea.clientWidth+260)+'px'));
  },{passive:true});
}

// Start across the water surface. Each drifter has a stable horizontal direction.
function randomPosition(sea){
  return {x:sea.clientWidth*(.10+Math.random()*.80), y:sea.clientHeight*(.58+Math.random()*.27)};
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
  b.style.setProperty('--glow',/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:'#ffc977');
  b.innerHTML=seaItemHTML(item);
  b.onclick=()=>displayWish(item);
  sea.appendChild(b);
  const pos=randomPosition(sea);
  const direction=1;
  drifters.set(String(item.id),{
    el:b,item,x:pos.x,y:pos.y,
    vx:14+Math.random()*11,vy:0,
    direction,flow:Math.random()*Math.PI*2,turn:0,phase:Math.random()*7
  });
}
function renderSea(){
  $('total').textContent=Number(state.total||state.items.length).toLocaleString('th-TH');
  const sea=$('seaBoard');
  let visible=state.items.slice(0,20);
  if(state.ownItem && Date.now()<state.ownUntil && !visible.some(i=>String(i.id)===String(state.ownItem.id))){
    visible=[state.ownItem,...visible.slice(0,19)];
  }
  const ids=new Set(visible.map(x=>String(x.id)));
  for(const [id,v] of drifters) if(!ids.has(id)){ v.el.remove(); drifters.delete(id); }
  sea.querySelectorAll('.empty').forEach(x=>x.remove());
  if(!state.items.length) sea.insertAdjacentHTML('beforeend','<div class="empty">ยังไม่มีกระทง มาเป็นคนแรกกันเถอะ 🪷</div>');

  visible.forEach(item=>{
    const id=String(item.id);
    if(!drifters.has(id)) addDrifter(item);
    else {
      const old=drifters.get(id);
      const changed=old.item.name!==item.name || old.item.photo!==item.photo || old.item.type!==item.type || old.item.flower!==item.flower || old.item.candle!==item.candle || old.item.color!==item.color;
      old.item=item;
      if(changed){
        old.el.style.setProperty('--glow',/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:'#ffc977');
        old.el.innerHTML=seaItemHTML(item);
        old.el.onclick=()=>displayWish(item);
      }
    }
  });

  renderWishTicker();
}
function animateSea(ts){
  const dt=Math.min(.05,Math.max(0,(ts-lastFrame)/1000||0)); lastFrame=ts;
  const sea=$('seaBoard');
  if(!document.hidden && sea.clientWidth){
    const w=sea.clientWidth,h=sea.clientHeight;
    for(const v of drifters.values()){
      if(v.sinking || v.respawnPending) continue;
      v.phase+=dt;
      v.flow+=dt;
      // All krathongs flow LEFT -> RIGHT; no reversing.
      v.vx=Math.abs(v.vx)||18;
      v.x+=v.vx*dt;
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
    const needRerender=state.minute!==nextMinute || nextItems.map(x=>String(x.id)).join('|')!==state.items.map(x=>String(x.id)).join('|');
    state.items=nextItems;
    state.recentItems=out.recent||nextItems;
    state.total=Number(out.total??nextItems.length);
    state.minute=nextMinute;
    initSeaDecor();
    if(needRerender){renderSea();}else{
      $('total').textContent=state.total.toLocaleString('th-TH');
      // Refresh recent wishes without restarting sea animation.
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

/* ===== Giant shark: approaches underwater, breaches, bites and sinks the selected krathong. ===== */
(function(){
  const actor=$('sharkActor');
  if(!actor || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sea=$('seaBoard');
  const rig=actor.querySelector('.shark-rig'), jaw=actor.querySelector('.shark-jaw');
  const ring=actor.querySelector('.shark-ring'), drops=actor.querySelector('.shark-drops');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const MOVE=2700,RISE=650,CHOMP=1100,SUBMERGE=1200,TOTAL=MOVE+RISE+CHOMP+SUBMERGE;
  let busy=false;
  function splash(count){
    ring.classList.remove('go');void ring.offsetWidth;ring.classList.add('go');
    const sw=parseFloat(actor.style.getPropertyValue('--sw'))||160;
    for(let i=0;i<count;i++){
      const d=document.createElement('i');
      const x=(Math.random()-.5)*sw*.8,up=30+Math.random()*sw*.28;
      d.style.left=(sw*.6)+'px';d.style.width=d.style.height=(3+Math.random()*5)+'px';
      drops.appendChild(d);
      d.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${x}px,${-up}px)`,opacity:.85,offset:.5},{transform:`translate(${x*1.4}px,12px)`,opacity:0}],{duration:700+Math.random()*350,easing:'ease-out'}).onfinish=()=>d.remove();
    }
  }
  function sinkKrathong(v){
    if(v.sinking || !v.el.isConnected) return;
    v.sinking=true;
    v.el.classList.add('krathong-sinking');
    // Visual effect only: do NOT remove the participant or their data from the draw.
    setTimeout(()=>{
      if(!v.el.isConnected)return;
      v.el.classList.remove('krathong-sinking');
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
      },250);
    },1650);
  }
  async function attack(){
    if(busy||document.hidden) return false;
    const W=sea.clientWidth,H=sea.clientHeight;
    const targets=[...drifters.values()].filter(v=>v.el.isConnected&&!v.sinking&&!v.respawnPending&&v.x>W*.20&&v.x<W*.80&&v.y>H*.53&&v.y<H*.88);
    if(!targets.length) return false;
    busy=true;
    const target=targets[Math.floor(Math.random()*targets.length)];
    const base=target.el.querySelector('.krathong-art');
    const size=base?.getBoundingClientRect().width||76;
    const sw=clamp(size*2.4,175,315);  // larger than the krathong, scales across mobile and desktop
    actor.style.setProperty('--sw',sw+'px');
    const face=1;                       // shark travels right, its SVG head faces left
    actor.style.setProperty('--flip','1');
    const waterline=H*.55;
    let start=null,biteDone=false,burst=false;
    const fromX=Math.max(W+sw, target.x+sw*1.7);
    const targetX=target.x+sw*.3;
    const y=clamp(target.y+sw*.05,waterline+sw*.05,H*.90);
    return await new Promise(resolve=>{
      function frame(now){
        if(start===null)start=now;
        const t=now-start;
        if(t>=TOTAL||!target.el.isConnected){
          if(!biteDone&&target.el.isConnected)target.el.classList.remove('krathong-sinking');
          actor.classList.remove('on');actor.style.opacity='0';jaw.style.transform='';rig.style.transform='';
          busy=false;resolve(true);return;
        }
        let cx=targetX,sub=.66,rot=0,jawDeg=0,opacity=1;
        if(t<MOVE){
          const z=smooth(t/MOVE);
          cx=fromX+(targetX-fromX)*z;
          sub=.70+Math.sin(t/170)*.035;
          opacity=clamp(t/400,0,1);
        }else if(t<MOVE+RISE){
          const z=smooth((t-MOVE)/RISE);
          sub=.70-z*.87;rot=z*29;jawDeg=-33*z;
          if(!burst){burst=true;splash(14)}
        }else if(t<MOVE+RISE+CHOMP){
          const z=(t-MOVE-RISE)/CHOMP;
          sub=-.17+Math.sin(z*13)*.024;
          rot=29+Math.sin(z*11)*4;
          jawDeg=-35+Math.sin(z*Math.PI*4)*18;
          if(z>.22&&!biteDone){biteDone=true;splash(20);sinkKrathong(target)}
        }else{
          const z=smooth((t-MOVE-RISE-CHOMP)/SUBMERGE);
          sub=-.17+z*1.20;rot=29+z*15;jawDeg=0;
          cx=targetX+sw*.35*z;opacity=1-clamp((z-.65)/.35,0,1);
        }
        // The actor is an SVG scene, with the mouth close to target's waterline.
        actor.style.left=(cx-sw*.95)+'px';
        actor.style.top=(y-sw*1.5)+'px';
        actor.style.opacity=opacity;
        actor.classList.add('on');
        rig.style.transform=`translateY(${sub*sw*.55}px) rotate(${rot}deg)`;
        jaw.style.transform=`rotate(${jawDeg}deg)`;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }
  async function loop(){
    await sleep(5000);
    while(true){
      const ok=await attack();
      await sleep(ok?11000:2800);
    }
  }
  loop();
})();
