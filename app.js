const TYPES=[
  ['lotus','🪷','ฐานดอกบัว'],['orchid','🌿','ฐานใบตองพับ'],['jasmine','🍀','ฐานใบไม้'],
  ['rose','🧺','ฐานตะกร้า'],['leaf','🌱','ฐานธรรมชาติ'],['gold','🏵️','ฐานสีทอง'],
  ['sea','🐚','ทะเลอันดามัน'],['heart','💖','หัวใจ'],['star','⭐','แสงดาว'],['crown','👑','มงกุฎ']
];
const BASES=TYPES.slice(0,6);
const FLOWERS=[['lotus','🪷','บัวชมพู'],['rose','🌹','กุหลาบ'],['orchid','🌺','กล้วยไม้'],['jasmine','🌼','มะลิ'],['tulip','🌷','ทิวลิป'],['sunflower','🌻','ทานตะวัน']];
const CANDLES=[['classic','🕯️','เทียนเดี่ยว'],['pair','🕯️','เทียนคู่'],['incense','🎋','ธูป 3 ดอก'],['golden','✨','แสงทอง'],['lantern','🏮','โคมไฟ'],['sparkle','🎇','แสงประกาย']];
const state={type:'lotus',flower:'lotus',candle:'classic',color:'#ffc977',photo:'',items:[],total:0,adminToken:localStorage.getItem('phiPhiHrToken')||''};
const $=id=>document.getElementById(id);
const API=(window.APP_CONFIG||{}).API_URL||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePhoto=s=>/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(s||''))?s:'';
function getParts(item){
  return {
    base:TYPES.find(t=>t[0]===item.type)||BASES[0],
    flower:FLOWERS.find(t=>t[0]===item.flower)||FLOWERS.find(t=>t[0]===item.type)||FLOWERS[0],
    candle:CANDLES.find(t=>t[0]===item.candle)||CANDLES[0]
  };
}
function artHTML(item){
  const {base,flower,candle}=getParts(item);
  const candleSymbol=candle[0]==='pair'?'🕯️🕯️':candle[1];
  return `<span class="art-base">${base[1]}</span><span class="art-flower">${flower[1]}</span><span class="art-candle">${candleSymbol}</span>`;
}
function updatePreview(){
  $('previewArt').innerHTML=artHTML(state);
  $('krathongPreview').style.setProperty('--glow',state.color);
  $('photoBadge').hidden=!state.photo;
  if(state.photo)$('photoBadge').style.backgroundImage=`url("${state.photo}")`;
}
function renderChoices(id,values,key){
  $(id).innerHTML=values.map(([k,e,n])=>`<button type="button" class="choice ${k===state[key]?'active':''}" data-value="${k}" aria-pressed="${k===state[key]}"><div class="emoji">${e}</div><b>${n}</b></button>`).join('');
  $(id).addEventListener('click',e=>{
    const b=e.target.closest('[data-value]');if(!b)return;
    state[key]=b.dataset.value;
    $(id).querySelectorAll('.choice').forEach(x=>{const chosen=x===b;x.classList.toggle('active',chosen);x.setAttribute('aria-pressed',String(chosen));});
    updatePreview();
  });
}
function initChoices(){
  renderChoices('choices',BASES,'type');
  renderChoices('flowerChoices',FLOWERS,'flower');
  renderChoices('candleChoices',CANDLES,'candle');
  $('colors').addEventListener('click',e=>{const b=e.target.closest('.color');if(!b)return;state.color=b.dataset.color;document.querySelectorAll('.color').forEach(x=>x.classList.toggle('active',x===b));updatePreview();});
}

function openModal(id){$(id).hidden=false; document.body.classList.add('noscroll');}
function closeModal(id){$(id).hidden=true; if([...document.querySelectorAll('.modal')].every(m=>m.hidden))document.body.classList.remove('noscroll');}
$('openBuilder').onclick=() => openModal('builderModal');
$('openBuilderTop').onclick=() => openModal('builderModal');
$('openHr').onclick=() => openModal('hrModal');
$('openHrTop').onclick=() => openModal('hrModal');
$('closeBuilder').onclick=() => closeModal('builderModal');
$('cancelBuilder').onclick=() => closeModal('builderModal');
$('closeHr').onclick=() => closeModal('hrModal');
$('closeDialog').onclick=() => closeModal('dialog');
$('builderModal').onclick=e=>{ if(e.target===$('builderModal')) closeModal('builderModal'); };
$('hrModal').onclick=e=>{ if(e.target===$('hrModal')) closeModal('hrModal'); };
$('dialog').onclick=e=>{ if(e.target===$('dialog')) closeModal('dialog'); };

$('photo').addEventListener('change',async e=>{
  const f=e.target.files?.[0]; if(!f)return;
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024){alert('รองรับ JPG/PNG/WEBP ไม่เกิน 8MB'); e.target.value=''; return;}
  try{state.photo=await shrink(f); updatePreview();}catch(err){alert('อ่านรูปไม่สำเร็จ');}
});
async function shrink(file){
  const bitmap=await createImageBitmap(file); const max=320,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const c=document.createElement('canvas'); c.width=Math.round(bitmap.width*scale); c.height=Math.round(bitmap.height*scale);
  c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height); bitmap.close();
  return c.toDataURL('image/jpeg',.72);
}

async function request(action,data={},method='POST'){
  if(!API||API.includes('REPLACE-WITH')) throw Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js');
  const url=API.replace(/\/$/,'');
  const resp=await fetch(method==='GET'?url+'?'+new URLSearchParams({action,...data}):url,{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},body:method==='POST'?JSON.stringify({action,...data}):undefined});
  const out=await resp.json();
  if(!resp.ok||!out.ok) throw Error(out.error||'API Error');
  return out;
}

function displayWish(item){
  const photo=safePhoto(item.photo);
  $('dialogBody').innerHTML=`<div class="wish-symbol"><div class="krathong-art">${artHTML(item)}</div></div>${photo?`<img class="wish-face" src="${photo}" alt="รูปผู้ร่วมกิจกรรม">`:''}<h3>${esc(item.name)}</h3><small>${esc(item.department)}</small><p>${esc(item.wish)}</p><small>${new Date(item.createdAt).toLocaleString('th-TH')}</small>`;
  openModal('dialog');
}

const drifters=new Map();
let lastFrame=0;
function randomPosition(sea){return {x:sea.clientWidth*(.08+Math.random()*.84),y:sea.clientHeight*(.52+Math.random()*.39)};}
function addDrifter(item){
  const sea=$('seaBoard');
  const b=document.createElement('button');
  b.type='button';b.className='sea-item';
  b.setAttribute('aria-label','กระทงของ '+item.name);
  b.style.setProperty('--glow',/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:'#ffc977');
  const photo=safePhoto(item.photo);
  b.innerHTML=`<span class="sea-bob"><span class="krathong-art">${artHTML(item)}</span>${photo?`<img src="${photo}" class="tiny-avatar" alt="">`:''}</span>`;
  b.onclick=()=>displayWish(item);
  sea.appendChild(b);
  const pos=randomPosition(sea),angle=Math.random()*Math.PI*2;
  drifters.set(String(item.id),{el:b,item,x:pos.x,y:pos.y,vx:Math.cos(angle)*9,vy:Math.sin(angle)*5,turn:0,phase:Math.random()*7});
}
function renderSea(){
  $('total').textContent=Number(state.total||state.items.length).toLocaleString('th-TH');
  const sea=$('seaBoard'),visible=state.items.slice(0,80), ids=new Set(visible.map(x=>String(x.id)));
  for(const [id,v] of drifters)if(!ids.has(id)){v.el.remove();drifters.delete(id);}
  sea.querySelectorAll('.empty').forEach(x=>x.remove());
  if(!state.items.length)sea.insertAdjacentHTML('beforeend','<div class="empty">ยังไม่มีกระทง มาเป็นคนแรกกันเถอะ 🪷</div>');
  visible.forEach(item=>{const id=String(item.id);if(!drifters.has(id))addDrifter(item);else drifters.get(id).item=item;});
  $('wishCards').innerHTML=state.items.slice(0,12).map((item,i)=>{
    const photo=safePhoto(item.photo);
    return `<button class="wish-card" data-index="${i}" style="text-align:left;color:inherit;cursor:pointer"><div class="wc-head">${photo?`<img class="face" src="${photo}" alt="">`:''}<b>${getParts(item).flower[1]} ${esc(item.name)}</b></div><p>${esc(item.wish)}</p><small>${esc(item.department)} • ${new Date(item.createdAt).toLocaleString('th-TH')}</small></button>`;
  }).join('');
  $('wishCards').querySelectorAll('[data-index]').forEach(b=>b.onclick=()=>displayWish(state.items[+b.dataset.index]));
}
function animateSea(ts){
  const dt=Math.min(.05,Math.max(0,(ts-lastFrame)/1000||0));lastFrame=ts;
  const sea=$('seaBoard');
  if(!document.hidden&&sea.clientWidth){
    const w=sea.clientWidth,h=sea.clientHeight;
    for(const v of drifters.values()){
      v.turn+=dt;v.phase+=dt;
      if(v.turn>2.2+Math.random()*.1){v.turn=0;const a=Math.atan2(v.vy,v.vx)+(Math.random()-.5)*1.25;v.vx=Math.cos(a)*(6+Math.random()*8);v.vy=Math.sin(a)*(3+Math.random()*6);}
      v.x+=v.vx*dt;v.y+=v.vy*dt;
      const minX=Math.min(28,w*.08),maxX=Math.max(minX,w-28),minY=h*.47,maxY=h*.94;
      if(v.x<minX){v.x=minX;v.vx=Math.abs(v.vx);}if(v.x>maxX){v.x=maxX;v.vx=-Math.abs(v.vx);}
      if(v.y<minY){v.y=minY;v.vy=Math.abs(v.vy);}if(v.y>maxY){v.y=maxY;v.vy=-Math.abs(v.vy);}
      v.el.style.left=v.x+'px';v.el.style.top=(v.y+Math.sin(v.phase*2)*2.5)+'px';
    }
  }
  requestAnimationFrame(animateSea);
}
async function loadSea(){
  if(loadSea.busy)return;
  loadSea.busy=true;
  try{
    const out=await request('list',{limit:'100'},'GET');
    state.items=out.items||[];state.total=Number(out.total??state.items.length);
    renderSea();
    $('loadInfo').textContent='อัปเดต '+new Date().toLocaleTimeString('th-TH');
  }catch(e){$('loadInfo').textContent='โหลดไม่สำเร็จ';console.error(e);}
  finally{loadSea.busy=false;}
}
$('refresh').onclick=loadSea;

$('release').onclick=async()=>{
  const name=$('name').value.trim(), employeeId=$('employeeId').value.trim(), department=$('dept').value, wish=$('wish').value.trim();
  if(!name||!department||!wish){$('status').textContent='กรุณากรอกชื่อ แผนก และคำอธิษฐาน'; return;}
  if(!$('consent').checked){$('status').textContent='โปรดยืนยันการยินยอมก่อนส่ง'; return;}
  $('release').disabled=true; $('status').textContent='กำลังปล่อยกระทง...';
  try{
    const out=await request('create',{name,employeeId,department,wish,type:state.type,flower:state.flower,candle:state.candle,color:state.color,photo:state.photo,photoPublic:!!state.photo&&$('photoPublic').checked,consent:true});
    if(out.item){ state.items.unshift(out.item);state.total+=1;renderSea(); }
    $('launch').hidden=false;
    setTimeout(()=>{$('launch').hidden=true;},2300);
    $('status').textContent='กระทงของคุณลอยอยู่ในทะเลแล้ว!';
    setTimeout(()=>{ resetBuilder(); closeModal('builderModal'); },1000);
    localStorage.setItem('phiPhiLastWish',new Date().toISOString());
  }catch(e){ $('status').textContent=e.message; }
  finally{$('release').disabled=false;}
};
function resetBuilder(){
  $('builderForm').reset();
  state.type='lotus';state.flower='lotus';state.candle='classic';state.color='#ffc977';state.photo='';
  [['choices','lotus'],['flowerChoices','lotus'],['candleChoices','classic']].forEach(([id,key])=>$(id).querySelectorAll('.choice').forEach(x=>{const selected=x.dataset.value===key;x.classList.toggle('active',selected);x.setAttribute('aria-pressed',String(selected));}));
  document.querySelectorAll('.color').forEach((x,i)=>x.classList.toggle('active',i===0));
  updatePreview(); $('status').textContent='';
}

async function hrLogin(){
  const pin=$('hrPin').value.trim(); if(!pin){$('hrLoginStatus').textContent='กรุณากรอก PIN'; return;}
  $('hrLoginBtn').disabled=true; $('hrLoginStatus').textContent='กำลังตรวจสอบ...';
  try{
    const out=await request('hr_login',{pin});
    state.adminToken=out.token; localStorage.setItem('phiPhiHrToken',out.token);
    $('hrLoginStatus').textContent='เข้าสู่ระบบสำเร็จ';
    $('hrLoginBox').hidden=true; $('hrPanel').hidden=false;
    await loadAdminList();
  }catch(e){$('hrLoginStatus').textContent=e.message;}
  finally{$('hrLoginBtn').disabled=false;}
}
async function loadAdminList(){
  if(!state.adminToken)return;
  const out=await request('admin_list',{token:state.adminToken});
  $('hrTotal').textContent=out.total.toLocaleString('th-TH');
  $('hrList').innerHTML=(out.items||[]).slice(0,100).map(item=>`<tr><td>${esc(item.name)}</td><td>${esc(item.department)}</td><td>${esc(item.wish)}</td><td>${new Date(item.createdAt).toLocaleString('th-TH')}</td></tr>`).join('') || '<tr><td colspan="4">ยังไม่มีข้อมูล</td></tr>';
}
async function drawWinner(){
  try{
    const out=await request('draw',{token:state.adminToken});
    const w=out.winner;
    const symbol=getParts(w).flower[1];
    $('winnerBox').classList.remove('emptywinner');
    $('winnerBox').innerHTML=`<div class="winner-tag">ผู้โชคดี</div><div class="winner-symbol">${symbol}</div>${w.photo?`<img class="winner-face" src="${w.photo}" alt="">`:''}<h4>${esc(w.name)}</h4><p>${esc(w.department)}</p><small>รหัสพนักงาน: ${esc(w.employeeId||'-')}</small><div class="winner-wish">“${esc(w.wish)}”</div><small>สุ่มจากผู้เข้าร่วมทั้งหมด ${out.poolSize.toLocaleString('th-TH')} คน</small>`;
  }catch(e){ alert(e.message); }
}
function syncHrUi(){
  if(state.adminToken){ $('hrLoginBox').hidden=true; $('hrPanel').hidden=false; loadAdminList().catch(()=>{logoutHr();}); }
  else{ $('hrLoginBox').hidden=false; $('hrPanel').hidden=true; }
}
function logoutHr(){ state.adminToken=''; localStorage.removeItem('phiPhiHrToken'); $('hrPin').value=''; $('hrLoginStatus').textContent=''; syncHrUi(); }

$('hrLoginBtn').onclick=hrLogin;
$('drawBtn').onclick=drawWinner;
$('hrRefresh').onclick=()=>loadAdminList().catch(err=>alert(err.message));
$('hrLogoutBtn').onclick=logoutHr;

initChoices();updatePreview();syncHrUi();loadSea();requestAnimationFrame(animateSea);setInterval(()=>{if(!document.hidden)loadSea();},10000);document.addEventListener('visibilitychange',()=>{lastFrame=0;if(!document.hidden)loadSea();});
