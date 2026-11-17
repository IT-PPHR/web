const TYPES=[
  ['lotus','🌸','ดอกบัวหวาน'],['orchid','🌺','กล้วยไม้'],['jasmine','🌼','มะลิ'],['rose','🌹','กุหลาบ'],['leaf','🍃','ใบตอง'],
  ['gold','🏵️','สีทอง'],['sea','🐚','ทะเลอันดามัน'],['heart','💖','หัวใจ'],['star','⭐','แสงดาว'],['crown','👑','มงกุฎ']
];
const state={type:'lotus',color:'#ffc977',photo:'',items:[],adminToken:localStorage.getItem('phiPhiHrToken')||''};
const $=id=>document.getElementById(id);
const API=(window.APP_CONFIG||{}).API_URL||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function updatePreview(){
  const t=TYPES.find(t=>t[0]===state.type) || TYPES[0];
  $('krathongEmoji').textContent=t[1];
  $('krathongPreview').style.filter=`drop-shadow(0 12px 36px ${state.color})`;
  $('photoBadge').hidden=!state.photo;
  if(state.photo)$('photoBadge').style.backgroundImage=`url("${state.photo}")`;
}
function initChoices(){
  $('choices').innerHTML=TYPES.map(([k,e,n])=>`<button type="button" class="choice ${k===state.type?'active':''}" data-type="${k}"><div class="emoji">${e}</div><b>${n}</b></button>`).join('');
  $('choices').addEventListener('click',e=>{const b=e.target.closest('[data-type]'); if(!b)return; state.type=b.dataset.type; document.querySelectorAll('.choice').forEach(x=>x.classList.toggle('active',x===b)); updatePreview();});
  $('colors').addEventListener('click',e=>{const b=e.target.closest('.color'); if(!b)return; state.color=b.dataset.color; document.querySelectorAll('.color').forEach(x=>x.classList.toggle('active',x===b)); updatePreview();});
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
  const symbol=TYPES.find(t=>t[0]===item.type)?.[1]||'🌸';
  $('dialogBody').innerHTML=`<div class="wish-symbol">${symbol}</div>${item.photo?`<img class="wish-face" src="${item.photo}" alt="รูปผู้ร่วมกิจกรรม">`:''}<h3>${esc(item.name)}</h3><small>${esc(item.department)}</small><p>${esc(item.wish)}</p><small>${new Date(item.createdAt).toLocaleString('th-TH')}</small>`;
  openModal('dialog');
}

function renderSea(){
  $('total').textContent=state.items.length.toLocaleString('th-TH');
  const sea=$('seaBoard');
  sea.querySelectorAll('.sea-item,.empty').forEach(x=>x.remove());
  if(!state.items.length){sea.insertAdjacentHTML('beforeend','<div class="empty">ยังไม่มีกระทง มาเป็นคนแรกกันเถอะ 🪷</div>');}
  state.items.slice(0,56).forEach((item,i)=>{
    const b=document.createElement('button');
    const symbol=TYPES.find(t=>t[0]===item.type)?.[1]||'🌸';
    b.className='sea-item';
    b.style.setProperty('--left',`${6+((i*17)%85)}%`);
    b.style.setProperty('--top',`${48+((i*11)%35)}%`);
    b.style.setProperty('--dur',`${7+(i%6)}s`);
    b.style.setProperty('--delay',`-${i%7}s`);
    b.style.setProperty('--glow',item.color||'#ffc977');
    b.innerHTML=`<span class="k-emoji">${symbol}</span>${item.photo?`<img src="${item.photo}" class="tiny-avatar" alt="">`:''}`;
    b.onclick=()=>displayWish(item);
    sea.appendChild(b);
  });
  $('wishCards').innerHTML=state.items.slice(0,12).map((item,i)=>`<button class="wish-card" data-index="${i}" style="text-align:left;color:inherit;cursor:pointer"><div class="wc-head">${item.photo?`<img class="face" src="${item.photo}" alt="">`:''}<b>${TYPES.find(t=>t[0]===item.type)?.[1]||'🌸'} ${esc(item.name)}</b></div><p>${esc(item.wish)}</p><small>${esc(item.department)} • ${new Date(item.createdAt).toLocaleString('th-TH')}</small></button>`).join('');
  [...$('wishCards').querySelectorAll('[data-index]')].forEach(b=>b.onclick=()=>displayWish(state.items[+b.dataset.index]));
}

async function loadSea(){
  try{
    const out=await request('list',{limit:'80'},'GET');
    state.items=out.items||[];
    renderSea();
    $('loadInfo').textContent='อัปเดต '+new Date().toLocaleTimeString('th-TH');
  }catch(e){
    $('loadInfo').textContent='โหลดไม่สำเร็จ';
    console.error(e);
  }
}
$('refresh').onclick=loadSea;

$('release').onclick=async()=>{
  const name=$('name').value.trim(), employeeId=$('employeeId').value.trim(), department=$('dept').value, wish=$('wish').value.trim();
  if(!name||!department||!wish){$('status').textContent='กรุณากรอกชื่อ แผนก และคำอธิษฐาน'; return;}
  if(!$('consent').checked){$('status').textContent='โปรดยืนยันการยินยอมก่อนส่ง'; return;}
  $('release').disabled=true; $('status').textContent='กำลังปล่อยกระทง...';
  try{
    const out=await request('create',{name,employeeId,department,wish,type:state.type,color:state.color,photo:state.photo,photoPublic:!!state.photo&&$('photoPublic').checked,consent:true});
    if(out.item){ state.items.unshift(out.item); renderSea(); }
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
  state.type='lotus'; state.color='#ffc977'; state.photo='';
  document.querySelectorAll('.choice').forEach(x=>x.classList.toggle('active',x.dataset.type==='lotus'));
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
    const symbol=TYPES.find(t=>t[0]===w.type)?.[1]||'🌸';
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

initChoices(); updatePreview(); syncHrUi(); loadSea(); setInterval(loadSea,25000);
