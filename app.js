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
  items:[],total:0,adminToken:localStorage.getItem('phiPhiHrToken')||'',hrPool:[]
};
const $=id=>document.getElementById(id);
const API=(window.APP_CONFIG||{}).API_URL||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePhoto=s=>/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(s||''))?s:'';
const drifters=new Map();
let lastFrame=0;

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
  window.addEventListener('resize',()=>{
    for(const lantern of sky.querySelectorAll('.v7-lantern'))
      lantern.style.setProperty('--lantern-travel',(sky.clientHeight+75)+'px');
  },{passive:true});
  // The sea remains rendered below the sky; no islands are created.
}
function randomPosition(sea){ return {x:sea.clientWidth*(.08+Math.random()*.84), y:sea.clientHeight*(.54+Math.random()*.34)}; }
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
  const pos=randomPosition(sea),angle=Math.random()*Math.PI*2;
  drifters.set(String(item.id),{el:b,item,x:pos.x,y:pos.y,vx:Math.cos(angle)*9,vy:Math.sin(angle)*5,turn:0,phase:Math.random()*7});
}
function renderSea(){
  $('total').textContent=Number(state.total||state.items.length).toLocaleString('th-TH');
  const sea=$('seaBoard'), visible=state.items.slice(0,80), ids=new Set(visible.map(x=>String(x.id)));
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

  $('wishCards').innerHTML=state.items.slice(0,12).map((item,i)=>{
    const photo=safePhoto(item.photo);
    return `<button class="wish-card" data-index="${i}" style="text-align:left;color:inherit;cursor:pointer"><div class="wc-head">${photo?`<img class="face" src="${photo}" alt="">`:''}<b>${getParts(item).flower[1]} ${esc(item.name)}</b></div><p>${esc(item.wish)}</p><small>${esc(item.department)} • ${new Date(item.createdAt).toLocaleString('th-TH')}</small></button>`;
  }).join('');
  $('wishCards').querySelectorAll('[data-index]').forEach(b=>b.onclick=()=>displayWish(state.items[+b.dataset.index]));
}
function animateSea(ts){
  const dt=Math.min(.05,Math.max(0,(ts-lastFrame)/1000||0)); lastFrame=ts;
  const sea=$('seaBoard');
  if(!document.hidden && sea.clientWidth){
    const w=sea.clientWidth,h=sea.clientHeight;
    for(const v of drifters.values()){
      v.turn+=dt; v.phase+=dt;
      if(v.turn>2.2+Math.random()*.1){
        v.turn=0;
        const a=Math.atan2(v.vy,v.vx)+(Math.random()-.5)*1.25;
        v.vx=Math.cos(a)*(6+Math.random()*8); v.vy=Math.sin(a)*(3+Math.random()*6);
      }
      v.x+=v.vx*dt; v.y+=v.vy*dt;
      const minX=Math.min(40,w*.08), maxX=Math.max(minX,w-40), minY=h*.46, maxY=h*.9;
      if(v.x<minX){ v.x=minX; v.vx=Math.abs(v.vx); }
      if(v.x>maxX){ v.x=maxX; v.vx=-Math.abs(v.vx); }
      if(v.y<minY){ v.y=minY; v.vy=Math.abs(v.vy); }
      if(v.y>maxY){ v.y=maxY; v.vy=-Math.abs(v.vy); }
      v.el.style.left=v.x+'px';
      v.el.style.top=(v.y+Math.sin(v.phase*2)*2.5)+'px';
    }
  }
  requestAnimationFrame(animateSea);
}
async function loadSea(){
  if(loadSea.busy) return;
  loadSea.busy=true;
  try{
    const out=await request('list',{limit:'100'},'GET');
    state.items=out.items||[];
    state.total=Number(out.total ?? state.items.length);
    initSeaDecor();
    renderSea();
  }catch(e){ console.error('Automatic sea refresh failed:',e); }
  finally{ loadSea.busy=false; }
}

$('release').onclick=async()=>{
  const name=$('name').value.trim(), employeeId=$('employeeId').value.trim(), department=$('dept').value, wish=$('wish').value.trim();
  if(state.photoProcessing){ $('status').textContent='กำลังประมวลผลรูป โปรดลองอีกครั้ง'; return; }
  if(!name || !department || !wish){ $('status').textContent='กรุณากรอกชื่อ แผนก และคำอธิษฐาน'; return; }
  if(!$('consent').checked){ $('status').textContent='โปรดยืนยันการยินยอมก่อนส่ง'; return; }
  if(state.photo && !$('photoPublic').checked){ $('status').textContent='โปรดยินยอมให้แสดงรูปบนกระทง หรือกดลบรูปที่เลือก'; return; }
  $('release').disabled=true; $('status').textContent='กำลังปล่อยกระทง...';
  try{
    const out=await request('create',{name,employeeId,department,wish,type:state.type,flower:state.flower,candle:state.candle,color:state.color,photo:state.photo,photoPublic:!!state.photo&&$('photoPublic').checked,consent:true});
    if(out.item){ state.items.unshift(out.item); state.total+=1; renderSea(); }
    $('launch').hidden=false;
    setTimeout(()=>{$('launch').hidden=true;},2300);
    $('status').textContent='กระทงของคุณลอยอยู่ในทะเลแล้ว!';
    setTimeout(()=>{ resetBuilder(); closeModal('builderModal'); },1000);
    localStorage.setItem('phiPhiLastWish',new Date().toISOString());
  }catch(e){ $('status').textContent=e.message; }
  finally{ $('release').disabled=false; }
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
setInterval(()=>{ if(!document.hidden) loadSea(); },10000);
document.addEventListener('visibilitychange',()=>{ lastFrame=0; if(!document.hidden) loadSea(); });
