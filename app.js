const BASES = [
  ['lotus', '🪷', 'ฐานดอกบัว'],
  ['orchid', '🌿', 'ฐานใบตองพับ'],
  ['jasmine', '🍀', 'ฐานใบไม้'],
  ['rose', '🧺', 'ฐานตะกร้า'],
  ['leaf', '🌱', 'ฐานธรรมชาติ'],
  ['gold', '🏵️', 'ฐานสีทอง'],
  ['coconut', '🥥', 'ฐานกะลามะพร้าว'],
  ['turtle_bread', '🐢', 'ฐานขนมปังเต่า'],
  ['ice', '🧊', 'ฐานน้ำแข็ง']
];

const FLOWERS = [
  ['lotus', '🪷', 'บัวชมพู'],
  ['rose', '🌹', 'กุหลาบ'],
  ['orchid', '🌺', 'กล้วยไม้'],
  ['jasmine', '🌼', 'มะลิ'],
  ['tulip', '🌷', 'ทิวลิป'],
  ['sunflower', '🌻', 'ทานตะวัน']
];

const CANDLES = [
  ['classic', '🕯️', 'เทียนเดี่ยว'],
  ['pair', '🕯️🕯️', 'เทียนคู่'],
  ['incense', '🪔', 'ธูป 3 ดอก'],
  ['golden', '✨', 'แสงทอง'],
  ['lantern', '🏮', 'โคมไฟ'],
  ['sparkle', '🎇', 'แสงประกาย'],
  ['lotus_candle', '🪷', 'เทียนดอกบัว'],
  ['tnt', '🧨', 'เทียนระเบิด TNT'],
  ['lightstick', '🪄', 'แท่งไฟคอนเสิร์ต'],
  ['chili', '🌶️', 'เทียนพริกขี้หนู'],
  ['lottery99', '🎰', 'เทียนหวย 99']
];

const DEPARTMENTS = [
  'Engineering',
  'Exe.& Admin',
  'Finance & Acct.',
  'Food & Beverage',
  'Food Kitchen',
  'Front Office',
  'Housekeeping',
  'HR & Security'
];

const LEGACY_BASE_MAP = {
  lotus: 'lotus',
  orchid: 'orchid',
  jasmine: 'jasmine',
  rose: 'rose',
  leaf: 'leaf',
  gold: 'gold',
  banana_leaf: 'orchid',
  banana_trunk: 'leaf',
  coconut: 'rose',
  turtle_bread: 'jasmine',
  ice: 'gold'
};

const LEGACY_CANDLE_MAP = {
  classic: 'classic',
  pair: 'pair',
  incense: 'incense',
  golden: 'golden',
  lantern: 'lantern',
  sparkle: 'sparkle',
  lotus_candle: 'pair',
  tnt: 'sparkle',
  lightstick: 'sparkle',
  chili: 'lantern',
  lottery99: 'golden'
};

const state = {
  type: 'lotus', flower: 'lotus', candle: 'classic', color: '#ffc977', photo: '', photoProcessing: false,
  items: [], recentItems: [], total: 0, minute: null, ownItem: null, ownUntil: 0, tickerIndex: 0, adminToken: localStorage.getItem('phiPhiHrToken') || '', hrPool: [], renderToken: 0
};

const $ = id => document.getElementById(id);
const API = (window.APP_CONFIG || {}).API_URL || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safePhoto = s => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(s || '')) ? s : '';
const drifters = new Map();

let pendingSeaEntries = [];
let nextSeaEntryAt = 0;
const SEA_ENTRY_GAP_MS = 1600;
const SEA_SAMPLE_SIZE = 10;
const SEA_REFRESH_MS = 30000;
const marineLife = [];
let lastFrame = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const bigWave = {
  active: false,
  x: -300,
  speed: 185,
  width: 195,
  nextAt: performance.now() + 10000 + Math.random() * 15000 // สุ่ม 10 - 25 วิ
};

const seaCanvasState = {
  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  foamParticles: [],
  waterRipples: []
};

function initSeaFoam(w, h) {
  seaCanvasState.foamParticles = [];
  for (let i = 0; i < 28; i++) {
    seaCanvasState.foamParticles.push({
      x: Math.random() * w,
      y: (0.16 + Math.random() * 0.78) * h,
      size: 1.0 + Math.random() * 2.2,
      alpha: 0.18 + Math.random() * 0.42,
      speed: 12 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function initWaterRipples(w, h) {
  seaCanvasState.waterRipples = [];
  // จัดระยะห่างระหว่างริ้วคลื่นให้กระจายตัวอย่างเป็นธรรมชาติ ไม่ถี่หรือซ้อนทับกัน
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const rowY = (0.18 + (r / (rows - 0.5)) * 0.7) * h;
    const count = 4 + (r % 2); // 4-5 ริ้วต่อแนวความลึก รวม ~18 ริ้วกำลังพอดี ไม่รก
    for (let c = 0; c < count; c++) {
      seaCanvasState.waterRipples.push({
        x: (c / count) * w + (Math.random() - 0.5) * (w / count * 0.55),
        baseY: rowY + (Math.random() - 0.5) * 16,
        length: 50 + Math.random() * 65,
        amp: 1.6 + Math.random() * 2.0,
        speed: 14 + Math.random() * 16,
        alpha: 0.22 + Math.random() * 0.26,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
}

function initSeaWavesCanvas() {
  const canvas = $('seaWavesCanvas');
  if (!canvas) return;
  const sea = $('seaBoard');
  if (!sea) return;
  const surface = sea.querySelector('.sea-surface');
  if (!surface) return;
  const w = surface.clientWidth || sea.clientWidth;
  const h = surface.clientHeight || Math.floor(sea.clientHeight * 0.58);
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seaCanvasState.canvas = canvas;
  seaCanvasState.ctx = ctx;
  seaCanvasState.w = w;
  seaCanvasState.h = h;
  if (!seaCanvasState.foamParticles.length) initSeaFoam(w, h);
  if (!seaCanvasState.waterRipples.length) initWaterRipples(w, h);
}

function drawRealisticWaves(ctx, w, h, time, dt) {
  ctx.clearRect(0, 0, w, h);

  // 1. Deep Ocean Background Gradient (เฉดสีน้ำทะเลลึกอันดามันยามราตรี ละมุน ไม่แข็ง)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0a2947');    // Deep navy at horizon
  bgGrad.addColorStop(0.35, '#071f37'); // Mid depth
  bgGrad.addColorStop(0.7, '#05182b');  // Deep sea
  bgGrad.addColorStop(1, '#030f1c');    // Bottom abyss
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Moonlight Reflection Path (แสงสะท้อนดวงจันทร์สีทองนวลสาดลงบนผิวน้ำ)
  const moonX = w * 0.82;
  const moonW = Math.max(140, w * 0.28);
  const moonGlow = ctx.createRadialGradient(moonX, 0, 10, moonX, h * 0.75, moonW);
  moonGlow.addColorStop(0, 'rgba(255, 235, 175, 0.16)');
  moonGlow.addColorStop(0.45, 'rgba(100, 210, 255, 0.06)');
  moonGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, w, h);

  // 3. Gentle Ambient Depth Swells (มวลน้ำกระเพื่อมพลิ้วไหวอย่างกลมกลืน ไม่มีเส้นขอบแข็ง)
  const swellTiers = [
    { baseY: h * 0.28, amp: 3.5, freq: 0.005, speed: 1.1, color: 'rgba(14, 62, 102, 0.28)' },
    { baseY: h * 0.58, amp: 5.5, freq: 0.004, speed: 1.5, color: 'rgba(11, 52, 88, 0.22)' },
    { baseY: h * 0.82, amp: 7.5, freq: 0.0035, speed: 1.8, color: 'rgba(8, 40, 72, 0.18)' }
  ];
  for (const s of swellTiers) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 20; x += 20) {
      const y = s.baseY +
        Math.sin(x * s.freq + time * s.speed) * s.amp +
        Math.cos(x * (s.freq * 2) - time * 0.8) * (s.amp * 0.35);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
  }

  // 4. Organic Shimmering Water Ripples (ริ้วระลอกคลื่นน้ำธรรมชาติ กระจายกำลังดี ไม่ถี่หรือลากเส้นตรงยาว)
  for (const rip of seaCanvasState.waterRipples) {
    rip.x += rip.speed * dt;
    if (rip.x > w + 60) rip.x = -rip.length - 20;
    rip.phase += dt * 2.2;
    const curY = rip.baseY + Math.sin(rip.phase) * 2.4;

    const distFromMoon = Math.abs((rip.x + rip.length * 0.5) - moonX);
    const inMoon = distFromMoon < moonW * 0.65;
    const moonBoost = inMoon ? (1 - distFromMoon / (moonW * 0.65)) : 0;
    const alpha = Math.min(0.65, rip.alpha + moonBoost * 0.25);
    const col = inMoon ? '255, 238, 185' : '90, 210, 255';

    const ripGrad = ctx.createLinearGradient(rip.x, curY, rip.x + rip.length, curY);
    ripGrad.addColorStop(0, 'transparent');
    ripGrad.addColorStop(0.25, 'rgba(' + col + ', ' + (alpha * 0.6).toFixed(2) + ')');
    ripGrad.addColorStop(0.5, 'rgba(' + col + ', ' + alpha.toFixed(2) + ')');
    ripGrad.addColorStop(0.75, 'rgba(' + col + ', ' + (alpha * 0.6).toFixed(2) + ')');
    ripGrad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(rip.x, curY);
    ctx.quadraticCurveTo(rip.x + rip.length * 0.5, curY - rip.amp, rip.x + rip.length, curY);
    ctx.strokeStyle = ripGrad;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // ประกายแสงสะท้อนจันทร์บนยอดริ้วคลื่น
    if (inMoon && Math.sin(rip.phase * 2) > 0.4) {
      ctx.fillStyle = 'rgba(255, 248, 220, ' + (moonBoost * 0.55).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(rip.x + rip.length * 0.5, curY - rip.amp * 0.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Drifting Seafoam Particles (ละอองฟองคลื่นลอยอย่างนุ่มนวล)
  for (const f of seaCanvasState.foamParticles) {
    f.x += f.speed * dt;
    if (f.x > w + 20) f.x = -20;
    f.phase += dt * 2.2;
    const wobble = Math.sin(f.phase) * 2.5;
    ctx.fillStyle = 'rgba(200, 240, 255, ' + f.alpha + ')';
    ctx.beginPath();
    ctx.arc(f.x, f.y + wobble, f.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. The Big Wave Roller (คลื่นลูกใหญ่ซัดสาด - สุ่มมาทุก 10-25 วินาที พัดกระทง)
  if (bigWave.active) {
    drawBigOceanRoller(ctx, w, h, bigWave, time);
  }

  // 7. Water Ripple Rings around Krathongs (ระลอกน้ำรอบกระทง)
  const seaTop = h * 0.42;
  for (const d of drifters.values()) {
    if (!d.sinking && !d.respawnPending && d.el.isConnected) {
      const relY = d.y - seaTop;
      if (relY >= 0 && relY <= h) {
        drawKrathongWaterWake(ctx, d.x, relY, d.phase, d.wasSurging);
      }
    }
  }
}

function drawBigOceanRoller(ctx, w, h, wave, time) {
  const waveX = wave.x;
  const slant = 140;

  ctx.save();

  // A. Deep water suction trough ahead of wave (ร่องน้ำลึกสีน้ำเงินเข้ม)
  const troughGrad = ctx.createLinearGradient(waveX - 90, 0, waveX, 0);
  troughGrad.addColorStop(0, 'transparent');
  troughGrad.addColorStop(1, 'rgba(2, 16, 30, 0.75)');
  ctx.fillStyle = troughGrad;
  ctx.beginPath();
  ctx.moveTo(waveX - 90, 0);
  ctx.lineTo(waveX, 0);
  ctx.lineTo(waveX + slant, h);
  ctx.lineTo(waveX + slant - 90, h);
  ctx.closePath();
  ctx.fill();

  // B. Elevated Translucent Cyan Wave Body (มวลน้ำยกตัวสูงสีฟ้าครามใส)
  const bodyGrad = ctx.createLinearGradient(waveX - 35, 0, waveX + 85, 0);
  bodyGrad.addColorStop(0, 'rgba(2, 119, 189, 0.25)');
  bodyGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.6)');
  bodyGrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.88)');
  bodyGrad.addColorStop(1, 'rgba(224, 247, 250, 0.96)');

  ctx.beginPath();
  ctx.moveTo(waveX - 45, 0);
  for (let y = 0; y <= h; y += 10) {
    const prog = y / h;
    const curveOffset = Math.sin(prog * Math.PI) * 36;
    const wx = waveX + prog * slant + curveOffset;
    ctx.lineTo(wx, y);
  }
  ctx.lineTo(waveX + slant - 55, h);
  ctx.lineTo(waveX - 55, 0);
  ctx.closePath();
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // C. Giant Foaming Breaker Crest (สันคลื่นสีขาวหนานุ่มแตกฟองชัดเจนมาก!)
  ctx.beginPath();
  const crestPoints = [];
  for (let y = 0; y <= h; y += 8) {
    const prog = y / h;
    const curveOffset = Math.sin(prog * Math.PI) * 36;
    const foamJitter = Math.sin(y * 0.16 + time * 14) * 4.5;
    const cx = waveX + prog * slant + curveOffset + foamJitter;
    crestPoints.push({ x: cx, y });
    if (y === 0) ctx.moveTo(cx, y);
    else ctx.lineTo(cx, y);
  }

  // Cyan glowing halo
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Bold white breaker crest line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7.5;
  ctx.stroke();

  // D. Exploding Sea Spray Particles along the crest
  for (let i = 0; i < crestPoints.length; i += 2) {
    const p = crestPoints[i];
    for (let s = 0; s < 2; s++) {
      const spX = p.x + (s * 8) + Math.sin(time * 8 + i + s) * 12;
      const spY = p.y + Math.cos(time * 10 + i + s) * 7;
      const r = 1.5 + Math.random() * 2.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(spX, spY, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // E. Trailing Lacy White Seafoam
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2.2;
  for (let k = 0; k < 6; k++) {
    const trailOffset = -25 - k * 18;
    ctx.beginPath();
    for (let y = (k % 3) * 30; y < h; y += 45) {
      const prog = y / h;
      const tx = waveX + prog * slant + trailOffset + Math.sin(y * 0.08 + time * 4) * 8;
      ctx.moveTo(tx, y);
      ctx.arc(tx, y, 6 + (k % 3) * 3, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawKrathongWaterWake(ctx, x, y, phase, isSurging) {
  const rippleR = isSurging ? 28 : 16;
  const alpha = isSurging ? 0.8 : 0.45;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y + 18, rippleR, rippleR * 0.32, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(180, 240, 255, ${alpha})`;
  ctx.lineWidth = isSurging ? 3 : 1.5;
  ctx.stroke();

  if (isSurging) {
    ctx.beginPath();
    ctx.ellipse(x, y + 20, rippleR * 1.5, rippleR * 0.45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}
function getSavedDesign(id) {
  if (!id) return null;
  try {
    const map = JSON.parse(localStorage.getItem('phiPhiSavedDesigns_v1') || '{}');
    return map[String(id)] || null;
  } catch (e) {
    return null;
  }
}

function saveDesign(id, base, candle) {
  if (!id) return;
  try {
    const map = JSON.parse(localStorage.getItem('phiPhiSavedDesigns_v1') || '{}');
    map[String(id)] = { base, candle };
    localStorage.setItem('phiPhiSavedDesigns_v1', JSON.stringify(map));
  } catch (e) { }
}

function getLocalKrathongs() {
  try {
    const raw = localStorage.getItem('phiPhiLocalKrathongs_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return [];
}

function saveLocalKrathong(item) {
  if (!item || !item.id) return;
  try {
    const list = getLocalKrathongs();
    const updated = [item, ...list.filter(x => String(x.id) !== String(item.id))].slice(0, 40);
    localStorage.setItem('phiPhiLocalKrathongs_v1', JSON.stringify(updated));
  } catch (e) { }
}

const SEED_KRATHONGS = [
  {
    id: 'seed_1',
    name: 'พี่เอก วิศวกรรม',
    employeeId: 'ENG-014',
    department: 'Engineering',
    wish: 'ขอให้ระบบไฟฟ้ารีสอร์ตทำงานราบรื่น แขกประทับใจ สุขภาพแข็งแรงตลอดปี',
    type: 'banana_leaf',
    flower: 'lotus',
    candle: 'incense',
    baseDesign: 'banana_leaf',
    candleDesign: 'incense',
    color: '#ffc977',
    photo: '',
    photoPublic: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'seed_2',
    name: 'น้องฝน ต้อนรับ',
    employeeId: 'FO-088',
    department: 'Front Office',
    wish: 'ขอให้เกาะพีพีสวยงาม นักท่องเที่ยวมีความสุข ยอดจองห้องพักเต็มทั้งปี',
    type: 'lotus',
    flower: 'rose',
    candle: 'lotus_candle',
    baseDesign: 'lotus',
    candleDesign: 'lotus_candle',
    color: '#ffb3ba',
    photo: '',
    photoPublic: false,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'seed_3',
    name: 'เชฟกร ครัวไทย',
    employeeId: 'FK-021',
    department: 'Food Kitchen',
    wish: 'ขอให้อาหารทุกจานที่เสิร์ฟสร้างรอยยิ้ม ขอให้ทีมงานทุกคนมีความสุข',
    type: 'turtle_bread',
    flower: 'orchid',
    candle: 'tnt',
    baseDesign: 'turtle_bread',
    candleDesign: 'tnt',
    color: '#ffdfba',
    photo: '',
    photoPublic: false,
    createdAt: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 'seed_4',
    name: 'คุณแอน การเงิน',
    employeeId: 'FA-005',
    department: 'Finance & Acct.',
    wish: 'ขอให้งบดุลลงตัวทุกสิ้นเดือน ขอให้ทุกคนในครอบครัวมีสุขภาพแข็งแรง ร่ำรวยโชคดี',
    type: 'ice',
    flower: 'jasmine',
    candle: 'lottery99',
    baseDesign: 'ice',
    candleDesign: 'lottery99',
    color: '#bae1ff',
    photo: '',
    photoPublic: false,
    createdAt: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: 'seed_5',
    name: 'พี่นพ แม่บ้าน',
    employeeId: 'HK-032',
    department: 'Housekeeping',
    wish: 'ขอให้ห้องพักสะอาดสดชื่นทุกวัน พี่น้องทุกคนในรีสอร์ตมีความสุขร่วมกัน',
    type: 'coconut',
    flower: 'sunflower',
    candle: 'lightstick',
    baseDesign: 'coconut',
    candleDesign: 'lightstick',
    color: '#ffffba',
    photo: '',
    photoPublic: false,
    createdAt: new Date(Date.now() - 18000000).toISOString()
  },
  {
    id: 'seed_6',
    name: 'ผู้จัดการบาร์',
    employeeId: 'FB-019',
    department: 'Food & Beverage',
    wish: 'ขอให้ค่ำคืนนี้มีแต่เสียงหัวเราะ เครื่องดื่มอร่อย บรรยากาศริมหาดอบอุ่น',
    type: 'banana_trunk',
    flower: 'tulip',
    candle: 'chili',
    baseDesign: 'banana_trunk',
    candleDesign: 'chili',
    color: '#baffc9',
    photo: '',
    photoPublic: false,
    createdAt: new Date(Date.now() - 21600000).toISOString()
  }
];

function resolveBaseKey(key) {
  if (!key) return 'lotus';
  if (key === 'banana_leaf') return 'orchid';
  if (key === 'banana_trunk') return 'leaf';
  return key;
}

function resolveCandleKey(key) {
  if (!key) return 'classic';
  if (key === 'lotto99') return 'lottery99';
  return key;
}

function getParts(item) {
  const local = item && item.id ? getSavedDesign(item.id) : null;
  const rawBase = item ? (item.baseDesign || item.customType || local?.base || item.type) : 'banana_leaf';
  const rawCandle = item ? (item.candleDesign || item.customCandle || local?.candle || item.candle) : 'incense';
  const baseKey = resolveBaseKey(rawBase);
  const candleKey = resolveCandleKey(rawCandle);
  const flowerKey = item && item.flower ? item.flower : 'lotus';

  return {
    base: BASES.find(t => t[0] === baseKey) || BASES[0],
    flower: FLOWERS.find(t => t[0] === flowerKey) || FLOWERS[0],
    candle: CANDLES.find(t => t[0] === candleKey) || CANDLES[0]
  };
}

/* ==========================================================================
   1. Realistic Layered SVG Krathong Generator (<svg viewBox="0 0 200 165">)
   Strict 5-Layer Stacking:
     Layer 1 (Back Base): Underwater reflection & back petals/rim of base
     Layer 2 (Flowers & Inner Filling): Bed of marigolds & decorative flowers
     Layer 3 (Candles / Deco): Candles planted in base with animated flame
     Layer 4 (Photo Avatar Stick): Wooden stick with circular photo clipped in SVG
     Layer 5 (Front Base): Front petals/rim overlapping candle, flower & stick stems
   ========================================================================== */
function renderKrathongSVG(item, uid) {
  uid = uid || 'k' + Math.random().toString(36).substr(2, 7);
  const baseKey = resolveBaseKey(item.type || 'banana_leaf');
  const candleKey = resolveCandleKey(item.candle || 'incense');
  const flowerKey = item.flower || 'lotus';
  const glowColor = item.color || '#ffc977';
  const photo = safePhoto(item.photo);
  const hasPhoto = !!photo;
  const clipId = `kp_photo_${uid}`;
  const candleOffset = hasPhoto ? 'transform="translate(28, 6)"' : '';

  const defs = `
    <defs>
      <!-- Base Gradients -->
      <linearGradient id="g_leaf_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4caf50"/><stop offset="60%" stop-color="#2e7d32"/><stop offset="100%" stop-color="#1b5e20"/>
      </linearGradient>
      <linearGradient id="g_leaf_back_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#388e3c"/><stop offset="100%" stop-color="#144617"/>
      </linearGradient>
      <linearGradient id="g_leaf_light_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#81c784"/><stop offset="100%" stop-color="#388e3c"/>
      </linearGradient>

      <linearGradient id="g_trunk_top_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#dcedc8"/><stop offset="50%" stop-color="#c5e1a5"/><stop offset="100%" stop-color="#9ccc65"/>
      </linearGradient>
      <linearGradient id="g_trunk_bark_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#689f38"/><stop offset="60%" stop-color="#558b2f"/><stop offset="100%" stop-color="#33691e"/>
      </linearGradient>

      <linearGradient id="g_lotus_petals_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f48fb1"/><stop offset="45%" stop-color="#ec407a"/><stop offset="100%" stop-color="#ad1457"/>
      </linearGradient>
      <linearGradient id="g_lotus_inner_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fce4ec"/><stop offset="60%" stop-color="#f06292"/><stop offset="100%" stop-color="#c2185b"/>
      </linearGradient>

      <linearGradient id="g_coconut_out_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6d4c41"/><stop offset="50%" stop-color="#4e342e"/><stop offset="100%" stop-color="#27160c"/>
      </linearGradient>
      <linearGradient id="g_coconut_in_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3e2723"/><stop offset="100%" stop-color="#1b0000"/>
      </linearGradient>

      <linearGradient id="g_bread_${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffe082"/><stop offset="40%" stop-color="#ffb74d"/><stop offset="85%" stop-color="#f57c00"/><stop offset="100%" stop-color="#8d6e63"/>
      </linearGradient>

      <linearGradient id="g_ice_${uid}" x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#b2ebf2"/><stop offset="70%" stop-color="#4dd0e1"/><stop offset="100%" stop-color="#0097a7"/>
      </linearGradient>

      <!-- Candle & Flame Gradients -->
      <linearGradient id="g_flame_core_${uid}" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#ff3d00"/><stop offset="40%" stop-color="#ff9100"/><stop offset="80%" stop-color="#ffee58"/><stop offset="100%" stop-color="#ffffff"/>
      </linearGradient>
      <linearGradient id="g_wax_${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#fff59d"/><stop offset="40%" stop-color="#ffee58"/><stop offset="100%" stop-color="#fbc02d"/>
      </linearGradient>
      <linearGradient id="g_tnt_${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#e53935"/><stop offset="50%" stop-color="#d32f2f"/><stop offset="100%" stop-color="#b71c1c"/>
      </linearGradient>
      <linearGradient id="g_chili_${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#ff5252"/><stop offset="40%" stop-color="#d50000"/><stop offset="100%" stop-color="#9b0000"/>
      </linearGradient>
      <linearGradient id="g_gold_rim_${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff9c4"/><stop offset="40%" stop-color="#ffd700"/><stop offset="80%" stop-color="#ffa000"/><stop offset="100%" stop-color="#ffd54f"/>
      </linearGradient>

      <radialGradient id="g_glow_flame_${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff59d" stop-opacity="0.9"/>
        <stop offset="40%" stop-color="#ffa726" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#ff6d00" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g_water_glow_${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${glowColor}" stop-opacity="0.6"/>
        <stop offset="60%" stop-color="${glowColor}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${glowColor}" stop-opacity="0"/>
      </radialGradient>

      ${hasPhoto ? `<clipPath id="${clipId}"><circle cx="64" cy="48" r="32"/></clipPath>` : ''}
    </defs>
  `;

  // Water contact reflection & caustics (Back of all - hugs bottom of hull)
  const waterReflection = `
    <!-- Underwater occlusion & contact shadow directly kissing the hull -->
    <ellipse cx="100" cy="138" rx="74" ry="7" fill="rgba(1, 14, 28, 0.9)" filter="blur(1px)"/>
    <ellipse cx="100" cy="139" rx="60" ry="4.5" fill="#010912"/>
    <!-- Candle reflection on water surface -->
    <ellipse cx="100" cy="139" rx="66" ry="7.5" fill="url(#g_water_glow_${uid})" opacity="0.85"/>
    <!-- Water ripples hugging the hull base -->
    <ellipse class="water-ripple-1" cx="100" cy="137" rx="78" ry="8" fill="none" stroke="rgba(180, 235, 255, 0.45)" stroke-width="1.4"/>
    <ellipse class="water-ripple-2" cx="100" cy="138.5" rx="88" ry="9.5" fill="none" stroke="rgba(130, 215, 255, 0.28)" stroke-width="1.1"/>
    <ellipse class="water-ripple-3" cx="100" cy="140" rx="98" ry="11" fill="none" stroke="rgba(90, 195, 255, 0.16)" stroke-width="0.9"/>
  `;

  // Layer 1: Base Back
  function getBaseBack(type) {
    switch (type) {
      case 'lotus':
        return `
          <g class="base-back">
            <path d="M 28,126 C 20,86 46,65 65,95 C 44,106 32,120 28,126 Z" fill="url(#g_lotus_petals_${uid})"/>
            <path d="M 172,126 C 180,86 154,65 135,95 C 156,106 168,120 172,126 Z" fill="url(#g_lotus_petals_${uid})"/>
            <path d="M 52,126 C 42,75 80,55 92,90 C 72,98 56,116 52,126 Z" fill="url(#g_lotus_petals_${uid})"/>
            <path d="M 148,126 C 158,75 120,55 108,90 C 128,98 144,116 148,126 Z" fill="url(#g_lotus_petals_${uid})"/>
            <path d="M 80,126 C 85,68 115,68 120,126 Z" fill="url(#g_lotus_petals_${uid})"/>
            <ellipse cx="100" cy="120" rx="66" ry="16" fill="#880e4f" opacity="0.6"/>
          </g>
        `;
      case 'jasmine':
        return `
          <g class="base-back">
            <path d="M 24,124 C 15,85 45,70 65,96 C 42,106 30,118 24,124 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 176,124 C 185,85 155,70 135,96 C 158,106 170,118 176,124 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 50,124 C 40,78 78,58 92,92 C 72,100 56,116 50,124 Z" fill="url(#g_leaf_${uid})"/>
            <path d="M 150,124 C 160,78 122,58 108,92 C 128,100 144,116 150,124 Z" fill="url(#g_leaf_${uid})"/>
            <path d="M 80,124 C 85,65 115,65 120,124 Z" fill="url(#g_leaf_light_${uid})"/>
            <ellipse cx="100" cy="120" rx="66" ry="16" fill="#1b5e20" opacity="0.6"/>
          </g>
        `;
      case 'rose':
        return `
          <g class="base-back">
            <ellipse cx="100" cy="118" rx="67" ry="18" fill="#3e2723"/>
            <ellipse cx="100" cy="119" rx="60" ry="14" fill="#1b0000"/>
            <line x1="45" y1="112" x2="155" y2="124" stroke="#5d4037" stroke-width="1.8" opacity="0.3"/>
            <line x1="155" y1="112" x2="45" y2="124" stroke="#5d4037" stroke-width="1.8" opacity="0.3"/>
          </g>
        `;
      case 'gold':
        return `
          <g class="base-back">
            <path d="M 28,126 C 20,86 46,65 65,95 C 44,106 32,120 28,126 Z" fill="#ffa000"/>
            <path d="M 172,126 C 180,86 154,65 135,95 C 156,106 168,120 172,126 Z" fill="#ffa000"/>
            <path d="M 52,126 C 42,75 80,55 92,90 C 72,98 56,116 52,126 Z" fill="#ffd54f"/>
            <path d="M 148,126 C 158,75 120,55 108,90 C 128,98 144,116 148,126 Z" fill="#ffd54f"/>
            <path d="M 80,126 C 85,68 115,68 120,126 Z" fill="#fff59d"/>
            <ellipse cx="100" cy="120" rx="66" ry="16" fill="#ff6f00" opacity="0.5"/>
          </g>
        `;
      case 'leaf':
      case 'banana_trunk':
        return `
          <g class="base-back">
            <ellipse cx="100" cy="118" rx="68" ry="18" fill="url(#g_trunk_top_${uid})"/>
            <ellipse cx="100" cy="118" rx="46" ry="12" fill="#c5e1a5" opacity="0.75"/>
            <ellipse cx="100" cy="118" rx="24" ry="6" fill="#aed581" opacity="0.8"/>
            <path d="M 98,110 Q 102,96 108,98 Q 102,106 98,110 Z" fill="#4caf50"/>
          </g>
        `;
      case 'coconut':
        return `
          <g class="base-back">
            <ellipse cx="100" cy="118" rx="67" ry="18" fill="url(#g_coconut_in_${uid})"/>
            <ellipse cx="100" cy="119" rx="60" ry="14" fill="#150802"/>
            <path d="M 44,114 C 38,104 48,94 56,102 Z" fill="#ab47bc"/>
            <path d="M 156,114 C 162,104 152,94 144,102 Z" fill="#ab47bc"/>
          </g>
        `;
      case 'turtle_bread':
        return `
          <g class="base-back">
            <path d="M 32,134 C 16,138 20,148 34,146 C 46,144 50,136 46,132 Z" fill="#e65100"/>
            <path d="M 168,134 C 184,138 180,148 166,146 C 154,144 150,136 154,132 Z" fill="#e65100"/>
            <path d="M 96,144 Q 100,156 104,144 Z" fill="#c43e00"/>
            <ellipse cx="100" cy="118" rx="66" ry="16" fill="#b26a00"/>
          </g>
        `;
      case 'ice':
        return `
          <g class="base-back">
            <polygon points="40,126 32,96 50,78 58,126" fill="url(#g_ice_${uid})" opacity="0.75"/>
            <polygon points="56,126 52,84 72,64 80,126" fill="url(#g_ice_${uid})" opacity="0.85"/>
            <polygon points="78,126 84,72 100,54 116,72 122,126" fill="url(#g_ice_${uid})"/>
            <polygon points="120,126 128,84 148,64 144,126" fill="url(#g_ice_${uid})" opacity="0.85"/>
            <polygon points="142,126 150,78 168,96 160,126" fill="url(#g_ice_${uid})" opacity="0.75"/>
            <ellipse cx="100" cy="120" rx="65" ry="15" fill="#006064" opacity="0.5"/>
          </g>
        `;
      case 'orchid':
      case 'banana_leaf':
      default:
        return `
          <g class="base-back">
            <path d="M 32,124 L 20,96 L 46,120 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 44,124 L 38,82 L 60,118 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 60,124 L 58,70 L 78,118 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 78,124 L 80,60 L 96,118 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 94,124 L 100,54 L 106,124 Z" fill="url(#g_leaf_light_${uid})"/>
            <path d="M 122,124 L 120,60 L 104,118 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 140,124 L 142,70 L 122,118 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 156,124 L 162,82 L 140,118 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 168,124 L 180,96 L 154,120 Z" fill="url(#g_leaf_back_${uid})"/>
            <ellipse cx="100" cy="120" rx="66" ry="16" fill="#1b5e20" opacity="0.6"/>
          </g>
        `;
    }
  }

  // Layer 2: Flowers & Inner Filling
  function getFlowerBed(flower) {
    const marigolds = `
      <g class="marigold-bed">
        <g transform="translate(62, 118)"><circle cx="0" cy="0" r="9" fill="#ff8f00"/><circle cx="0" cy="0" r="7.5" fill="#ffa000"/><circle cx="0" cy="0" r="5" fill="#ffd54f"/><circle cx="0" cy="0" r="2.5" fill="#fff9c4"/></g>
        <g transform="translate(80, 121)"><circle cx="0" cy="0" r="10.5" fill="#ff6f00"/><circle cx="0" cy="0" r="8.5" fill="#ffb300"/><circle cx="0" cy="0" r="6" fill="#ffea00"/><circle cx="0" cy="0" r="3" fill="#fffde7"/></g>
        <g transform="translate(100, 123)"><circle cx="0" cy="0" r="11" fill="#e65100"/><circle cx="0" cy="0" r="9" fill="#ff9800"/><circle cx="0" cy="0" r="6.5" fill="#ffd600"/><circle cx="0" cy="0" r="3" fill="#fffde7"/></g>
        <g transform="translate(120, 121)"><circle cx="0" cy="0" r="10.5" fill="#ff6f00"/><circle cx="0" cy="0" r="8.5" fill="#ffb300"/><circle cx="0" cy="0" r="6" fill="#ffea00"/><circle cx="0" cy="0" r="3" fill="#fffde7"/></g>
        <g transform="translate(138, 118)"><circle cx="0" cy="0" r="9" fill="#ff8f00"/><circle cx="0" cy="0" r="7.5" fill="#ffa000"/><circle cx="0" cy="0" r="5" fill="#ffd54f"/><circle cx="0" cy="0" r="2.5" fill="#fff9c4"/></g>
      </g>
    `;

    let accent = '';
    switch (flower) {
      case 'rose':
        accent = `
          <g transform="translate(74, 108) scale(0.7)"><circle cx="0" cy="0" r="11" fill="#b71c1c"/><circle cx="0" cy="0" r="8" fill="#d32f2f"/><circle cx="0" cy="0" r="5" fill="#f44336"/><circle cx="0" cy="0" r="2" fill="#ffcdd2"/></g>
          <g transform="translate(126, 108) scale(0.7)"><circle cx="0" cy="0" r="11" fill="#b71c1c"/><circle cx="0" cy="0" r="8" fill="#d32f2f"/><circle cx="0" cy="0" r="5" fill="#f44336"/><circle cx="0" cy="0" r="2" fill="#ffcdd2"/></g>
        `;
        break;
      case 'orchid':
        accent = `
          <g transform="translate(74, 106) scale(0.65)"><path d="M 0,0 C -12,-8 -10,-18 0,-14 C 10,-18 12,-8 0,0 Z" fill="#ba68c8"/><circle cx="-8" cy="2" r="6" fill="#ab47bc"/><circle cx="8" cy="2" r="6" fill="#ab47bc"/><circle cx="0" cy="3" r="4" fill="#f3e5f5"/><circle cx="0" cy="0" r="2.5" fill="#ffd600"/></g>
          <g transform="translate(126, 106) scale(0.65)"><path d="M 0,0 C -12,-8 -10,-18 0,-14 C 10,-18 12,-8 0,0 Z" fill="#ba68c8"/><circle cx="-8" cy="2" r="6" fill="#ab47bc"/><circle cx="8" cy="2" r="6" fill="#ab47bc"/><circle cx="0" cy="3" r="4" fill="#f3e5f5"/><circle cx="0" cy="0" r="2.5" fill="#ffd600"/></g>
        `;
        break;
      case 'jasmine':
        accent = `
          <g transform="translate(74, 109) scale(0.6)"><circle cx="0" cy="0" r="8" fill="#ffffff"/><circle cx="0" cy="0" r="3" fill="#fff59d"/><circle cx="0" cy="0" r="1.5" fill="#fbc02d"/></g>
          <g transform="translate(88, 106) scale(0.55)"><circle cx="0" cy="0" r="8" fill="#ffffff"/><circle cx="0" cy="0" r="3" fill="#fff59d"/></g>
          <g transform="translate(112, 106) scale(0.55)"><circle cx="0" cy="0" r="8" fill="#ffffff"/><circle cx="0" cy="0" r="3" fill="#fff59d"/></g>
          <g transform="translate(126, 109) scale(0.6)"><circle cx="0" cy="0" r="8" fill="#ffffff"/><circle cx="0" cy="0" r="3" fill="#fff59d"/><circle cx="0" cy="0" r="1.5" fill="#fbc02d"/></g>
        `;
        break;
      case 'tulip':
        accent = `
          <g transform="translate(76, 108) scale(0.65)"><path d="M 0,6 C -10,0 -8,-16 0,-12 C 8,-16 10,0 0,6 Z" fill="#ff5722"/><path d="M 0,5 C -5,0 -4,-12 0,-9 C 4,-12 5,0 0,5 Z" fill="#ff9800"/></g>
          <g transform="translate(124, 108) scale(0.65)"><path d="M 0,6 C -10,0 -8,-16 0,-12 C 8,-16 10,0 0,6 Z" fill="#ff5722"/><path d="M 0,5 C -5,0 -4,-12 0,-9 C 4,-12 5,0 0,5 Z" fill="#ff9800"/></g>
        `;
        break;
      case 'sunflower':
        accent = `
          <g transform="translate(74, 108) scale(0.6)"><circle cx="0" cy="0" r="12" fill="#ffd600"/><circle cx="0" cy="0" r="6" fill="#5d4037"/><circle cx="0" cy="0" r="4.5" fill="#3e2723"/></g>
          <g transform="translate(126, 108) scale(0.6)"><circle cx="0" cy="0" r="12" fill="#ffd600"/><circle cx="0" cy="0" r="6" fill="#5d4037"/><circle cx="0" cy="0" r="4.5" fill="#3e2723"/></g>
        `;
        break;
      case 'lotus':
      default:
        accent = `
          <g transform="translate(75, 108) scale(0.65)"><path d="M 0,8 C -10,0 -8,-18 0,-14 C 8,-18 10,0 0,8 Z" fill="#f48fb1"/><path d="M 0,7 C -5,0 -4,-13 0,-10 C 4,-13 5,0 0,7 Z" fill="#ec407a"/></g>
          <g transform="translate(125, 108) scale(0.65)"><path d="M 0,8 C -10,0 -8,-18 0,-14 C 8,-18 10,0 0,8 Z" fill="#f48fb1"/><path d="M 0,7 C -5,0 -4,-13 0,-10 C 4,-13 5,0 0,7 Z" fill="#ec407a"/></g>
        `;
        break;
    }
    return `<g class="flower-bed">${accent}${marigolds}</g>`;
  }

  // Layer 3: Candles / Deco (Outer <g> fixes coordinates; Inner <g class="flame-anim"> flickers at origin)
  function getCandle(candle) {
    switch (candle) {
      case 'pair':
        return `
          <g class="candle-group" ${candleOffset}>
            <rect x="88" y="74" width="7" height="42" rx="2" fill="url(#g_wax_${uid})"/>
            <line x1="91.5" y1="74" x2="91.5" y2="66" stroke="#37474f" stroke-width="1.8"/>
            <g transform="translate(91.5, 66)">
              <g class="flame-anim">
                <circle cx="0" cy="-9" r="14" fill="url(#g_glow_flame_${uid})"/>
                <path d="M 0,0 C -5,-5 -5,-14 0,-20 C 5,-14 5,-5 0,0 Z" fill="url(#g_flame_core_${uid})"/>
                <path d="M 0,-2 C -2.5,-5 -2.5,-10 0,-15 C 2.5,-10 2.5,-5 0,-2 Z" fill="#ffffff"/>
              </g>
            </g>
            <rect x="105" y="74" width="7" height="42" rx="2" fill="url(#g_wax_${uid})"/>
            <line x1="108.5" y1="74" x2="108.5" y2="66" stroke="#37474f" stroke-width="1.8"/>
            <g transform="translate(108.5, 66)">
              <g class="flame-anim">
                <circle cx="0" cy="-9" r="14" fill="url(#g_glow_flame_${uid})"/>
                <path d="M 0,0 C -5,-5 -5,-14 0,-20 C 5,-14 5,-5 0,0 Z" fill="url(#g_flame_core_${uid})"/>
                <path d="M 0,-2 C -2.5,-5 -2.5,-10 0,-15 C 2.5,-10 2.5,-5 0,-2 Z" fill="#ffffff"/>
              </g>
            </g>
          </g>
        `;
      case 'golden':
        return `
          <g class="candle-group" ${candleOffset}>
            <circle cx="100" cy="72" r="28" fill="#ffd700" opacity="0.18"/>
            <circle cx="100" cy="72" r="18" fill="#ffe082" opacity="0.35"/>
            <g transform="translate(100, 72)">
              <g class="flame-anim">
                <polygon points="0,-22 4,-6 20,0 4,6 0,22 -4,6 -20,0 -4,-6" fill="#fff9c4"/>
                <polygon points="0,-14 3,-4 13,0 3,4 0,14 -3,4 -13,0 -3,-4" fill="#ffffff"/>
                <circle cx="0" cy="0" r="5" fill="#ffffff"/>
                <circle cx="-14" cy="-12" r="2.5" fill="#ffe082"/>
                <circle cx="15" cy="-10" r="3" fill="#ffd54f"/>
                <circle cx="-12" cy="14" r="2" fill="#ffca28"/>
                <circle cx="14" cy="12" r="2.5" fill="#ffe082"/>
                <circle cx="0" cy="-28" r="1.5" fill="#ffffff"/>
              </g>
            </g>
          </g>
        `;
      case 'lantern':
        return `
          <g class="candle-group" ${candleOffset}>
            <line x1="100" y1="46" x2="100" y2="60" stroke="#ffd54f" stroke-width="2"/>
            <rect x="86" y="60" width="28" height="38" rx="6" fill="#d32f2f"/>
            <ellipse cx="100" cy="79" rx="8" ry="14" fill="#ffee58" opacity="0.85"/>
            <line x1="86" y1="70" x2="114" y2="70" stroke="#ffd54f" stroke-width="1.5"/>
            <line x1="86" y1="88" x2="114" y2="88" stroke="#ffd54f" stroke-width="1.5"/>
            <line x1="100" y1="98" x2="100" y2="114" stroke="#ffd54f" stroke-width="2.5"/>
            <circle cx="100" cy="114" r="3" fill="#ff8f00"/>
            <g transform="translate(100, 78)">
              <g class="flame-anim">
                <circle cx="0" cy="0" r="12" fill="url(#g_glow_flame_${uid})"/>
                <path d="M 0,0 C -4,-4 -4,-10 0,-15 C 4,-10 4,-4 0,0 Z" fill="#ffeb3b"/>
              </g>
            </g>
          </g>
        `;
      case 'sparkle':
        return `
          <g class="candle-group" ${candleOffset}>
            <line x1="100" y1="116" x2="100" y2="66" stroke="#b0bec5" stroke-width="2.5"/>
            <g transform="translate(100, 66)">
              <g class="flame-anim">
                <circle cx="0" cy="0" r="18" fill="url(#g_glow_flame_${uid})"/>
                <polygon points="0,-16 4,-4 16,0 4,4 0,16 -4,4 -16,0 -4,-4" fill="#ffee58"/>
                <circle cx="0" cy="0" r="5" fill="#ffffff"/>
                <circle cx="-10" cy="-10" r="2" fill="#ff9800"/>
                <circle cx="10" cy="-8" r="1.8" fill="#ffeb3b"/>
                <circle cx="-8" cy="10" r="1.5" fill="#ff9800"/>
                <circle cx="10" cy="10" r="2" fill="#ffeb3b"/>
              </g>
            </g>
          </g>
        `;
      case 'lotus_candle':
        return `
          <g class="candle-group" ${candleOffset}>
            <path d="M 96,118 L 96,104 L 104,104 L 104,118 Z" fill="#ad1457"/>
            <path d="M 82,104 C 78,92 88,80 100,82 C 112,80 122,92 118,104 Z" fill="#f06292"/>
            <path d="M 86,104 C 84,90 94,80 100,81 C 106,80 116,90 114,104 Z" fill="#f8bbd0"/>
            <ellipse cx="100" cy="82" rx="7" ry="3.5" fill="#ffd54f"/>
            <circle cx="100" cy="82" r="2" fill="#ff8f00"/>
            <line x1="100" y1="82" x2="100" y2="74" stroke="#37474f" stroke-width="2" stroke-linecap="round"/>
            <g transform="translate(100, 74)">
              <g class="flame-anim">
                <circle cx="0" cy="-10" r="16" fill="url(#g_glow_flame_${uid})"/>
                <path d="M 0,0 C -6,-6 -6,-16 0,-24 C 6,-16 6,-6 0,0 Z" fill="url(#g_flame_core_${uid})"/>
                <path d="M 0,-2 C -3,-6 -3,-12 0,-18 C 3,-12 3,-6 0,-2 Z" fill="#ffffff"/>
              </g>
            </g>
          </g>
        `;
      case 'tnt':
        return `
          <g class="candle-group" ${candleOffset}>
            <rect x="88" y="78" width="7" height="38" rx="2" fill="url(#g_tnt_${uid})"/>
            <rect x="96" y="74" width="8" height="42" rx="2" fill="url(#g_tnt_${uid})"/>
            <rect x="105" y="78" width="7" height="38" rx="2" fill="url(#g_tnt_${uid})"/>
            <rect x="87" y="90" width="26" height="8" rx="1" fill="#212121"/>
            <text x="100" y="97" fill="#ffffff" font-size="6" font-weight="900" text-anchor="middle" font-family="sans-serif">TNT</text>
            <path d="M 100,74 Q 98,62 104,54" stroke="#795548" stroke-width="2" fill="none" stroke-linecap="round"/>
            <g transform="translate(104, 54)">
              <g class="flame-anim">
                <circle cx="0" cy="0" r="14" fill="url(#g_glow_flame_${uid})"/>
                <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#ffee58"/>
                <circle cx="0" cy="0" r="4" fill="#ffffff"/>
                <circle cx="-6" cy="-8" r="1.5" fill="#ff9800"/>
                <circle cx="8" cy="-6" r="1.2" fill="#ffeb3b"/>
              </g>
            </g>
          </g>
        `;
      case 'lightstick':
        return `
          <g class="candle-group" ${candleOffset}>
            <rect x="97" y="94" width="6" height="24" rx="2" fill="#37474f"/>
            <rect x="96" y="98" width="8" height="4" fill="#cfd8dc"/>
            <g transform="translate(100, 66)">
              <g class="flame-anim">
                <ellipse cx="0" cy="0" rx="16" ry="32" fill="url(#g_glow_flame_${uid})"/>
                <rect x="-5" y="-28" width="10" height="56" rx="5" fill="#00e676" stroke="#b9f6ca" stroke-width="2"/>
                <rect x="-2" y="-24" width="4" height="48" rx="2" fill="#ffffff" opacity="0.8"/>
                <text x="0" y="4" fill="#004d40" font-size="8" font-weight="bold" text-anchor="middle">★</text>
              </g>
            </g>
          </g>
        `;
      case 'chili':
        return `
          <g class="candle-group" ${candleOffset}>
            <path d="M 97,116 Q 100,108 100,102" stroke="#388e3c" stroke-width="3" fill="none"/>
            <path d="M 93,102 Q 100,99 107,102 L 105,107 Q 100,105 95,107 Z" fill="#2e7d32"/>
            <path d="M 95,102 Q 90,79 99,60 Q 107,76 105,102 Z" fill="url(#g_chili_${uid})"/>
            <g transform="translate(99, 60)">
              <g class="flame-anim">
                <circle cx="0" cy="-10" r="16" fill="url(#g_glow_flame_${uid})"/>
                <path d="M 0,0 C -7,-6 -7,-18 0,-26 C 7,-18 7,-6 0,0 Z" fill="url(#g_flame_core_${uid})"/>
                <path d="M 0,-3 C -3,-8 -3,-14 0,-20 C 3,-14 3,-8 0,-3 Z" fill="#ffffff"/>
              </g>
            </g>
          </g>
        `;
      case 'lottery99':
        return `
          <g class="candle-group" ${candleOffset}>
            <rect x="98" y="100" width="4" height="18" fill="#ffd54f"/>
            <g transform="translate(100, 88)">
              <circle cx="-8" cy="-2" r="10" fill="#ffd700" stroke="#ff6f00" stroke-width="2"/>
              <circle cx="-8" cy="-4" r="5" fill="#fff9c4"/>
              <path d="M -1,-4 L -4,10" stroke="#ff6f00" stroke-width="3.5" stroke-linecap="round"/>
              <circle cx="8" cy="-2" r="10" fill="#ffd700" stroke="#ff6f00" stroke-width="2"/>
              <circle cx="8" cy="-4" r="5" fill="#fff9c4"/>
              <path d="M 15,-4 L 12,10" stroke="#ff6f00" stroke-width="3.5" stroke-linecap="round"/>
            </g>
            <line x1="100" y1="74" x2="100" y2="66" stroke="#424242" stroke-width="1.8"/>
            <g transform="translate(100, 66)">
              <g class="flame-anim">
                <circle cx="0" cy="-10" r="16" fill="url(#g_glow_flame_${uid})"/>
                <path d="M 0,0 C -6,-6 -6,-16 0,-24 C 6,-16 6,-6 0,0 Z" fill="url(#g_flame_core_${uid})"/>
                <path d="M 0,-2 C -3,-6 -3,-12 0,-18 C 3,-12 3,-6 0,-2 Z" fill="#ffffff"/>
              </g>
            </g>
          </g>
        `;
      case 'incense':
        return `
          <g class="candle-group" ${candleOffset}>
            <!-- Incense holder at base -->
            <ellipse cx="100" cy="122" rx="14" ry="4.5" fill="#ffd54f" stroke="#ff8f00" stroke-width="1.2"/>
            <ellipse cx="100" cy="121.5" rx="11" ry="3.2" fill="#b8860b"/>
            <!-- Bamboo stems (lower part) -->
            <line x1="93" y1="121" x2="90" y2="100" stroke="#d7ccc8" stroke-width="1.6"/>
            <line x1="100" y1="121" x2="100" y2="96" stroke="#d7ccc8" stroke-width="1.8"/>
            <line x1="107" y1="121" x2="110" y2="100" stroke="#d7ccc8" stroke-width="1.6"/>
            <!-- Incense powder coated sticks -->
            <line x1="90" y1="100" x2="86" y2="44" stroke="#8d6e63" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="100" y1="96" x2="100" y2="38" stroke="#8d6e63" stroke-width="2.8" stroke-linecap="round"/>
            <line x1="110" y1="100" x2="114" y2="44" stroke="#8d6e63" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Burning red ember tips -->
            <line x1="86" y1="44" x2="86" y2="38" stroke="#d32f2f" stroke-width="2.6" stroke-linecap="round"/>
            <line x1="100" y1="38" x2="100" y2="31" stroke="#d32f2f" stroke-width="2.8" stroke-linecap="round"/>
            <line x1="114" y1="44" x2="114" y2="38" stroke="#d32f2f" stroke-width="2.6" stroke-linecap="round"/>
            <!-- Glowing ember sparks -->
            <circle cx="86" cy="38" r="3" fill="#ff5722" opacity="0.8"/>
            <circle cx="86" cy="38" r="1.5" fill="#fff59d"/>
            <circle cx="100" cy="31" r="3.5" fill="#ff5722" opacity="0.8"/>
            <circle cx="100" cy="31" r="1.8" fill="#fff59d"/>
            <circle cx="114" cy="38" r="3" fill="#ff5722" opacity="0.8"/>
            <circle cx="114" cy="38" r="1.5" fill="#fff59d"/>
            <!-- Drifting Incense Smoke -->
            <g class="flame-anim" style="transform-origin: 100px 38px;">
              <path d="M 86,37 Q 82,26 87,17 Q 92,8 86,2" stroke="rgba(255,255,255,0.45)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
              <path d="M 100,30 Q 105,20 98,12 Q 94,4 100,-3" stroke="rgba(255,255,255,0.55)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
              <path d="M 114,37 Q 119,26 113,17 Q 108,8 114,2" stroke="rgba(255,255,255,0.45)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
              <circle cx="86" cy="36" r="6" fill="#ffa726" opacity="0.25"/>
              <circle cx="100" cy="29" r="8" fill="#ffa726" opacity="0.3"/>
              <circle cx="114" cy="36" r="6" fill="#ffa726" opacity="0.25"/>
            </g>
          </g>
        `;
      case 'classic':
      default:
        return `
          <g class="candle-group" ${candleOffset}>
            <rect x="96" y="70" width="8" height="46" rx="2" fill="url(#g_wax_${uid})"/>
            <path d="M 96,75 Q 95,82 97,86 Q 98,82 97,76" fill="#ffee58"/>
            <line x1="100" y1="70" x2="100" y2="62" stroke="#37474f" stroke-width="1.8"/>
            <g transform="translate(100, 62)">
              <g class="flame-anim">
                <circle cx="0" cy="-10" r="18" fill="url(#g_glow_flame_${uid})"/>
                <path d="M 0,0 C -6,-6 -6,-16 0,-24 C 6,-16 6,-6 0,0 Z" fill="url(#g_flame_core_${uid})"/>
                <path d="M 0,-2 C -3,-6 -3,-12 0,-18 C 3,-12 3,-6 0,-2 Z" fill="#ffffff"/>
              </g>
            </g>
          </g>
        `;
    }
  }

  // Layer 4: Photo Avatar Stick (if hasPhoto) - Enlarged prominent circular badge
  function getPhotoBadge() {
    if (!hasPhoto) return '';
    return `
      <g class="photo-badge-group">
        <!-- Wooden skewer stick -->
        <line x1="64" y1="48" x2="64" y2="134" stroke="#5d4037" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="62.8" y1="48" x2="62.8" y2="134" stroke="#8d6e63" stroke-width="1.5"/>
        <!-- Golden circular frame rings -->
        <circle cx="64" cy="48" r="36" fill="#ffb300"/>
        <circle cx="64" cy="48" r="33.5" fill="#fff9c4"/>
        <circle cx="64" cy="48" r="32" fill="#ffffff"/>
        <!-- Clipped User Photo (diameter = 64px, ~2.7x larger area) -->
        <image href="${esc(photo)}" xlink:href="${esc(photo)}" x="32" y="16" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
        <!-- Outer metallic gold rim with soft gloss highlight -->
        <circle cx="64" cy="48" r="32" fill="none" stroke="url(#g_gold_rim_${uid})" stroke-width="3"/>
        <circle cx="86" cy="28" r="3.5" fill="#ffffff" opacity="0.85"/>
        <!-- Marigold flower at stick base -->
        <g transform="translate(64, 122) scale(0.85)">
          <circle cx="0" cy="0" r="10" fill="#e65100"/>
          <circle cx="0" cy="0" r="8" fill="#ff9800"/>
          <circle cx="0" cy="0" r="5.5" fill="#ffd600"/>
          <circle cx="0" cy="0" r="2.5" fill="#fffde7"/>
        </g>
      </g>
    `;
  }

  // Layer 5: Front Base (overlaps bottom of flowers, candle & stick stems)
  function getBaseFront(type) {
    switch (type) {
      case 'lotus':
        return `
          <g class="base-front">
            <path d="M 30,126 C 40,146 80,150 100,140 C 80,136 46,126 30,126 Z" fill="url(#g_lotus_petals_${uid})"/>
            <path d="M 170,126 C 160,146 120,150 100,140 C 120,136 154,126 170,126 Z" fill="url(#g_lotus_petals_${uid})"/>
            <path d="M 40,122 C 50,109 70,109 80,128 C 65,138 48,134 40,122 Z" fill="url(#g_lotus_inner_${uid})"/>
            <path d="M 160,122 C 150,109 130,109 120,128 C 135,138 152,134 160,122 Z" fill="url(#g_lotus_inner_${uid})"/>
            <path d="M 68,128 C 80,110 120,110 132,128 C 118,144 82,144 68,128 Z" fill="url(#g_lotus_petals_${uid})"/>
            <circle cx="85" cy="120" r="1.5" fill="#ffd700"/>
            <circle cx="100" cy="122" r="1.5" fill="#ffd700"/>
            <circle cx="115" cy="120" r="1.5" fill="#ffd700"/>
          </g>
        `;
      case 'jasmine':
        return `
          <g class="base-front">
            <path d="M 32,122 C 50,140 150,140 170,122 C 150,148 50,148 32,122 Z" fill="url(#g_leaf_${uid})"/>
            <path d="M 34,122 C 45,106 65,106 75,126 Z" fill="url(#g_leaf_light_${uid})"/>
            <path d="M 166,122 C 155,106 135,106 125,126 Z" fill="url(#g_leaf_light_${uid})"/>
            <path d="M 72,124 C 85,104 115,104 128,124 Z" fill="url(#g_leaf_${uid})"/>
            <circle cx="60" cy="120" r="1.8" fill="#ffd700"/>
            <circle cx="100" cy="122" r="2" fill="#ffd700"/>
            <circle cx="140" cy="120" r="1.8" fill="#ffd700"/>
          </g>
        `;
      case 'rose':
        return `
          <g class="base-front">
            <path d="M 33,118 C 33,148 70,154 100,154 C 130,154 167,148 167,118 C 150,130 50,130 33,118 Z" fill="#8d6e63"/>
            <path d="M 36,120 Q 100,134 164,120" stroke="#d7ccc8" stroke-width="3" fill="none"/>
            <path d="M 36,120 Q 100,134 164,120" stroke="#5d4037" stroke-width="1.8" stroke-dasharray="4,2" fill="none"/>
            <line x1="45" y1="126" x2="155" y2="148" stroke="#4e342e" stroke-width="1.8" opacity="0.4"/>
            <line x1="155" y1="126" x2="45" y2="148" stroke="#4e342e" stroke-width="1.8" opacity="0.4"/>
          </g>
        `;
      case 'gold':
        return `
          <g class="base-front">
            <path d="M 30,126 C 40,146 80,150 100,140 C 80,136 46,126 30,126 Z" fill="#ffa000"/>
            <path d="M 170,126 C 160,146 120,150 100,140 C 120,136 154,126 170,126 Z" fill="#ffa000"/>
            <path d="M 40,122 C 50,109 70,109 80,128 C 65,138 48,134 40,122 Z" fill="#ffd54f"/>
            <path d="M 160,122 C 150,109 130,109 120,128 C 135,138 152,134 160,122 Z" fill="#ffd54f"/>
            <path d="M 68,128 C 80,110 120,110 132,128 C 118,144 82,144 68,128 Z" fill="#ffca28"/>
            <circle cx="85" cy="120" r="2.5" fill="#d50000"/><circle cx="85" cy="120" r="1" fill="#ffffff"/>
            <circle cx="100" cy="122" r="3" fill="#d50000"/><circle cx="100" cy="122" r="1.2" fill="#ffffff"/>
            <circle cx="115" cy="120" r="2.5" fill="#d50000"/><circle cx="115" cy="120" r="1" fill="#ffffff"/>
          </g>
        `;
      case 'leaf':
      case 'banana_trunk':
        return `
          <g class="base-front">
            <path d="M 32,118 Q 100,130 168,118 L 168,136 Q 100,150 32,136 Z" fill="url(#g_trunk_bark_${uid})"/>
            <line x1="60" y1="122" x2="58" y2="139" stroke="#33691e" stroke-width="1.2"/>
            <line x1="85" y1="124" x2="84" y2="142" stroke="#33691e" stroke-width="1.2"/>
            <line x1="115" y1="124" x2="116" y2="142" stroke="#33691e" stroke-width="1.2"/>
            <line x1="140" y1="122" x2="142" y2="139" stroke="#33691e" stroke-width="1.2"/>
            <path d="M 31,128 Q 100,140 169,128" stroke="#d7ccc8" stroke-width="3.5" fill="none"/>
            <path d="M 31,128 Q 100,140 169,128" stroke="#8d6e63" stroke-width="2" stroke-dasharray="4,2" fill="none"/>
            <ellipse cx="100" cy="134" rx="4" ry="3" fill="#a1887f"/>
            <path d="M 100,134 Q 92,138 88,144" stroke="#8d6e63" stroke-width="2" fill="none"/>
            <path d="M 100,134 Q 108,138 112,144" stroke="#8d6e63" stroke-width="2" fill="none"/>
          </g>
        `;
      case 'coconut':
        return `
          <g class="base-front">
            <path d="M 33,118 C 33,148 70,152 100,152 C 130,152 167,148 167,118 C 150,130 50,130 33,118 Z" fill="url(#g_coconut_out_${uid})"/>
            <path d="M 46,128 Q 100,148 154,128" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" fill="none"/>
            <g transform="translate(138, 126) scale(0.65)">
              <circle cx="0" cy="0" r="7" fill="#ba68c8"/>
              <circle cx="-5" cy="2" r="5" fill="#ab47bc"/>
              <circle cx="5" cy="2" r="5" fill="#ab47bc"/>
              <circle cx="0" cy="2" r="2.5" fill="#ffd54f"/>
            </g>
          </g>
        `;
      case 'turtle_bread':
        return `
          <g class="base-front">
            <path d="M 38,124 C 18,120 14,130 28,136 C 40,138 46,132 42,126 Z" fill="#e65100"/>
            <path d="M 162,124 C 182,120 186,130 172,136 C 160,138 154,132 158,126 Z" fill="#e65100"/>
            <path d="M 34,120 Q 100,152 166,120 Q 100,136 34,120 Z" fill="url(#g_bread_${uid})"/>
            <g transform="translate(100, 138)">
              <circle cx="0" cy="0" r="14" fill="#f57c00"/>
              <circle cx="0" cy="0" r="12" fill="#ffb74d"/>
              <circle cx="-4" cy="-2" r="2.5" fill="#212121"/><circle cx="-5" cy="-3" r="0.8" fill="#ffffff"/>
              <circle cx="4" cy="-2" r="2.5" fill="#212121"/><circle cx="3" cy="-3" r="0.8" fill="#ffffff"/>
              <circle cx="-7" cy="3" r="2" fill="#ff8a80" opacity="0.7"/>
              <circle cx="7" cy="3" r="2" fill="#ff8a80" opacity="0.7"/>
              <path d="M -3,3 Q 0,7 3,3" stroke="#5d4037" stroke-width="1.4" fill="none" stroke-linecap="round"/>
            </g>
          </g>
        `;
      case 'ice':
        return `
          <g class="base-front">
            <polygon points="34,120 48,140 76,132 66,118" fill="url(#g_ice_${uid})" opacity="0.8"/>
            <polygon points="66,118 76,132 100,144 100,126" fill="#ffffff" opacity="0.6"/>
            <polygon points="134,118 124,132 100,144 100,126" fill="url(#g_ice_${uid})" opacity="0.75"/>
            <polygon points="166,120 152,140 124,132 134,118" fill="#80deea" opacity="0.8"/>
            <path d="M 34,120 Q 100,146 166,120" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.9"/>
            <text x="60" y="132" fill="#ffffff" font-size="8">✦</text>
            <text x="135" y="132" fill="#ffffff" font-size="8">✦</text>
          </g>
        `;
      case 'orchid':
      case 'banana_leaf':
      default:
        return `
          <g class="base-front">
            <path d="M 32,122 Q 100,158 168,122 Q 100,136 32,122 Z" fill="url(#g_leaf_back_${uid})"/>
            <path d="M 34,122 L 48,106 L 62,126 Z" fill="url(#g_leaf_${uid})" stroke="#1b5e20" stroke-width="0.8"/>
            <circle cx="48" cy="120" r="1.5" fill="#ffd700"/>
            <path d="M 56,124 L 72,104 L 88,128 Z" fill="url(#g_leaf_light_${uid})" stroke="#2e7d32" stroke-width="0.8"/>
            <circle cx="72" cy="122" r="1.5" fill="#ffd700"/>
            <path d="M 82,126 L 100,102 L 118,126 Z" fill="url(#g_leaf_${uid})" stroke="#1b5e20" stroke-width="0.8"/>
            <circle cx="100" cy="124" r="1.5" fill="#ffd700"/>
            <path d="M 112,128 L 128,104 L 144,124 Z" fill="url(#g_leaf_light_${uid})" stroke="#2e7d32" stroke-width="0.8"/>
            <circle cx="128" cy="122" r="1.5" fill="#ffd700"/>
            <path d="M 138,126 L 152,106 L 166,122 Z" fill="url(#g_leaf_${uid})" stroke="#1b5e20" stroke-width="0.8"/>
            <circle cx="152" cy="120" r="1.5" fill="#ffd700"/>
            <path d="M 30,122 C 50,140 150,140 170,122 C 150,148 50,148 30,122 Z" fill="url(#g_leaf_${uid})"/>
            <path d="M 32,124 Q 100,148 168,124" stroke="#81c784" stroke-width="1.5" fill="none" opacity="0.6"/>
          </g>
        `;
    }
  }

  // Layer 6: Waterline Meniscus (Front of all - Krathong sits IN the water)
  const waterlineFront = `
    <g class="layer-6-waterline" data-layer="waterline-meniscus">
      <!-- Translucent water caustics submerging the lower 6-8px of the base -->
      <path d="M 26,134 Q 100,148 174,134 C 154,151 46,151 26,134 Z" fill="rgba(7, 30, 52, 0.52)"/>
      <!-- Glowing water meniscus rim hugging front of hull -->
      <path d="M 28,133 Q 100,146 172,133" stroke="rgba(215, 245, 255, 0.72)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M 46,136 Q 100,145 154,136" stroke="rgba(255, 255, 255, 0.8)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <!-- Front sheen of candlelight on water -->
      <ellipse cx="100" cy="142" rx="48" ry="4" fill="url(#g_water_glow_${uid})" opacity="0.45"/>
    </g>
  `;

  // Realistic Layer Stacking with Water Contact & Submersion:
  return `
<svg class="krathong-svg" viewBox="0 0 200 165" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${defs}
  <!-- Layer 1 (Back Base & Water Contact) -->
  <g class="layer-1-back" data-layer="back-base">
    ${waterReflection}
    ${getBaseBack(baseKey)}
  </g>
  <!-- Layer 2 (Flowers & Inner Filling) -->
  <g class="layer-2-flowers" data-layer="flowers-filling">
    ${getFlowerBed(flowerKey)}
  </g>
  <!-- Layer 3 (Candles / Deco) -->
  <g class="layer-3-candles" data-layer="candles-deco">
    ${getCandle(candleKey)}
  </g>
  <!-- Layer 4 (Photo Avatar Stick) -->
  <g class="layer-4-photo" data-layer="photo-stick">
    ${getPhotoBadge()}
  </g>
  <!-- Layer 5 (Front Base) -->
  <g class="layer-5-front" data-layer="front-base">
    ${getBaseFront(baseKey)}
  </g>
  <!-- Layer 6 (Waterline Meniscus - Krathong sits IN water) -->
  ${waterlineFront}
</svg>
  `.trim();
}

function artHTML(item, uid) {
  const parts = getParts(item);
  return renderKrathongSVG({
    type: parts.base[0],
    flower: parts.flower[0],
    candle: parts.candle[0],
    color: item && item.color ? item.color : '#ffc977',
    photo: safePhoto(item ? item.photo : ''),
    id: item ? item.id : ''
  }, uid);
}

/* ==========================================================================
   Choice Previews in SVG (Requirement 1.4)
   ========================================================================== */
function getBasePreviewSVG(key) {
  switch (key) {
    case 'lotus':
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <path d="M 18,48 C 24,30 36,25 45,38 C 32,38 24,44 18,48 Z" fill="#f48fb1"/>
        <path d="M 72,48 C 66,30 54,25 45,38 C 58,38 66,44 72,48 Z" fill="#f48fb1"/>
        <path d="M 30,48 C 38,24 52,24 60,48 C 52,42 38,42 30,48 Z" fill="#ec407a"/>
        <path d="M 22,48 C 32,58 58,58 68,48 C 55,54 35,54 22,48 Z" fill="#ad1457"/>
        <circle cx="45" cy="42" r="3" fill="#ffd700"/>
      </svg>`;
    case 'orchid':
    case 'banana_leaf':
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <path d="M 20,48 Q 45,62 70,48 Q 45,54 20,48 Z" fill="#1b5e20"/>
        <path d="M 22,46 L 32,32 L 42,48 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
        <path d="M 36,48 L 45,28 L 54,48 Z" fill="#81c784" stroke="#2e7d32" stroke-width="0.8"/>
        <path d="M 48,48 L 58,32 L 68,46 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
        <path d="M 18,48 C 30,58 60,58 72,48 C 60,62 30,62 18,48 Z" fill="#2e7d32"/>
      </svg>`;
    case 'jasmine':
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <path d="M 18,48 C 30,58 60,58 72,48 C 60,62 30,62 18,48 Z" fill="#2e7d32"/>
        <circle cx="45" cy="40" r="14" fill="#66bb6a"/>
        <circle cx="36" cy="36" r="8" fill="#81c784"/>
        <circle cx="54" cy="36" r="8" fill="#81c784"/>
        <circle cx="45" cy="28" r="8" fill="#a5d6a7"/>
        <circle cx="45" cy="46" r="2.5" fill="#ffd700"/>
      </svg>`;
    case 'rose':
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <ellipse cx="45" cy="36" rx="30" ry="9" fill="#3e2723"/>
        <path d="M 16,36 C 16,56 32,60 45,60 C 58,60 74,56 74,36 C 64,44 26,44 16,36 Z" fill="#8d6e63"/>
        <path d="M 22,42 Q 45,54 68,42" stroke="#d7ccc8" stroke-width="2" fill="none"/>
        <line x1="26" y1="40" x2="64" y2="52" stroke="#5d4037" stroke-width="1.2" opacity="0.6"/>
        <line x1="64" y1="40" x2="26" y2="52" stroke="#5d4037" stroke-width="1.2" opacity="0.6"/>
      </svg>`;
    case 'leaf':
    case 'banana_trunk':
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <ellipse cx="45" cy="38" rx="32" ry="9" fill="#c5e1a5"/>
        <ellipse cx="45" cy="38" rx="20" ry="5" fill="#dcedc8"/>
        <path d="M 13,38 Q 45,46 77,38 L 77,50 Q 45,58 13,50 Z" fill="#558b2f"/>
        <path d="M 13,44 Q 45,52 77,44" stroke="#8d6e63" stroke-width="2" stroke-dasharray="3,2" fill="none"/>
        <path d="M 45,35 Q 48,24 54,26 Q 48,32 45,35 Z" fill="#4caf50"/>
      </svg>`;
    case 'gold':
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <path d="M 18,48 C 24,30 36,25 45,38 C 32,38 24,44 18,48 Z" fill="#ffd54f"/>
        <path d="M 72,48 C 66,30 54,25 45,38 C 58,38 66,44 72,48 Z" fill="#ffd54f"/>
        <path d="M 30,48 C 38,24 52,24 60,48 C 52,42 38,42 30,48 Z" fill="#ffca28"/>
        <path d="M 22,48 C 32,58 58,58 68,48 C 55,54 35,54 22,48 Z" fill="#ff8f00"/>
        <circle cx="45" cy="40" r="3.5" fill="#d50000"/>
        <circle cx="45" cy="40" r="1.5" fill="#ffffff"/>
      </svg>`;
    case 'coconut':
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <ellipse cx="45" cy="36" rx="30" ry="9" fill="#27160c"/>
        <path d="M 15,36 C 15,56 32,60 45,60 C 58,60 75,56 75,36 C 65,44 25,44 15,36 Z" fill="#4e342e"/>
        <path d="M 22,42 Q 45,54 68,42" stroke="rgba(255,255,255,0.25)" stroke-width="1.8" fill="none"/>
        <circle cx="62" cy="40" r="4.5" fill="#ab47bc"/>
        <circle cx="62" cy="40" r="1.5" fill="#ffd54f"/>
      </svg>`;
    case 'turtle_bread':
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <ellipse cx="45" cy="42" rx="26" ry="12" fill="#ffb74d"/>
        <ellipse cx="45" cy="40" rx="23" ry="10" fill="#ffe082"/>
        <circle cx="45" cy="52" r="7" fill="#f57c00"/>
        <circle cx="43" cy="51" r="1.2" fill="#212121"/><circle cx="47" cy="51" r="1.2" fill="#212121"/>
        <ellipse cx="22" cy="46" rx="5" ry="3.5" fill="#ff9800"/>
        <ellipse cx="68" cy="46" rx="5" ry="3.5" fill="#ff9800"/>
      </svg>`;
    case 'ice':
    default:
      return `<svg viewBox="0 0 90 65" class="choice-mini-svg">
        <ellipse cx="45" cy="46" rx="30" ry="9" fill="#80deea" opacity="0.6"/>
        <polygon points="20,44 32,24 45,46" fill="#b2ebf2" opacity="0.85"/>
        <polygon points="35,46 45,18 55,46" fill="#ffffff" opacity="0.9"/>
        <polygon points="45,46 58,24 70,44" fill="#80deea" opacity="0.85"/>
        <ellipse cx="45" cy="44" rx="28" ry="7" fill="#e0f7fa" opacity="0.5"/>
      </svg>`;
  }
}

function getCandlePreviewSVG(key) {
  switch (key) {
    case 'classic':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <rect x="32" y="32" width="6" height="28" rx="2" fill="#fbc02d"/>
        <line x1="35" y1="32" x2="35" y2="25" stroke="#37474f" stroke-width="1.8"/>
        <circle cx="35" cy="18" r="9" fill="#ffa726" opacity="0.35"/>
        <path d="M 35,25 C 31,21 31,14 35,8 C 39,14 39,21 35,25 Z" fill="#ff9100"/>
        <circle cx="35" cy="19" r="2.5" fill="#ffffff"/>
      </svg>`;
    case 'pair':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <rect x="25" y="34" width="5.5" height="26" rx="1.5" fill="#fbc02d"/>
        <line x1="27.8" y1="34" x2="27.8" y2="28" stroke="#37474f" stroke-width="1.5"/>
        <path d="M 27.8,28 C 24,24 24,18 27.8,12 C 31,18 31,24 27.8,28 Z" fill="#ff9100"/>
        <rect x="39" y="34" width="5.5" height="26" rx="1.5" fill="#fbc02d"/>
        <line x1="41.8" y1="34" x2="41.8" y2="28" stroke="#37474f" stroke-width="1.5"/>
        <path d="M 41.8,28 C 38,24 38,18 41.8,12 C 45,18 45,24 41.8,28 Z" fill="#ff9100"/>
      </svg>`;
    case 'incense':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <line x1="28" y1="62" x2="26" y2="22" stroke="#8d6e63" stroke-width="1.6"/>
        <line x1="35" y1="62" x2="35" y2="18" stroke="#8d6e63" stroke-width="1.6"/>
        <line x1="42" y1="62" x2="44" y2="22" stroke="#8d6e63" stroke-width="1.6"/>
        <line x1="26" y1="22" x2="26" y2="18" stroke="#d32f2f" stroke-width="2"/>
        <line x1="35" y1="18" x2="35" y2="14" stroke="#d32f2f" stroke-width="2"/>
        <line x1="44" y1="22" x2="44" y2="18" stroke="#d32f2f" stroke-width="2"/>
        <circle cx="26" cy="18" r="1.5" fill="#ff5722"/>
        <circle cx="35" cy="14" r="1.5" fill="#ff5722"/>
        <circle cx="44" cy="18" r="1.5" fill="#ff5722"/>
        <ellipse cx="35" cy="56" rx="15" ry="6" fill="#ffd54f" stroke="#ff8f00" stroke-width="1.2"/>
      </svg>`;
    case 'golden':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <circle cx="35" cy="35" r="18" fill="#ffd700" opacity="0.25"/>
        <text x="35" y="44" fill="#ffd700" font-size="30" text-anchor="middle" font-weight="bold">✦</text>
        <circle cx="22" cy="22" r="2.5" fill="#fff59d"/>
        <circle cx="48" cy="22" r="2.5" fill="#fff59d"/>
        <circle cx="50" cy="46" r="2.5" fill="#fff59d"/>
      </svg>`;
    case 'lantern':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <line x1="35" y1="10" x2="35" y2="20" stroke="#ffd54f" stroke-width="1.8"/>
        <rect x="23" y="20" width="24" height="32" rx="6" fill="#e53935"/>
        <ellipse cx="35" cy="36" rx="7" ry="12" fill="#ffee58" opacity="0.85"/>
        <line x1="23" y1="28" x2="47" y2="28" stroke="#ffd54f" stroke-width="1.2"/>
        <line x1="23" y1="44" x2="47" y2="44" stroke="#ffd54f" stroke-width="1.2"/>
        <line x1="35" y1="52" x2="35" y2="62" stroke="#ffd54f" stroke-width="2"/>
        <circle cx="35" cy="62" r="2" fill="#ff8f00"/>
      </svg>`;
    case 'sparkle':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <line x1="20" y1="52" x2="48" y2="22" stroke="#d7ccc8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="48" y1="22" x2="52" y2="18" stroke="#ffe082" stroke-width="3" stroke-linecap="round"/>
        <circle cx="52" cy="18" r="8" fill="#ffd700" opacity="0.3"/>
        <polygon points="52,10 54,16 60,18 54,20 52,26 50,20 44,18 50,16" fill="#fff59d"/>
        <circle cx="42" cy="12" r="1.5" fill="#ff9100"/>
        <circle cx="60" cy="26" r="1.5" fill="#ffab00"/>
        <circle cx="58" cy="10" r="1.2" fill="#ffffff"/>
      </svg>`;
    case 'lotus_candle':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <path d="M 24,56 C 20,48 26,40 35,42 C 44,40 50,48 46,56 Z" fill="#f06292"/>
        <path d="M 28,56 C 26,48 32,42 35,44 C 38,42 44,48 42,56 Z" fill="#f8bbd0"/>
        <line x1="35" y1="42" x2="35" y2="35" stroke="#37474f" stroke-width="1.6"/>
        <path d="M 35,35 C 32,30 32,24 35,18 C 38,24 38,30 35,35 Z" fill="#ff9100"/>
        <circle cx="35" cy="28" r="3" fill="#ffffff"/>
      </svg>`;
    case 'tnt':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <rect x="25" y="32" width="6" height="28" rx="1.5" fill="#e53935"/>
        <rect x="32" y="28" width="6" height="32" rx="1.5" fill="#d32f2f"/>
        <rect x="39" y="32" width="6" height="28" rx="1.5" fill="#e53935"/>
        <rect x="24" y="42" width="22" height="7" rx="1" fill="#212121"/>
        <text x="35" y="47.5" fill="#ffffff" font-size="5" font-weight="900" text-anchor="middle" font-family="sans-serif">TNT</text>
        <path d="M 35,28 Q 33,20 37,15" stroke="#795548" stroke-width="1.5" fill="none"/>
        <circle cx="37" cy="15" r="2.5" fill="#ffeb3b"/>
      </svg>`;
    case 'lightstick':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <rect x="33" y="42" width="4" height="18" rx="1.5" fill="#455a64"/>
        <rect x="31" y="16" width="8" height="28" rx="4" fill="#00e676" stroke="#b9f6ca" stroke-width="1.2"/>
        <circle cx="35" cy="30" r="12" fill="#69f0ae" opacity="0.3"/>
        <text x="35" y="32" fill="#004d40" font-size="8" font-weight="bold" text-anchor="middle">★</text>
      </svg>`;
    case 'chili':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <path d="M 35,56 Q 34,48 35,42" stroke="#388e3c" stroke-width="2.5" fill="none"/>
        <path d="M 32,44 Q 28,26 35,16 Q 42,26 38,44 Z" fill="#d32f2f"/>
        <circle cx="35" cy="14" r="8" fill="#ffa726" opacity="0.35"/>
        <path d="M 35,20 C 32,16 32,10 35,5 C 38,10 38,16 35,20 Z" fill="#ff9100"/>
      </svg>`;
    case 'lottery99':
      return `<svg viewBox="0 0 70 70" class="choice-mini-svg">
        <rect x="33" y="44" width="4" height="16" fill="#ffd54f"/>
        <circle cx="28" cy="38" r="7" fill="#ffd700" stroke="#ff6f00" stroke-width="1.2"/>
        <circle cx="42" cy="38" r="7" fill="#ffd700" stroke="#ff6f00" stroke-width="1.2"/>
        <circle cx="35" cy="22" r="8" fill="#ffa726" opacity="0.3"/>
        <path d="M 35,28 C 32,24 32,18 35,12 C 38,18 38,24 35,28 Z" fill="#ff9100"/>
      </svg>`;
    default:
      return '';
  }
}

function updatePreview() {
  const previewArt = $('previewArt');
  if (previewArt) {
    previewArt.innerHTML = artHTML(state, 'prev');
  }
  const krathongPreview = $('krathongPreview');
  if (krathongPreview) {
    krathongPreview.style.setProperty('--glow', state.color);
  }
  const photoBadge = $('photoBadge');
  if (photoBadge) {
    photoBadge.hidden = true;
  }
  const previewName = $('previewName');
  if (previewName) {
    const nameInput = $('name');
    previewName.textContent = (nameInput && nameInput.value ? nameInput.value.trim() : '') || 'ชื่อผู้ลอย';
  }
}

function renderChoices(id, values, key) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = values.map(([k, e, n]) => {
    let artHtml = '';
    if (key === 'type') {
      artHtml = `<div class="choice-art">${getBasePreviewSVG(k)}</div>`;
    } else if (key === 'candle') {
      artHtml = `<div class="choice-art">${getCandlePreviewSVG(k)}</div>`;
    } else {
      artHtml = `<div class="emoji">${e}</div>`;
    }
    return `<button type="button" class="choice ${k === state[key] ? 'active' : ''}" data-value="${k}" aria-pressed="${k === state[key]}">${artHtml}<b>${n}</b></button>`;
  }).join('');
  el.onclick = e => {
    const b = e.target.closest('[data-value]');
    if (!b) return;
    state[key] = b.dataset.value;
    el.querySelectorAll('.choice').forEach(x => {
      const chosen = x === b;
      x.classList.toggle('active', chosen);
      x.setAttribute('aria-pressed', String(chosen));
    });
    updatePreview();
  };
}

function initChoices() {
  renderChoices('choices', BASES, 'type');
  renderChoices('flowerChoices', FLOWERS, 'flower');
  renderChoices('candleChoices', CANDLES, 'candle');
  $('colors').onclick = e => {
    const b = e.target.closest('.color');
    if (!b) return;
    state.color = b.dataset.color;
    document.querySelectorAll('.color').forEach(x => x.classList.toggle('active', x === b));
    updatePreview();
  };
}

let wizardStep = 1;
function showWizardStatus(message) { $('status').textContent = message; }
function wizardValidateStep(step) {
  if (step === 3) {
    if (!$('name').value.trim()) { showWizardStatus('กรุณากรอกชื่อที่ต้องการแสดง'); $('name').focus(); return false; }
    if (!$('dept').value) { showWizardStatus('กรุณาเลือกแผนก'); $('dept').focus(); return false; }
    if (!$('wish').value.trim()) { showWizardStatus('กรุณากรอกคำอธิษฐาน'); $('wish').focus(); return false; }
    if (state.photoProcessing) { showWizardStatus('กำลังเตรียมรูป กรุณารอสักครู่'); return false; }
  }
  return true;
}

function wizardReview() {
  const name = $('name').value.trim(), department = $('dept').value, wish = $('wish').value.trim();
  const parts = getParts(state);
  const rows = [
    ['ฐานกระทง', parts.base[2]],
    ['ดอกไม้', parts.flower[2]],
    ['ธูปเทียน', parts.candle[2]],
    ['ผู้ลอย', name],
    ['แผนก', department],
    ['คำอธิษฐาน', wish],
    ['รูปใบหน้า', state.photo ? 'แนบรูปแล้ว' : 'ไม่ได้แนบรูป']
  ];
  $('wizardSummary').innerHTML = rows.map(([key, value]) => `<div class="wizard-summary-row"><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join('');
  const label = $('photoPublic').closest('label');
  label.hidden = !state.photo;
  if (!state.photo) {
    $('photoPublic').checked = false;
  } else if (!$('photoPublic').dataset.touched) {
    $('photoPublic').checked = true;
  }

}

function setWizardStep(step) {
  wizardStep = Math.max(1, Math.min(4, step));
  document.querySelectorAll('#builderModal .wizard-step').forEach(el => { el.hidden = Number(el.dataset.step) !== wizardStep; });
  document.querySelectorAll('#builderModal .wizard-dot').forEach(el => {
    const n = Number(el.dataset.goStep);
    el.classList.toggle('active', n === wizardStep);
    el.classList.toggle('completed', n < wizardStep);
    el.setAttribute('aria-current', n === wizardStep ? 'step' : 'false');
  });
  $('wizardPrev').hidden = wizardStep === 1;
  $('cancelBuilder').hidden = wizardStep !== 1;
  $('wizardNext').hidden = wizardStep === 4;
  $('release').hidden = wizardStep !== 4;
  $('status').textContent = '';
  if (wizardStep === 4) wizardReview();
  const shell = document.querySelector('#builderModal .dialog.wide');
  if (shell) shell.scrollTo({ top: 0, behavior: 'instant' });
}

$('wizardNext').onclick = () => { if (wizardValidateStep(wizardStep)) setWizardStep(wizardStep + 1); };
$('wizardPrev').onclick = () => setWizardStep(wizardStep - 1);
document.querySelectorAll('#builderModal .wizard-dot').forEach(btn => btn.onclick = () => {
  const target = Number(btn.dataset.goStep);
  if (target < wizardStep) setWizardStep(target);
  else if (target === wizardStep + 1 && wizardValidateStep(wizardStep)) setWizardStep(target);
});

function openModal(id) { $(id).hidden = false; document.body.classList.add('noscroll'); }
function closeModal(id) { $(id).hidden = true; if ([...document.querySelectorAll('.modal')].every(m => m.hidden)) document.body.classList.remove('noscroll'); }

$('openBuilder').onclick = () => { setWizardStep(1); openModal('builderModal'); };
$('openHrTop').onclick = () => openModal('hrModal');
$('closeBuilder').onclick = () => closeModal('builderModal');
$('cancelBuilder').onclick = () => closeModal('builderModal');
$('closeHr').onclick = () => closeModal('hrModal');
$('closeDialog').onclick = () => closeModal('dialog');
$('builderModal').onclick = e => { if (e.target === $('builderModal')) closeModal('builderModal'); };
$('hrModal').onclick = e => { if (e.target === $('hrModal')) closeModal('hrModal'); };
$('dialog').onclick = e => { if (e.target === $('dialog')) closeModal('dialog'); };

$('name').addEventListener('input', updatePreview);
$('photo').addEventListener('change', async e => {
  const f = e.target.files?.[0];
  if (!f) return;
  if (f.size > 12 * 1024 * 1024) { $('photoStatus').textContent = 'ไฟล์ใหญ่เกิน 12 MB'; e.target.value = ''; return; }
  state.photoProcessing = true; $('release').disabled = true; $('photoStatus').textContent = 'กำลังเตรียมรูป...';
  try {
    const data = await shrink(f);
    if (!safePhoto(data)) throw Error('รูปแบบภาพไม่รองรับ');
    state.photo = data;
    $('photoStatus').textContent = '✓ แนบรูปแล้ว รูปของคุณจะปรากฏบนป้ายไม้เสียบในกระทง';
    $('clearPhoto').hidden = false;
    updatePreview();
  } catch (err) {
    console.error('Photo processing failed:', err);
    $('photoStatus').textContent = 'ไม่สามารถอ่านรูปนี้ได้ ลองใช้รูป JPG/PNG หรือแปลง HEIC เป็น JPG';
    e.target.value = ''; state.photo = ''; $('clearPhoto').hidden = true; updatePreview();
  } finally {
    state.photoProcessing = false; $('release').disabled = false;
  }
});

$('clearPhoto').onclick = () => {
  state.photo = ''; $('photo').value = ''; $('photoPublic').checked = false;
  $('photoStatus').textContent = 'ยังไม่ได้เลือกรูป'; $('clearPhoto').hidden = true; updatePreview();
};

function readDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('อ่านรูปไม่ได้')); reader.readAsDataURL(file); }); }
function imageFromUrl(url) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('เปิดรูปไม่ได้')); img.src = url; }); }
async function shrink(file) {
  const src = await readDataUrl(file);
  const img = await imageFromUrl(src);
  if (!img.naturalWidth || !img.naturalHeight) throw Error('Invalid image');
  let edge = 260;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', Math.max(.43, .8 - attempt * .065));
    if (result.length < 150000) return result;
    edge = Math.round(edge * .82);
  }
  throw Error('Photo exceeds upload limit');
}

function setReleaseLoading(isLoading) {
  const overlay = $('releaseLoading');
  const btn = $('release');
  const cancel = $('cancelBuilder');
  const close = $('closeBuilder');
  const file = $('photo');
  if (isLoading) {
    overlay.hidden = false;
    btn.disabled = true;
    btn.dataset.originalLabel = btn.dataset.originalLabel || btn.innerHTML;
    btn.innerHTML = '<span class="btn-spin"></span> กำลังปล่อย...';
    cancel.disabled = true;
    close.disabled = true;
    if (file) file.disabled = true;
    document.body.classList.add('is-releasing-krathong');
  } else {
    overlay.hidden = true;
    btn.disabled = false;
    if (btn.dataset.originalLabel) btn.innerHTML = btn.dataset.originalLabel;
    cancel.disabled = false;
    close.disabled = false;
    if (file) file.disabled = false;
    document.body.classList.remove('is-releasing-krathong');
  }
}

async function request(action, data = {}, method = 'POST') {
  if (!API || API.includes('REPLACE-WITH')) throw Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js');
  const url = API.replace(/\/$/, '');
  const resp = await fetch(method === 'GET' ? url + '?' + new URLSearchParams({ action, ...data }) : url, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
    body: method === 'POST' ? JSON.stringify({ action, ...data }) : undefined
  });
  const out = await resp.json();
  if (!resp.ok || !out.ok) throw Error(out.error || 'API Error');
  return out;
}

function displayWish(item) {
  const photo = safePhoto(item.photo);
  $('dialogBody').innerHTML = `<div class="wish-symbol"><div class="krathong-art dialog-art">${artHTML(item, 'dialog_' + (item.id || 'curr'))}</div></div>${photo ? `<img class="wish-face" src="${photo}" alt="รูปผู้ร่วมกิจกรรม">` : ''}<h3>${esc(item.name)}</h3><small>${esc(item.department)}</small><p>${esc(item.wish)}</p><small>${new Date(item.createdAt).toLocaleString('th-TH')}</small>`;
  openModal('dialog');
}

function initSeaDecor() {
  const sea = $('seaBoard');
  if (sea.dataset.decorReady) return;
  sea.dataset.decorReady = '1';
  const sky = document.createElement('div');
  sky.className = 'atmosphere-sky';
  sky.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 3; i++) {
    const pyro = document.createElement('div');
    pyro.className = 'pyro v7-pyro';
    pyro.innerHTML = '<div class="before"></div><div class="after"></div>';
    pyro.style.setProperty('--cycle', (10 + Math.random() * 7).toFixed(2) + 's');
    pyro.style.setProperty('--delay', (-Math.random() * 15).toFixed(2) + 's');
    const relocate = () => {
      pyro.style.left = (12 + Math.random() * 76).toFixed(2) + '%';
      pyro.style.top = (16 + Math.random() * 50).toFixed(2) + '%';
      pyro.style.setProperty('--burst-scale', (0.42 + Math.random() * 0.33).toFixed(2));
    };
    relocate();
    pyro.addEventListener('animationiteration', e => { if (e.animationName === 'v7Firework') relocate(); });
    sky.appendChild(pyro);
  }

  for (let i = 0; i < 5; i++) {
    const cloud = document.createElement('div');
    cloud.className = 'v7-cloud ' + (i % 2 === 0 ? 'v7-cloud-right' : 'v7-cloud-left');
    cloud.style.top = (8 + Math.random() * 55).toFixed(1) + '%';
    cloud.style.setProperty('--cloud-scale', (0.65 + Math.random() * 0.9).toFixed(2));
    cloud.style.setProperty('--cloud-duration', (34 + Math.random() * 35).toFixed(1) + 's');
    cloud.style.setProperty('--cloud-delay', (-Math.random() * 60).toFixed(1) + 's');
    sky.appendChild(cloud);
  }

  for (let i = 0; i < 9; i++) {
    const lantern = document.createElement('div');
    lantern.className = 'sky-lantern v7-lantern';
    const reset = () => {
      lantern.style.left = (5 + Math.random() * 88).toFixed(2) + '%';
      lantern.style.setProperty('--lantern-size', (12 + Math.random() * 20).toFixed(1) + 'px');
      lantern.style.setProperty('--lantern-drift', (-55 + Math.random() * 110).toFixed(1) + 'px');
      lantern.style.setProperty('--lantern-travel', (sky.clientHeight + 75) + 'px');
    };
    reset();
    lantern.style.setProperty('--lantern-duration', (15 + Math.random() * 17).toFixed(1) + 's');
    lantern.style.setProperty('--lantern-delay', (-Math.random() * 30).toFixed(1) + 's');
    lantern.addEventListener('animationiteration', e => { if (e.animationName === 'v7LanternRise') reset(); });
    sky.appendChild(lantern);
  }
  sea.appendChild(sky);
  sky.style.zIndex = '4';
  window.addEventListener('resize', () => {
    initSeaWavesCanvas();
    for (const lantern of sky.querySelectorAll('.v7-lantern'))
      lantern.style.setProperty('--lantern-travel', (sky.clientHeight + 75) + 'px');
  }, { passive: true });
  initSeaLife();
  initSeaWavesCanvas();
}

const SEA_LIFE_ART = {
  turtle: `<svg viewBox="0 0 150 85" aria-hidden="true"><defs><linearGradient id="turtleShell" x2="0" y2="1"><stop stop-color="#7ed4ad"/><stop offset="1" stop-color="#286f77"/></linearGradient></defs><path class="turtle-flipper front-a" d="M27 41 Q5 22 4 40 Q6 56 29 48" fill="#66b6a5" opacity=".92"/><path class="turtle-flipper front-b" d="M92 35 Q129 9 131 23 Q132 40 101 47" fill="#66b6a5" opacity=".92"/><path class="turtle-flipper back-a" d="M38 58 Q15 78 29 80 Q45 72 56 61" fill="#59a796" opacity=".88"/><path class="turtle-flipper back-b" d="M94 58 Q119 80 130 73 Q130 61 105 52" fill="#59a796" opacity=".88"/><ellipse class="turtle-shell" cx="72" cy="45" rx="46" ry="28" fill="url(#turtleShell)"/><path d="M46 35 L72 21 L97 35 L101 51 L73 66 L44 51 Z M72 21 L73 66 M46 35 L101 51" fill="none" stroke="#b8e2ba" stroke-width="3" opacity=".55"/><circle class="turtle-head" cx="130" cy="43" r="18" fill="#74c9b1"/><circle cx="138" cy="38" r="3" fill="#102e40"/></svg>`,
  ray: `<svg viewBox="0 0 180 95" aria-hidden="true"><defs><linearGradient id="rayShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#83bcd1"/><stop offset="1" stop-color="#326d8c"/></linearGradient></defs><path class="ray-wing wing-left" d="M15 49 Q41 3 91 34 Q76 49 69 66 Q33 57 15 49" fill="url(#rayShade)" stroke="#b8e5ee" stroke-width="2" opacity=".96"/><path class="ray-wing wing-right" d="M91 34 Q127 3 165 46 Q136 52 121 68 Q102 83 89 72 Q85 52 91 34" fill="url(#rayShade)" stroke="#b8e5ee" stroke-width="2" opacity=".96"/><path class="ray-tail" d="M90 71 Q94 83 90 95" fill="none" stroke="#5ea4ba" stroke-width="4"/><circle cx="75" cy="47" r="3" fill="#102d40"/><circle cx="103" cy="47" r="3" fill="#102d40"/></svg>`,
  dolphin: `<svg viewBox="0 0 180 95" aria-hidden="true"><defs><linearGradient id="dolphinSkin" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#91c5da"/><stop offset="1" stop-color="#317193"/></linearGradient></defs><path class="dolphin-body" d="M15 58 Q30 50 36 32 Q34 56 57 50 Q75 13 110 26 L124 12 L127 35 Q144 43 154 52 L176 50 L154 62 Q125 85 90 72 L70 86 L74 66 Q44 70 15 58" fill="url(#dolphinSkin)" stroke="#afdbe7" stroke-width="2"/><path class="dolphin-tail" d="M15 58 Q30 50 36 32 Q34 56 57 50 Q43 60 15 58" fill="#5f95b1" opacity=".95"/><path class="dolphin-fin" d="M91 38 Q104 23 111 32 Q100 37 96 48" fill="#5f95b1" opacity=".92"/><path d="M63 62 Q103 76 141 57" stroke="#c8e9ec" stroke-width="4" opacity=".6" fill="none"/><circle cx="141" cy="48" r="3" fill="#092d40"/></svg>`,
  fish: `<svg viewBox="0 0 130 80" aria-hidden="true"><defs><linearGradient id="fishShade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffdc8f"/><stop offset="1" stop-color="#e27c63"/></linearGradient></defs><path class="fish-tail" d="M30 40 L4 14 L5 65 Z" fill="#e99663"/><ellipse class="fish-body" cx="76" cy="41" rx="48" ry="29" fill="url(#fishShade)" stroke="#ffe3b1" stroke-width="2"/><path class="fish-fin" d="M61 37 Q50 22 39 31 Q50 38 58 46" fill="#f1a36d" opacity=".92"/><path d="M64 13 Q70 35 64 68 M86 14 Q91 40 85 67" fill="none" stroke="#fff1bc" stroke-width="7" opacity=".65"/><circle cx="106" cy="33" r="4" fill="#253545"/></svg>`
};

function initSeaLife() {
  const sea = $('seaBoard');
  let layer = sea.querySelector('.marine-layer');
  if (layer) return;
  layer = document.createElement('div');
  layer.className = 'marine-layer';
  layer.setAttribute('aria-hidden', 'true');
  sea.appendChild(layer);
  marineLife.length = 0;
  const mobile = window.matchMedia('(max-width:760px)').matches;
  const plan = mobile
    ? ['fish', 'turtle', 'ray', 'fish']
    : ['fish', 'turtle', 'dolphin', 'ray', 'fish', 'turtle', 'fish'];
  const specs = {
    fish: { size: [40, 58], speed: [14, 22], amp: [5, 10], depth: [.69, .89], tilt: 8 },
    turtle: { size: [66, 86], speed: [8, 14], amp: [4, 8], depth: [.65, .86], tilt: 5 },
    ray: { size: [78, 104], speed: [10, 16], amp: [6, 10], depth: [.62, .84], tilt: 7 },
    dolphin: { size: [88, 116], speed: [15, 23], amp: [6, 11], depth: [.58, .76], tilt: 9 }
  };
  const rr = (a, b) => a + Math.random() * (b - a);
  plan.forEach((kind, i) => {
    const spec = specs[kind];
    const size = rr(spec.size[0], spec.size[1]);
    const dir = (i % 2 === 0) ? 1 : -1;
    const y = sea.clientHeight * rr(spec.depth[0], spec.depth[1]);
    const x = dir > 0 ? rr(-sea.clientWidth * .15, sea.clientWidth * .9) : rr(sea.clientWidth * .1, sea.clientWidth * 1.15);
    const animal = document.createElement('span');
    animal.className = `marine-animal marine-${kind}`;
    animal.innerHTML = `<span class="marine-body">${SEA_LIFE_ART[kind]}</span>`;
    layer.appendChild(animal);
    marineLife.push({
      el: animal, kind, size, dir, x, y,
      speed: rr(spec.speed[0], spec.speed[1]), amp: rr(spec.amp[0], spec.amp[1]),
      phase: Math.random() * Math.PI * 2, sway: rr(.55, 1.05),
      tilt: rr(spec.tilt * .55, spec.tilt), lane: y, laneDrift: rr(3, 11), lanePhase: Math.random() * Math.PI * 2,
      opacity: kind === 'fish' ? rr(.52, .72) : kind === 'dolphin' ? rr(.30, .48) : rr(.38, .6)
    });
  });
  function syncMarineBounds() {
    for (const m of marineLife) {
      m.el.style.width = m.size + 'px';
    }
  }
  syncMarineBounds();
  window.addEventListener('resize', syncMarineBounds, { passive: true });
}

const SEA_LANES = [0.58, 0.66, 0.74, 0.82];
let nextLaneIndex = 0;

function randomPosition(sea) {
  const laneFraction = SEA_LANES[nextLaneIndex % SEA_LANES.length];
  nextLaneIndex++;
  const jitter = (Math.random() - 0.5) * (sea.clientHeight * 0.03);
  return {
    x: -130,
    y: Math.max(sea.clientHeight * 0.55, Math.min(sea.clientHeight * 0.86, sea.clientHeight * laneFraction + jitter))
  };
}

function seaItemKey(item) {
  return [item.id, item.name, item.photo, item.type, item.flower, item.candle, item.color].join('|');
}

function patchDrifterNode(node, item) {
  node.style.setProperty('--glow', /^#[0-9a-f]{6}$/i.test(item.color || '') ? item.color : '#ffc977');
  node.innerHTML = seaItemHTML(item);
  node.onclick = () => displayWish(item);
  node.dataset.itemKey = seaItemKey(item);
}

function seaItemHTML(item) {
  return `<span class="sea-bob"><span class="krathong-art">${artHTML(item, 'sea_' + (item.id || '0'))}</span><span class="sea-name">${esc(item.name || 'ไม่ระบุชื่อ')}</span></span>`;
}

function addDrifter(item) {
  const sea = $('seaBoard');
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'sea-item';
  b.setAttribute('aria-label', 'กระทงของ ' + (item.name || ''));
  patchDrifterNode(b, item);
  sea.appendChild(b);
  const pos = randomPosition(sea);
  const direction = 1;
  const speed = 16 + Math.random() * 9;
  drifters.set(String(item.id), {
    el: b, item, x: pos.x, y: pos.y,
    vx: speed, vy: 0, entrySpeed: 42 + Math.random() * 8,
    entering: true,
    retiring: false,
    direction, flow: Math.random() * Math.PI * 2, turn: 0, phase: Math.random() * 7
  });
  b.style.left = pos.x + 'px';
  b.style.top = pos.y + 'px';
}

function renderSea() {
  $('total').textContent = Number(state.total || state.items.length).toLocaleString('th-TH');
  const sea = $('seaBoard');
  let visible = state.items.slice(0, SEA_SAMPLE_SIZE);
  if (state.ownItem && Date.now() < state.ownUntil && !visible.some(i => String(i.id) === String(state.ownItem.id))) {
    visible = [state.ownItem, ...visible.slice(0, SEA_SAMPLE_SIZE - 1)];
  }
  const ids = new Set(visible.map(x => String(x.id)));
  for (const [id, v] of drifters) {
    if (!ids.has(id)) v.retiring = true;
    else if (v.retiring) v.retiring = false;
  }
  sea.querySelectorAll('.empty').forEach(x => x.remove());
  if (!visible.length) {
    pendingSeaEntries = [];
    nextSeaEntryAt = 0;
    sea.insertAdjacentHTML('beforeend', '<div class="empty">ยังไม่มีกระทง มาเป็นคนแรกกันเถอะ 🪷</div>');
    renderWishTicker();
    return;
  }

  pendingSeaEntries = pendingSeaEntries.filter(x => ids.has(String(x.id)) && !drifters.has(String(x.id)));
  const pendingById = new Map(pendingSeaEntries.map(x => [String(x.id), x]));
  for (const item of visible) {
    const id = String(item.id);
    const old = drifters.get(id);
    if (old) {
      old.item = item;
      old.retiring = false;
      if (old.el.dataset.itemKey !== seaItemKey(item)) patchDrifterNode(old.el, item);
    } else if (pendingById.has(id)) {
      Object.assign(pendingById.get(id), item);
    } else {
      pendingSeaEntries.push(item);
    }
  }
  if (!nextSeaEntryAt && pendingSeaEntries.length) nextSeaEntryAt = performance.now();
  renderWishTicker();
}

function releaseNextSeaEntry(now) {
  if (!pendingSeaEntries.length) { nextSeaEntryAt = 0; return; }
  if (now < nextSeaEntryAt) return;
  const nearEntry = [...drifters.values()].some(d => d.x < 75 && !d.sinking);
  if (nearEntry) {
    nextSeaEntryAt = now + 650;
    return;
  }
  const item = pendingSeaEntries.shift();
  if (item && !drifters.has(String(item.id))) addDrifter(item);
  nextSeaEntryAt = now + SEA_ENTRY_GAP_MS;
}

function animateSea(ts) {
  const dt = Math.min(.05, Math.max(0, (ts - lastFrame) / 1000 || 0)); lastFrame = ts;
  const sea = $('seaBoard');
  if (!document.hidden && sea.clientWidth) {
    const w = sea.clientWidth, h = sea.clientHeight;
    releaseNextSeaEntry(ts);

    for (const m of marineLife) {
      m.phase += dt * m.sway;
      m.lanePhase += dt * (m.sway * .55);
      m.x += m.speed * m.dir * dt;
      const wobble = Math.sin(m.phase * 2.1) * m.amp;
      const drift = Math.sin(m.lanePhase) * m.laneDrift;
      m.y = m.lane + wobble + drift;
      const off = m.size * 1.4;
      if (m.dir > 0 && m.x > w + off) {
        m.x = -off;
        m.lane = h * ((m.kind === 'dolphin' ? 0.58 : 0.64) + Math.random() * (m.kind === 'fish' ? 0.24 : 0.18));
      } else if (m.dir < 0 && m.x < -off) {
        m.x = w + off;
        m.lane = h * ((m.kind === 'dolphin' ? 0.58 : 0.64) + Math.random() * (m.kind === 'fish' ? 0.24 : 0.18));
      }
      const tilt = Math.sin(m.phase * 1.55) * (m.tilt || 6) + (m.dir > 0 ? 1 : -1) * 1.5;
      m.el.style.opacity = m.opacity;
      m.el.style.transform = `translate3d(${m.x}px,${m.y}px,0) scaleX(${m.dir > 0 ? 1 : -1}) rotate(${tilt}deg)`;
    }

    // Anti-bunching (กระทงไม่กอง) - Soft separation & collision avoidance
    const activeDrifters = [];
    for (const d of drifters.values()) {
      if (!d.sinking && !d.respawnPending && d.el.isConnected) {
        activeDrifters.push(d);
      }
    }
    for (let i = 0; i < activeDrifters.length; i++) {
      for (let j = i + 1; j < activeDrifters.length; j++) {
        const d1 = activeDrifters[i];
        const d2 = activeDrifters[j];
        const dx = d2.x - d1.x; // > 0 if d2 is ahead of d1
        const dy = d2.y - d1.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const minX = 142; // safe horizontal distance
        const minY = 46;  // safe vertical distance

        if (absDx < minX && absDy < minY) {
          // Repel apart smoothly
          if (dx > 0) {
            d1.vx = Math.max(12, d1.vx - 8 * dt);
            d2.vx = Math.min(26, d2.vx + 8 * dt);
            d1.x -= 14 * dt;
            d2.x += 14 * dt;
          } else if (dx < 0) {
            d2.vx = Math.max(12, d2.vx - 8 * dt);
            d1.vx = Math.min(26, d1.vx + 8 * dt);
            d2.x -= 14 * dt;
            d1.x += 14 * dt;
          }
          const pushY = (minY - absDy) * 0.45 * dt * 20;
          if (dy >= 0) {
            d1.y = Math.max(h * 0.55, d1.y - pushY);
            d2.y = Math.min(h * 0.86, d2.y + pushY);
          } else {
            d1.y = Math.min(h * 0.86, d1.y + pushY);
            d2.y = Math.max(h * 0.55, d2.y - pushY);
          }
        }
      }
    }

    // Render realistic ocean waves onto canvas
    if (!seaCanvasState.canvas || seaCanvasState.w !== (sea.querySelector('.sea-surface')?.clientWidth || w)) {
      initSeaWavesCanvas();
    }
    if (seaCanvasState.ctx && seaCanvasState.w && seaCanvasState.h) {
      drawRealisticWaves(seaCanvasState.ctx, seaCanvasState.w, seaCanvasState.h, ts * 0.001, dt);
    }

    // Big Wave update (คลื่นใหญ่ลูกพัดกระทง)
    if (!bigWave.active) {
      if (ts >= bigWave.nextAt && w > 0) {
        bigWave.active = true;
        bigWave.x = -260;
        bigWave.speed = Math.max(160, (w + 520) / 4.4);
      }
    } else {
      bigWave.x += bigWave.speed * dt;
      if (bigWave.x > w + 260) {
        bigWave.active = false;
        bigWave.nextAt = ts + 10000 + Math.random() * 15000; // สุ่มคลื่นใหญ่ทุก 10-25 วิ
      }
    }

    for (const [id, v] of drifters) {
      if (v.sinking || v.respawnPending) continue;
      v.phase += dt;
      v.flow += dt;
      v.vx = Math.abs(v.vx) || 18;

      // Small ambient wave motion (คลื่นเล็กระยิบระยับผิวน้ำ)
      const smallWaveHeave = Math.sin(v.phase * 2.2 + v.x * 0.015) * 4.2;
      const smallWaveTilt = Math.cos(v.phase * 1.8 + v.x * 0.012) * 3.2;

      let waveHeave = 0;
      let waveTilt = 0;
      let waveSurge = 0;
      let isSurging = false;

      // Big wave swell & surge interaction (คลื่นใหญ่พัดกระทง)
      if (bigWave.active) {
        const seaYNorm = Math.max(0, Math.min(1, (v.y - h * 0.42) / (h * 0.58)));
        const slant = 140;
        const curveOffset = Math.sin(seaYNorm * Math.PI) * 36;
        const crestX = bigWave.x + seaYNorm * slant + curveOffset;
        const relX = v.x - crestX; // > 0 if ahead of crest, < 0 if behind
        const waveInfluence = bigWave.width;

        if (Math.abs(relX) < waveInfluence) {
          const norm = relX / waveInfluence; // -1 to 1
          // Lift up on the crest (Heave) - UP TO 24px! (เห็นชัดเจน)
          waveHeave = Math.max(0, Math.cos(norm * (Math.PI / 2))) * 24;
          // Pitch / Tilt along the wave slope - UP TO 13.5deg!
          waveTilt = -Math.sin(norm * Math.PI) * 13.5;
          // Push forward on the wave's forward slope (พัดกระทง)
          if (norm < 0.7) {
            waveSurge = (0.7 - norm) * 115 * dt;
            v.x += waveSurge;
            isSurging = true;
          }
        }
      }

      if (isSurging !== v.wasSurging) {
        v.wasSurging = isSurging;
        v.el.classList.toggle('wave-surging', isSurging);
      }

      v.x += (v.entering ? v.entrySpeed : v.vx) * dt;
      if (v.x >= 120) v.entering = false;
      v.y += Math.sin(v.flow * .6) * dt * 1.6;
      v.y = Math.max(h * .55, Math.min(h * .88, v.y));
      const margin = 140;
      if (v.x > w + margin) {
        if (v.retiring) {
          v.el.remove();
          drifters.delete(id);
          continue;
        }
        v.x = -margin;
        const laneFraction = SEA_LANES[Math.floor(Math.random() * SEA_LANES.length)];
        v.y = Math.max(h * 0.55, Math.min(h * 0.86, h * laneFraction + (Math.random() - 0.5) * (h * 0.03)));
      }

      const totalY = v.y - waveHeave + smallWaveHeave;
      const totalTilt = waveTilt + smallWaveTilt;

      v.el.style.left = v.x + 'px';
      v.el.style.top = totalY + 'px';
      if (!v.el.classList.contains('krathong-bitten') && !v.el.classList.contains('krathong-shaken') && !v.el.classList.contains('krathong-survived')) {
        v.el.style.transform = `translate(-50%, -50%) rotate(${totalTilt.toFixed(2)}deg)`;
      }
    }
  }
  requestAnimationFrame(animateSea);
}

function renderWishTicker() {
  const node = $('wishTicker');
  if (!node) return;
  const source = (state.recentItems.length ? state.recentItems : state.items).filter(x => String(x.wish || '').trim());
  if (!source.length) { node.textContent = 'ร่วมลอยกระทงเพื่อแบ่งปันคำอธิษฐานของคุณ'; node.onclick = null; return; }
  state.tickerIndex %= source.length;
  const item = source[state.tickerIndex];
  const wish = String(item.wish).trim();
  const name = String(item.name || 'ผู้ร่วมกิจกรรม').trim();
  const prefix = name + ' : ';
  const maxWishLength = Math.max(25, 115 - prefix.length);
  node.textContent = prefix + (wish.length > maxWishLength ? wish.slice(0, maxWishLength) + '…' : wish);
  node.onclick = () => displayWish(item);
}

async function loadSea() {
  if (loadSea.busy) return;
  loadSea.busy = true;
  let nextItems = [];
  let nextRecent = [];
  let nextTotal = 0;
  let nextMinute = Math.floor(Date.now() / 60000);

  try {
    const out = await request('list', { limit: String(SEA_SAMPLE_SIZE), random: String(SEA_SAMPLE_SIZE) }, 'GET');
    if (out && out.ok) {
      nextItems = out.items || [];
      nextRecent = out.recent || nextItems;
      nextTotal = Number(out.total ?? nextItems.length);
      if (out.minute !== undefined) nextMinute = out.minute;
    }
  } catch (e) {
    console.warn('API list notice (using local/seed data):', e.message);
  }

  // Merge with locally created krathongs and seed krathongs if API is empty or blocked on localhost
  const localKrathongs = getLocalKrathongs();
  if (!nextItems.length) {
    const combined = [...localKrathongs, ...SEED_KRATHONGS];
    nextItems = combined.slice(0, SEA_SAMPLE_SIZE);
    nextRecent = combined.slice(0, 15);
    nextTotal = combined.length;
  } else if (localKrathongs.length) {
    const merged = [...localKrathongs, ...nextItems];
    const uniqueMap = new Map();
    for (const item of merged) {
      if (!uniqueMap.has(String(item.id))) uniqueMap.set(String(item.id), item);
    }
    nextItems = Array.from(uniqueMap.values()).slice(0, SEA_SAMPLE_SIZE);
    nextTotal += localKrathongs.length;
  }

  // If user owns a recently floated krathong, keep it in view
  if (state.ownItem && Date.now() < state.ownUntil) {
    if (!nextItems.some(x => String(x.id) === String(state.ownItem.id))) {
      nextItems = [state.ownItem, ...nextItems].slice(0, SEA_SAMPLE_SIZE);
    }
  }

  const nextKey = nextItems.map(x => String(x.id)).join('|');
  const prevKey = state.items.map(x => String(x.id)).join('|');
  const structureChanged = state.minute !== nextMinute || nextKey !== prevKey || nextItems.some((x, i) => seaItemKey(x) !== seaItemKey(state.items[i] || {}));
  state.items = nextItems;
  state.recentItems = nextRecent.length ? nextRecent : nextItems;
  state.total = nextTotal;
  state.minute = nextMinute;

  // Ensure HR pool is available for lucky draw
  if (!state.hrPool || !state.hrPool.length) {
    state.hrPool = [...localKrathongs, ...SEED_KRATHONGS];
  }

  initSeaDecor();
  if (structureChanged) {
    renderSea();
  } else {
    $('total').textContent = state.total.toLocaleString('th-TH');
    renderWishTicker();
  }

  loadSea.busy = false;
}

$('release').onclick = async () => {
  if (wizardStep !== 4) return;
  const name = $('name').value.trim();
  const employeeId = $('employeeId').value.trim();
  const department = $('dept').value;
  const wish = $('wish').value.trim();

  if (state.photoProcessing) {
    $('status').textContent = 'กำลังประมวลผลรูป โปรดลองอีกครั้ง';
    return;
  }
  if (!name || !department || !wish) {
    $('status').textContent = 'กรุณากรอกชื่อ แผนก และคำอธิษฐาน';
    return;
  }

  // Consent checkbox removed as requested; user can release directly

  const photoPublicBox = $('photoPublic');
  if (state.photo && photoPublicBox && !photoPublicBox.checked) {
    $('status').textContent = '⚠️ โปรดยินยอมให้แสดงรูปบนกระทง หรือกดลบรูปที่เลือก';
    const label = photoPublicBox.closest('label');
    if (label) {
      label.classList.add('consent-alert');
      setTimeout(() => label.classList.remove('consent-alert'), 2000);
    }
    photoPublicBox.focus();
    return;
  }

  setReleaseLoading(true);
  $('status').textContent = 'กำลังปล่อยกระทง...';

  const chosenBase = state.type;
  const chosenCandle = state.candle;
  const fallbackBase = LEGACY_BASE_MAP[chosenBase] || 'orchid';
  const fallbackCandle = LEGACY_CANDLE_MAP[chosenCandle] || 'classic';

  let out = null;
  try {
    out = await request('create', {
      name,
      employeeId,
      department,
      wish,
      type: fallbackBase,
      flower: state.flower,
      candle: fallbackCandle,
      customType: chosenBase,
      customCandle: chosenCandle,
      baseDesign: chosenBase,
      candleDesign: chosenCandle,
      color: state.color,
      photo: state.photo,
      photoPublic: !!state.photo && photoPublicBox.checked,
      consent: true
    });
  } catch (apiErr) {
    console.warn('API create notice (using local fallback mode):', apiErr.message);
    const localId = 'k_' + Date.now();
    out = {
      ok: true,
      item: {
        id: localId,
        name,
        employeeId: employeeId || 'PP-' + Math.floor(100 + Math.random() * 900),
        department,
        wish,
        type: fallbackBase,
        flower: state.flower,
        candle: fallbackCandle,
        customType: chosenBase,
        customCandle: chosenCandle,
        baseDesign: chosenBase,
        candleDesign: chosenCandle,
        color: state.color,
        photo: state.photo,
        photoPublic: !!state.photo && photoPublicBox.checked,
        createdAt: new Date().toISOString()
      }
    };
  }

  try {
    if (out && out.item) {
      saveDesign(out.item.id, chosenBase, chosenCandle);
      saveLocalKrathong(out.item);

      const enhancedItem = {
        ...out.item,
        type: chosenBase,
        candle: chosenCandle,
        baseDesign: chosenBase,
        candleDesign: chosenCandle
      };
      state.ownItem = enhancedItem;
      state.ownUntil = Date.now() + 65000;
      state.total += 1;
      state.recentItems = [enhancedItem, ...state.recentItems.filter(x => String(x.id) !== String(out.item.id))].slice(0, 15);
      state.items = [enhancedItem, ...state.items.filter(x => String(x.id) !== String(out.item.id))].slice(0, SEA_SAMPLE_SIZE);
      state.hrPool = [enhancedItem, ...state.hrPool.filter(x => String(x.id) !== String(out.item.id))];

      $('total').textContent = state.total.toLocaleString('th-TH');
      renderSea();
    }

    $('launch').hidden = false;
    setTimeout(() => { $('launch').hidden = true; }, 2300);
    $('status').textContent = 'กระทงของคุณลอยอยู่ในทะเลแล้ว!';
    setTimeout(() => { resetBuilder(); closeModal('builderModal'); }, 1000);
    localStorage.setItem('phiPhiLastWish', new Date().toISOString());
  } catch (renderErr) {
    console.error('Error rendering released krathong:', renderErr);
    $('status').textContent = renderErr.message;
  } finally {
    setReleaseLoading(false);
  }
};

function resetBuilder() {
  $('builderForm').reset();
  state.type = 'lotus'; state.flower = 'lotus'; state.candle = 'classic'; state.color = '#ffc977'; state.photo = '';
  [['choices', 'lotus'], ['flowerChoices', 'lotus'], ['candleChoices', 'classic']].forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.querySelectorAll('.choice').forEach(x => {
      const selected = x.dataset.value === key;
      x.classList.toggle('active', selected);
      x.setAttribute('aria-pressed', String(selected));
    });
  });
  document.querySelectorAll('.color').forEach((x, i) => x.classList.toggle('active', i === 0));
  $('photoStatus').textContent = 'เลือกรูปจากอัลบั้มหรือถ่ายรูปใหม่ (สูงสุด 12 MB) ระบบจะย่อรูปให้อัตโนมัติ';
  $('clearPhoto').hidden = true; $('status').textContent = ''; if ($('photoPublic')) { $('photoPublic').checked = true; delete $('photoPublic').dataset.touched; } updatePreview(); setWizardStep(1);
}

/* ==========================================================================
   3. HR LUCKY DRAW SYSTEM (Exclude Winners + 26 Steps + Celebration)
   ========================================================================== */
function getWinners() {
  try {
    return JSON.parse(localStorage.getItem('phiPhiWinnerHistory_v1') || '[]');
  } catch (e) {
    return [];
  }
}

function saveWinners(list) {
  try {
    localStorage.setItem('phiPhiWinnerHistory_v1', JSON.stringify(list));
  } catch (e) { }
}

function getItemWinnerStatus(item, winners, seenEmployees) {
  const win = winners.find(w =>
    (w.id && String(w.id) === String(item.id)) ||
    (w.employeeId && item.employeeId && String(w.employeeId).trim().toLowerCase() === String(item.employeeId).trim().toLowerCase()) ||
    (String(w.name).trim().toLowerCase() === String(item.name).trim().toLowerCase() &&
      String(w.department).trim().toLowerCase() === String(item.department).trim().toLowerCase())
  );
  if (win) {
    if (String(win.id) === String(item.id)) {
      return { type: 'winner', label: `รางวัลที่ ${win.prizeRank || 1}`, badgeClass: 'badge-winner' };
    }
    return { type: 'duplicate', label: 'ตัดสิทธิ์ซ้ำ', badgeClass: 'badge-duplicate' };
  }

  const empKey = item.employeeId ? 'emp:' + String(item.employeeId).trim().toLowerCase() : null;
  const nameKey = 'name:' + String(item.name).trim().toLowerCase() + '|' + String(item.department).trim().toLowerCase();

  if ((empKey && seenEmployees.has(empKey)) || seenEmployees.has(nameKey)) {
    return { type: 'duplicate', label: 'ตัดสิทธิ์ซ้ำ', badgeClass: 'badge-duplicate' };
  }
  if (empKey) seenEmployees.add(empKey);
  seenEmployees.add(nameKey);

  return { type: 'eligible', label: 'มีสิทธิ์ลุ้น', badgeClass: 'badge-eligible' };
}

function updateHrViews() {
  const winners = getWinners();
  const selectedDept = $('hrDeptFilter') ? $('hrDeptFilter').value : 'ALL';
  const pool = state.hrPool || [];

  // Compute department stats
  const deptCounts = {};
  for (const item of pool) {
    if (item.department) {
      deptCounts[item.department] = (deptCounts[item.department] || 0) + 1;
    }
  }
  let topDept = '—';
  let topCount = 0;
  for (const [dept, count] of Object.entries(deptCounts)) {
    if (count > topCount) {
      topCount = count;
      topDept = `${dept} (${count})`;
    }
  }
  if ($('hrTopDept')) $('hrTopDept').textContent = topDept;

  // Compute eligible candidates
  const seenEmployees = new Set();
  let eligibleCount = 0;
  for (const item of pool) {
    const status = getItemWinnerStatus(item, winners, seenEmployees);
    if (status.type === 'eligible') {
      if (selectedDept === 'ALL' || item.department === selectedDept) {
        eligibleCount++;
      }
    }
  }

  const totalPoolCount = pool.length;
  if ($('hrEligibleStats')) $('hrEligibleStats').textContent = eligibleCount.toLocaleString('th-TH');
  if ($('hrTotalStats')) $('hrTotalStats').textContent = totalPoolCount.toLocaleString('th-TH');
  if ($('hrWinnersStats')) $('hrWinnersStats').textContent = winners.length.toLocaleString('th-TH');
  if ($('winnerHistoryCount')) $('winnerHistoryCount').textContent = winners.length.toLocaleString('th-TH');

  // Render Participant Table (Columns: สถานะ, เวลา, รหัสพนักงาน, ชื่อ-นามสกุล, แผนก, คำอธิษฐาน)
  const filteredList = pool.filter(item => selectedDept === 'ALL' || item.department === selectedDept);
  if ($('filteredTableCount')) $('filteredTableCount').textContent = filteredList.length.toLocaleString('th-TH');

  const tableSeen = new Set();
  const rowsHtml = filteredList.map(item => {
    const status = getItemWinnerStatus(item, winners, tableSeen);
    const timeStr = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
    return `
      <tr>
        <td><span class="badge ${status.badgeClass}">${status.label}</span></td>
        <td><small>${timeStr}</small></td>
        <td>${esc(item.employeeId || '-')}</td>
        <td><strong>${esc(item.name)}</strong></td>
        <td>${esc(item.department)}</td>
        <td style="max-width:240px;word-break:break-word;">${esc(item.wish)}</td>
      </tr>
    `;
  }).join('');

  if ($('hrList')) {
    $('hrList').innerHTML = rowsHtml || '<tr><td colspan="6" style="text-align:center;padding:18px;color:#9cb1c5;">ไม่มีผู้เข้าร่วมในแผนกนี้</td></tr>';
  }

  // Render Winner History List
  const historyListEl = $('winnerHistoryList');
  if (historyListEl) {
    if (!winners.length) {
      historyListEl.innerHTML = '<div class="history-empty">ยังไม่มีประวัติผู้ได้รับรางวัล</div>';
    } else {
      historyListEl.innerHTML = winners.map((w, idx) => `
        <div class="winner-history-card">
          <div class="history-left">
            <span class="history-rank-pill">รางวัลที่ ${w.prizeRank || (idx + 1)} (${w.wonAtFormatted || (w.wonAt ? new Date(w.wonAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '')})</span>
            <div class="history-info">
              <span class="history-name">${esc(w.name)}</span>
              <span class="history-meta">รหัส: ${esc(w.employeeId || '-')} • แผนก: ${esc(w.department)}</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
}

async function hrLogin() {
  const pin = $('hrPin').value.trim();
  if (!pin) { $('hrLoginStatus').textContent = 'กรุณากรอก PIN'; return; }
  $('hrLoginBtn').disabled = true; $('hrLoginStatus').textContent = 'กำลังตรวจสอบ...';
  try {
    const out = await request('hr_login', { pin });
    state.adminToken = out.token; localStorage.setItem('phiPhiHrToken', out.token);
    $('hrLoginStatus').textContent = 'เข้าสู่ระบบสำเร็จ';
    $('hrLoginBox').hidden = true; $('hrPanel').hidden = false;
    await loadAdminList();
  } catch (e) {
    console.warn('API hr_login notice (using local admin session):', e.message);
    if (pin === '1234' || pin === '8888' || pin.length >= 4) {
      state.adminToken = 'local_admin_' + Date.now();
      localStorage.setItem('phiPhiHrToken', state.adminToken);
      $('hrLoginStatus').textContent = 'เข้าสู่ระบบสำเร็จ';
      $('hrLoginBox').hidden = true; $('hrPanel').hidden = false;
      const localKrathongs = getLocalKrathongs();
      state.hrPool = [...localKrathongs, ...SEED_KRATHONGS];
      updateHrViews();
    } else {
      $('hrLoginStatus').textContent = 'รหัส PIN ไม่ถูกต้อง (ทดสอบ PIN: 1234)';
    }
  } finally {
    $('hrLoginBtn').disabled = false;
  }
}

async function loadAdminList() {
  if (!state.adminToken) return;
  try {
    const out = await request('admin_list', { token: state.adminToken });
    if (out && out.items) {
      state.hrPool = out.items;
    }
  } catch (e) {
    console.warn('API admin_list notice (using local pool):', e.message);
    const localKrathongs = getLocalKrathongs();
    state.hrPool = [...localKrathongs, ...SEED_KRATHONGS];
  }
  updateHrViews();
}

function shootConfetti() {
  if (typeof window.confetti === 'function') {
    window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => {
      window.confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.65 } });
      window.confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.65 } });
    }, 250);
    return;
  }
  const colors = ['#ffd700', '#ff4081', '#00e676', '#00e5ff', '#ff9100', '#ffffff'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.style.cssText = `position:fixed;z-index:9999;width:8px;height:8px;background:${colors[i % colors.length]};left:${50 + (Math.random() - 0.5) * 40}%;top:50%;border-radius:2px;pointer-events:none;transform:scale(${0.5 + Math.random()});transition:all 1s ease-out;`;
    document.body.appendChild(p);
    const tx = (Math.random() - 0.5) * 400;
    const ty = (Math.random() - 0.8) * 350;
    setTimeout(() => {
      p.style.transform = `translate(${tx}px, ${ty}px) rotate(${Math.random() * 720}deg)`;
      p.style.opacity = '0';
    }, 20);
    setTimeout(() => p.remove(), 1100);
  }
}

function showWinnerCelebration(winner, rank) {
  $('celebrationPrizeRank').textContent = `รางวัลที่ ${rank} • CONGRATULATIONS`;
  $('celebrationName').textContent = winner.name || 'ผู้โชคดี';
  $('celebrationEmpId').textContent = `รหัส: ${winner.employeeId || '-'}`;
  $('celebrationDept').textContent = `แผนก: ${winner.department || '-'}`;
  $('celebrationWish').textContent = `“${winner.wish || 'ขอให้มีความสุขตลอดปี'}”`;
  $('celebrationKrathong').innerHTML = `<div class="krathong-art">${artHTML(winner, 'celeb_' + (winner.id || 'draw'))}</div>`;

  openModal('celebrationModal');
  shootConfetti();
}

function renderRollingWinner(item, step, totalSteps, final = false) {
  const box = $('winnerBox');
  box.classList.remove('emptywinner');
  box.classList.toggle('drawing', !final);
  if (!final) {
    box.classList.remove('rolling-shake');
    void box.offsetWidth;
    box.classList.add('rolling-shake');
  } else {
    box.classList.remove('rolling-shake');
  }

  box.innerHTML = `
    <div class="winner-tag">${final ? 'ผู้ได้รับรางวัล' : `กำลังสุ่มรางวัล... (${step + 1}/${totalSteps})`}</div>
    <div style="font-size:75px;margin:8px auto;display:flex;justify-content:center;"><div class="krathong-art">${artHTML(item, 'roll_' + step)}</div></div>
    <h4>${esc(item.name || '')}</h4>
    <p>${esc(item.department || '')}</p>
    ${final ? `<small>รหัสพนักงาน: ${esc(item.employeeId || '-')}</small><div class="winner-wish">“${esc(item.wish || '')}”</div>` : '<div class="winner-wish" style="opacity:0.8;">กำลังหมุนรายชื่อผู้มีสิทธิ์ลุ้นรางวัล...</div>'}
  `;
}

async function runLuckyAnimation(finalWinner, eligiblePool) {
  const steps = 26;
  const pool = (eligiblePool && eligiblePool.length ? eligiblePool : [finalWinner]);
  for (let i = 0; i < steps; i++) {
    const pick = (i === steps - 1) ? finalWinner : pool[Math.floor(Math.random() * pool.length)];
    renderRollingWinner(pick, i, steps, i === steps - 1);
    const progress = i / (steps - 1);
    const delay = 40 + Math.pow(progress, 2.2) * 360;
    await sleep(delay);
  }
}

async function drawWinner() {
  const btn = $('drawBtn');
  btn.disabled = true;
  try {
    if (!state.hrPool.length) await loadAdminList();
    const winners = getWinners();
    const selectedDept = $('hrDeptFilter') ? $('hrDeptFilter').value : 'ALL';

    const seenEmployees = new Set();
    const eligiblePool = [];
    for (const item of state.hrPool) {
      if (selectedDept !== 'ALL' && item.department !== selectedDept) continue;
      const status = getItemWinnerStatus(item, winners, seenEmployees);
      if (status.type === 'eligible') {
        eligiblePool.push(item);
      }
    }

    if (!eligiblePool.length) {
      alert(selectedDept === 'ALL'
        ? 'ไม่มีผู้มีสิทธิ์ลุ้นรางวัล (ทุกคนได้รับรางวัลแล้ว หรือยังไม่มีผู้เข้าร่วม)'
        : `ไม่มีผู้มีสิทธิ์ลุ้นรางวัลในแผนก ${selectedDept} (ทุกคนได้รับรางวัลแล้ว หรือยังไม่มีผู้เข้าร่วม)`);
      return;
    }

    const finalWinner = eligiblePool[Math.floor(Math.random() * eligiblePool.length)];
    await runLuckyAnimation(finalWinner, eligiblePool);

    // Call API draw alongside with try/catch
    try {
      if (state.adminToken) {
        await request('draw', { token: state.adminToken });
      }
    } catch (apiErr) {
      console.warn('API draw sync notice:', apiErr.message);
    }

    const prizeRank = winners.length + 1;
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0]; // HH:mm:ss
    const winnerRecord = {
      prizeRank,
      id: finalWinner.id,
      name: finalWinner.name,
      employeeId: finalWinner.employeeId,
      department: finalWinner.department,
      wish: finalWinner.wish,
      photo: finalWinner.photo,
      type: finalWinner.type,
      flower: finalWinner.flower,
      candle: finalWinner.candle,
      color: finalWinner.color,
      wonAt: now.toISOString(),
      wonAtFormatted: timeFormatted
    };
    winners.push(winnerRecord);
    saveWinners(winners);

    updateHrViews();
    showWinnerCelebration(winnerRecord, prizeRank);
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
  }
}

function syncHrUi() {
  if (state.adminToken) {
    $('hrLoginBox').hidden = true; $('hrPanel').hidden = false;
    loadAdminList().catch(() => { logoutHr(); });
  } else {
    $('hrLoginBox').hidden = false; $('hrPanel').hidden = true;
  }
}

function logoutHr() {
  state.adminToken = '';
  localStorage.removeItem('phiPhiHrToken');
  $('hrPin').value = '';
  $('hrLoginStatus').textContent = '';
  syncHrUi();
}

$('hrLoginBtn').onclick = hrLogin;
$('drawBtn').onclick = drawWinner;
$('hrRefresh').onclick = () => loadAdminList().catch(err => alert(err.message));
$('hrLogoutBtn').onclick = logoutHr;
if ($('hrDeptFilter')) $('hrDeptFilter').onchange = updateHrViews;

if ($('clearHistoryBtn')) {
  $('clearHistoryBtn').onclick = () => {
    if (confirm('คุณต้องการล้างประวัติผู้ได้รับรางวัลทั้งหมดเพื่อเริ่มรอบใหม่ใช่หรือไม่?')) {
      saveWinners([]);
      updateHrViews();
      $('winnerBox').classList.add('emptywinner');
      $('winnerBox').classList.remove('drawing', 'rolling-shake');
      $('winnerBox').innerHTML = '<div class="winner-placeholder">กด “สุ่มรางวัล” เพื่อเลือกผู้โชคดี</div>';
    }
  };
}

if ($('fireConfettiBtn')) $('fireConfettiBtn').onclick = shootConfetti;
if ($('celebrationNextBtn')) $('celebrationNextBtn').onclick = () => closeModal('celebrationModal');
if ($('closeCelebration')) $('closeCelebration').onclick = () => closeModal('celebrationModal');
if ($('celebrationModal')) {
  $('celebrationModal').onclick = e => { if (e.target === $('celebrationModal')) closeModal('celebrationModal'); };
}

// === Background Music Controller (BGM) ===
function initMusicPlayer() {
  const audio = $('bgmAudio');
  const btn = $('musicToggleBtn');
  const icon = $('musicIcon');
  const label = $('musicLabel');
  if (!audio || !btn) return;

  audio.volume = 0.45;

  function updateUI(isPlaying) {
    if (isPlaying) {
      btn.classList.add('playing');
      btn.setAttribute('aria-pressed', 'true');
      btn.title = 'คลิกเพื่อปิดเพลง';
      if (icon) icon.textContent = '🎶';
      if (label) label.textContent = 'ปิดเสียงเพลง';
    } else {
      btn.classList.remove('playing');
      btn.setAttribute('aria-pressed', 'false');
      btn.title = 'คลิกเพื่อเปิดเพลง';
      if (icon) icon.textContent = '🎵';
      if (label) label.textContent = 'เปิดเสียงเพลง';
    }
  }

  async function togglePlay() {
    if (audio.paused) {
      try {
        await audio.play();
        updateUI(true);
        localStorage.setItem('loy_bgm_state', 'playing');
      } catch (err) {
        console.warn('Audio play prevented:', err);
      }
    } else {
      audio.pause();
      updateUI(false);
      localStorage.setItem('loy_bgm_state', 'paused');
    }
  }

  btn.onclick = togglePlay;

  // Browser Autoplay Policy:
  // If user hasn't explicitly muted ('paused'), automatically start playing on first user interaction
  const savedState = localStorage.getItem('loy_bgm_state');
  if (savedState !== 'paused') {
    const handleFirstGesture = () => {
      if (audio.paused && localStorage.getItem('loy_bgm_state') !== 'paused') {
        audio.play().then(() => updateUI(true)).catch(() => { });
      }
    };
    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });
  }

  audio.addEventListener('play', () => updateUI(true));
  audio.addEventListener('pause', () => updateUI(false));
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    audio.play().catch(() => { });
  });
}

if ($('photoPublic')) $('photoPublic').onchange = () => { $('photoPublic').dataset.touched = '1'; };
initChoices();
updatePreview();
syncHrUi();
initSeaDecor();
loadSea();
initMusicPlayer();
requestAnimationFrame(animateSea);
setInterval(() => { state.tickerIndex++; renderWishTicker(); }, 8000);
setInterval(() => { if (!document.hidden) loadSea(); }, SEA_REFRESH_MS);
document.addEventListener('visibilitychange', () => { lastFrame = 0; if (!document.hidden) loadSea(); });

/* ===== 4. Marine Predators Actor (ฉลามครีบดำ, ปลากระเบนราหู, ปลานกแก้ว เกาะพีพี) ===== */
(function () {
  const actor = $('sharkActor');
  if (!actor || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sea = $('seaBoard');
  const rig = actor.querySelector('.shark-rig');
  const ring = actor.querySelector('.shark-ring'), drops = actor.querySelector('.shark-drops');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  marker.setAttribute('cx', '61');
  marker.setAttribute('cy', '124');
  marker.setAttribute('r', '1');
  marker.setAttribute('opacity', '0');
  marker.setAttribute('pointer-events', 'none');

  let jaw = actor.querySelector('.shark-jaw');

  // 3 Iconic Marine Species of Koh Phi Phi:
  // 1. ฉลามครีบดำ (Blacktip Reef Shark)
  // 2. ปลากระเบนราหู (Manta Ray / Giant Stingray)
  // 3. ปลานกแก้ว (Phi Phi Parrotfish)
  const PREDATOR_SPECIES = {
    shark: {
      name: 'ฉลามครีบดำ',
      svg: `<svg class="shark-svg" viewBox="0 0 420 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="sharkSkin" x1="0" y1="45" x2="0" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#212f3d" />
            <stop offset=".45" stop-color="#34495e" />
            <stop offset=".66" stop-color="#5d6d7e" />
            <stop offset=".72" stop-color="#eaeded" />
            <stop offset="1" stop-color="#d5dbdb" />
          </linearGradient>
          <linearGradient id="sharkFin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2c3e50" />
            <stop offset="1" stop-color="#4a6572" />
          </linearGradient>
          <linearGradient id="sharkJaw" x1="0" y1="105" x2="0" y2="155" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#dfe8ee" />
            <stop offset="1" stop-color="#b9c8d2" />
          </linearGradient>
          <radialGradient id="sharkMouth" cx=".4" cy=".4" r=".8">
            <stop offset="0" stop-color="#b3394a" />
            <stop offset="1" stop-color="#3d0c16" />
          </radialGradient>
        </defs>
        <g class="shark-tail-fin">
          <path d="M365 90 C378 70 392 40 408 18 C402 52 400 78 396 100 C402 128 408 150 416 188 C392 168 376 146 360 118 Z" fill="url(#sharkFin)" />
          <path d="M400 36 C403 26 406 20 408 18 C402 38 400 50 398 62 Z" fill="#111111" />
        </g>
        <path d="M95 135 C70 126 40 116 12 105 L36 150 L112 152 Z" fill="url(#sharkMouth)" />
        <g class="shark-jaw">
          <path d="M95 134 L16 108 C26 132 58 152 112 152 L116 134 Z" fill="url(#sharkJaw)" />
          <path d="M16.0 108.0L20.0 99.3L23.4 110.6ZM24.2 110.9L28.2 102.2L31.6 113.5ZM32.4 113.8L36.4 105.1L39.8 116.4ZM40.7 116.7L44.7 108.0L48.1 119.3ZM48.9 119.6L52.9 110.9L56.3 122.2ZM57.1 122.4L61.1 113.7L64.5 125.0ZM65.3 125.3L69.3 116.6L72.7 127.9ZM73.6 128.2L77.6 119.5L81.0 130.8ZM81.8 131.1L85.8 122.4L89.2 133.7Z" fill="#fffdf4" />
          <path d="M34 124 C52 136 76 144 100 146" stroke="#9fb1be" stroke-width="1.5" fill="none" opacity=".7" />
        </g>
        <path d="M12 105 C50 70 120 48 196 50 L222 6 C230 30 240 46 258 56 C306 60 346 76 372 92 L368 120 C330 132 280 142 232 150 C186 160 150 156 112 152 L95 135 C70 126 40 116 12 105 Z" fill="url(#sharkSkin)" />
        <g class="shark-dorsal-fin">
          <path d="M190 52 C204 34 214 18 224 2 C228 26 238 44 258 58 Z" fill="url(#sharkFin)" />
          <path d="M214 18 C218 10 221 4 224 2 C226 12 230 22 234 28 Z" fill="#111111" />
        </g>
        <g class="shark-pectoral-fin">
          <path d="M150 136 C168 156 184 182 190 208 C168 194 142 176 120 150 Z" fill="url(#sharkFin)" />
          <path d="M178 194 C184 200 188 205 190 208 C182 202 174 196 168 190 Z" fill="#111111" />
        </g>
        <path d="M16.0 107.0L19.4 118.3L23.4 109.7ZM24.2 110.0L27.6 121.3L31.6 112.7ZM32.4 113.0L35.8 124.3L39.8 115.7ZM40.7 116.0L44.1 127.3L48.1 118.7ZM48.9 119.0L52.3 130.3L56.3 121.7ZM57.1 122.0L60.5 133.3L64.5 124.7ZM65.3 125.0L68.7 136.3L72.7 127.7ZM73.6 128.0L77.0 139.3L81.0 130.7ZM81.8 131.0L85.2 142.3L89.2 133.7Z" fill="#fffdf4" />
        <g stroke="#2a3c4b" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".75">
          <path d="M118 84 C122 98 122 112 118 126" />
          <path d="M128 82 C132 97 132 112 128 128" />
          <path d="M138 81 C142 97 142 112 138 129" />
          <path d="M148 80 C152 96 152 112 148 130" />
          <path d="M158 80 C161 96 161 111 158 130" />
        </g>
        <circle cx="66" cy="94" r="7" fill="#ffca28" />
        <circle cx="66" cy="94" r="4.5" fill="#0d1b2a" />
        <circle cx="64" cy="92" r="1.8" fill="#ffffff" opacity=".95" />
      </svg>`
    },
    ray: {
      name: 'ปลากระเบนราหู',
      svg: `<svg class="shark-svg" viewBox="0 0 420 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="raySkin" x1="0" y1="40" x2="0" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#0d233a" />
            <stop offset=".45" stop-color="#1a3d5e" />
            <stop offset=".7" stop-color="#2a5c86" />
            <stop offset=".85" stop-color="#e0f2f1" />
            <stop offset="1" stop-color="#b2dfdb" />
          </linearGradient>
          <linearGradient id="rayWing" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#102e48" />
            <stop offset="1" stop-color="#27577a" />
          </linearGradient>
          <radialGradient id="rayMouth" cx=".4" cy=".4" r=".8">
            <stop offset="0" stop-color="#880e4f" />
            <stop offset="1" stop-color="#210515" />
          </radialGradient>
        </defs>
        <g class="shark-tail-fin">
          <path d="M340 108 C370 100 395 106 418 118" stroke="#0d233a" stroke-width="4.5" fill="none" stroke-linecap="round" />
          <path d="M340 108 C370 100 395 106 418 118" stroke="#4dd0e1" stroke-width="1.8" fill="none" opacity=".8" />
        </g>
        <path d="M92 134 C72 125 44 116 16 106 L38 148 L108 150 Z" fill="url(#rayMouth)" />
        <g class="shark-jaw">
          <path d="M92 134 L18 108 C26 130 56 150 108 150 L112 134 Z" fill="#b2dfdb" />
          <path d="M22 110 L30 144 M38 114 L46 146 M54 118 L62 148 M70 122 L78 149 M86 126 L94 149" stroke="#004d40" stroke-width="2" opacity=".6" />
        </g>
        <path d="M14 106 C20 72 65 52 140 44 C190 6 240 2 280 20 C230 46 220 62 250 78 C310 82 342 96 360 110 C330 126 270 138 210 146 C160 154 130 154 104 150 L92 134 C68 126 40 116 14 106 Z" fill="url(#raySkin)" />
        <path d="M140 44 C190 6 240 2 280 20 C240 50 200 60 170 64 Z" fill="url(#rayWing)" stroke="#80deea" stroke-width="1.5" opacity=".95" />
        <path d="M130 152 C170 186 210 208 240 216 C205 186 180 166 160 152 Z" fill="url(#rayWing)" stroke="#80deea" stroke-width="1.5" opacity=".95" />
        <g fill="#80deea" opacity=".85">
          <circle cx="160" cy="74" r="3.5" /><circle cx="180" cy="82" r="4" /><circle cx="205" cy="78" r="3" />
          <circle cx="170" cy="98" r="4.5" /><circle cx="195" cy="104" r="5" /><circle cx="220" cy="96" r="3.5" />
          <circle cx="240" cy="106" r="4" /><circle cx="265" cy="102" r="3" /><circle cx="285" cy="108" r="2.8" />
          <circle cx="140" cy="90" r="3" /><circle cx="150" cy="112" r="3.5" />
        </g>
        <path d="M14 106 C8 92 18 84 32 94 C24 100 18 104 14 106 Z" fill="#00b4d8" />
        <circle cx="58" cy="80" r="6" fill="#00e5ff" />
        <circle cx="58" cy="80" r="3.8" fill="#051923" />
        <circle cx="56.5" cy="78.5" r="1.5" fill="#fff" />
      </svg>`
    },
    parrotfish: {
      name: 'ปลานกแก้ว',
      svg: `<svg class="shark-svg" viewBox="0 0 420 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="parrotSkin" x1="0" y1="40" x2="0" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#00838f" />
            <stop offset=".35" stop-color="#00b4d8" />
            <stop offset=".65" stop-color="#00e5ff" />
            <stop offset=".82" stop-color="#ff4081" />
            <stop offset="1" stop-color="#ffd54f" />
          </linearGradient>
          <linearGradient id="parrotFin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ff4081" />
            <stop offset=".6" stop-color="#00e5ff" />
            <stop offset="1" stop-color="#ffd54f" />
          </linearGradient>
          <radialGradient id="parrotMouth" cx=".4" cy=".4" r=".8">
            <stop offset="0" stop-color="#e91e63" />
            <stop offset="1" stop-color="#4a148c" />
          </radialGradient>
          <linearGradient id="beakIvory" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffffff" />
            <stop offset=".6" stop-color="#e0f7fa" />
            <stop offset="1" stop-color="#80deea" />
          </linearGradient>
        </defs>
        <g class="shark-tail-fin">
          <path d="M350 96 C375 60 405 38 418 36 C412 80 408 112 404 126 C410 152 414 186 418 202 C395 190 370 162 346 132 Z" fill="url(#parrotFin)" stroke="#00e5ff" stroke-width="1.8" />
        </g>
        <path d="M90 134 C68 126 42 116 16 106 L36 148 L108 150 Z" fill="url(#parrotMouth)" />
        <g class="shark-jaw">
          <path d="M90 134 L16 108 C26 130 56 150 108 150 L112 134 Z" fill="url(#parrotSkin)" />
          <path d="M16 108 Q 32 112 42 126 Q 30 136 24 130 Z" fill="url(#beakIvory)" stroke="#00acc1" stroke-width="1.5" />
          <path d="M22 110 L28 122 M28 112 L34 124 M34 114 L40 126" stroke="#00838f" stroke-width="1.5" opacity=".7" />
        </g>
        <path d="M16 106 C30 68 85 42 165 44 C210 18 245 16 270 34 C295 44 330 68 356 94 L350 128 C320 142 275 152 225 158 C175 164 140 160 108 150 L90 134 C68 126 42 116 16 106 Z" fill="url(#parrotSkin)" stroke="#80deea" stroke-width="1.5" />
        <path d="M16 106 Q 32 94 48 98 Q 44 114 26 112 Z" fill="url(#beakIvory)" stroke="#00acc1" stroke-width="1.8" />
        <g class="shark-dorsal-fin">
          <path d="M160 44 C190 22 240 16 276 34 C255 42 220 46 185 46 Z" fill="url(#parrotFin)" stroke="#ff4081" stroke-width="1.5" />
        </g>
        <g class="shark-pectoral-fin">
          <path d="M142 134 C162 152 178 178 184 204 C162 190 136 172 115 146 Z" fill="url(#parrotFin)" stroke="#ffd54f" stroke-width="1.5" />
        </g>
        <g stroke="#00e5ff" stroke-width="1.8" fill="none" opacity=".5" stroke-linecap="round">
          <path d="M110 82 Q120 72 130 82 Q140 72 150 82 Q160 72 170 82 Q180 72 190 82" />
          <path d="M100 98 Q110 88 120 98 Q130 88 140 98 Q150 88 160 98 Q170 88 180 98" />
          <path d="M115 114 Q125 104 135 114 Q145 104 155 114 Q165 104 175 114" />
          <path d="M130 130 Q140 120 150 130 Q160 120 170 130" />
        </g>
        <circle cx="68" cy="88" r="9" fill="#ffd600" />
        <circle cx="68" cy="88" r="7" fill="#00e5ff" />
        <circle cx="68" cy="88" r="5" fill="#0d1b2a" />
        <circle cx="66" cy="86" r="2" fill="#ffffff" opacity=".95" />
      </svg>`
    }
  };

  function setupPredator(kind) {
    const spec = PREDATOR_SPECIES[kind] || PREDATOR_SPECIES.shark;
    rig.innerHTML = spec.svg;
    const s = rig.querySelector('.shark-svg');
    if (s) s.appendChild(marker);
    jaw = actor.querySelector('.shark-jaw');
    actor.dataset.creature = kind;
  }

  // Initialize with shark
  setupPredator('shark');

  function alignMouth(mouthX, mouthY) {
    const stage = sea.getBoundingClientRect();
    const actual = marker.getBoundingClientRect();
    if (!actual.width && !actual.height) return;
    const dx = stage.left + mouthX - (actual.left + actual.width / 2);
    const dy = stage.top + mouthY - (actual.top + actual.height / 2);
    actor.style.left = (parseFloat(actor.style.left) + dx) + 'px';
    actor.style.top = (parseFloat(actor.style.top) + dy) + 'px';
  }

  const APPROACH = 2100, BREACH = 500, CHOMP = 720, DRAG = 980, FADE = 420, TOTAL = APPROACH + BREACH + CHOMP + DRAG + FADE;
  let busy = false;

  function getTargetPoint(v) {
    const seaRect = sea.getBoundingClientRect();
    const art = v.el.querySelector('.krathong-art') || v.el;
    const r = art.getBoundingClientRect();
    return {
      x: r.left - seaRect.left + r.width * .53,
      y: r.top - seaRect.top + r.height * .54
    };
  }

  function splash(count) {
    ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
    const sw = parseFloat(actor.style.getPropertyValue('--sw')) || 220;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('i');
      const x = (Math.random() - .55) * sw * .85, up = 28 + Math.random() * sw * .22;
      d.style.left = (sw * .50) + 'px'; d.style.width = d.style.height = (3 + Math.random() * 6) + 'px';
      drops.appendChild(d);
      d.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${x * .7}px,${-up * .72}px) scale(1.05)`, opacity: .95, offset: .42 },
        { transform: `translate(${x}px,${12 + Math.random() * 10}px) scale(.7)`, opacity: 0 }
      ], { duration: 700 + Math.random() * 250, easing: 'ease-out' }).onfinish = () => d.remove();
    }
  }

  // Outcome 1: งับแล้วจมน้ำ (Bite and drag under)
  function sinkKrathong(v) {
    if (v.sinking || !v.el.isConnected) return;
    v.sinking = true;
    v.el.classList.add('krathong-bitten');
    setTimeout(() => { if (v.el.isConnected) v.el.classList.add('krathong-sinking'); }, 160);
    setTimeout(() => {
      if (!v.el.isConnected) return;
      v.el.classList.remove('krathong-bitten', 'krathong-sinking');
      v.el.classList.add('krathong-respawning');
      v.sinking = false;
      v.respawnPending = true;
      const margin = 140;
      v.x = -margin - (Math.random() * 90);
      const laneFraction = SEA_LANES[Math.floor(Math.random() * SEA_LANES.length)];
      v.y = Math.max(sea.clientHeight * 0.55, Math.min(sea.clientHeight * 0.86, sea.clientHeight * laneFraction + (Math.random() - 0.5) * 10));
      v.vx = 14 + Math.random() * 11;
      v.el.style.left = v.x + 'px';
      v.el.style.top = v.y + 'px';
      setTimeout(() => {
        if (!v.el.isConnected) return;
        v.respawnPending = false;
        v.el.classList.remove('krathong-respawning');
      }, 280);
    }, 1680);
  }

  // Outcome 2: งับสะบัดปล่อย (Bite, shake violently and release)
  function shakeAndReleaseKrathong(v) {
    if (v.sinking || v.respawnPending || !v.el.isConnected) return;
    v.shaken = true;
    v.el.classList.add('krathong-bitten', 'krathong-shaken');
    setTimeout(() => {
      if (!v.el.isConnected) return;
      v.shaken = false;
      v.el.classList.remove('krathong-bitten', 'krathong-shaken');
      v.el.classList.add('krathong-survived');
      splash(18);
      // Give gentle forward impulse to resume drifting
      v.vx = 20 + Math.random() * 8;
      setTimeout(() => {
        if (!v.el.isConnected) return;
        v.el.classList.remove('krathong-survived');
      }, 2000);
    }, 1450);
  }

  async function attack() {
    if (busy || document.hidden) return false;
    const W = sea.clientWidth, H = sea.clientHeight;
    const targets = [...drifters.values()].filter(v => v.el.isConnected && !v.sinking && !v.respawnPending && !v.shaken && v.x > W * .20 && v.x < W * .82 && v.y > H * .53 && v.y < H * .88);
    if (!targets.length) return false;
    busy = true;

    // 1. สุ่มปลา 3 ตัว: ฉลามครีบดำ, ปลากระเบนราหู, ปลานกแก้ว
    const speciesList = ['shark', 'ray', 'parrotfish'];
    const chosenKind = speciesList[Math.floor(Math.random() * speciesList.length)];
    setupPredator(chosenKind);

    // 2. สุ่มผลลัพธ์: งับแล้วจมน้ำ (sink) VS งับสะบัดปล่อย (release)
    const outcome = Math.random() < 0.5 ? 'sink' : 'release';

    const target = targets[Math.floor(Math.random() * targets.length)];
    const base = target.el.querySelector('.krathong-art');
    const size = base?.getBoundingClientRect().width || 80;
    const sw = clamp(size * 3.05, 205, 360);
    actor.style.setProperty('--sw', sw + 'px');
    actor.style.setProperty('--flip', '1');
    const waterline = H * .545;
    const initial = getTargetPoint(target);
    const mouthStartX = Math.max(W + sw * .62, initial.x + sw * 1.38);
    const mouthStartY = clamp(initial.y + sw * .64, waterline + sw * .48, H * .95);
    let start = null, biteDone = false, burst = false;

    return await new Promise(resolve => {
      function frame(now) {
        if (start === null) start = now;
        const t = now - start;
        if (t >= TOTAL || !target.el.isConnected) {
          actor.classList.remove('on', 'is-biting', 'is-diving');
          actor.style.opacity = '0';
          if (jaw) jaw.style.transform = '';
          rig.style.transform = '';
          busy = false;
          resolve(true);
          return;
        }
        const point = getTargetPoint(target);
        const biteX = point.x + 2;
        const biteY = point.y + 1;
        const dragX = biteX - sw * .34;
        const dragY = outcome === 'sink'
          ? clamp(point.y + sw * .78, waterline + sw * .30, H * .98)
          : clamp(point.y + sw * .18, waterline, H * .92);

        let mouthX = biteX, mouthY = biteY, bodyDip = .22, rot = 0, jawDeg = 0, opacity = 1;
        const swim = Math.sin(t / 235), kick = Math.sin(t / 160);

        if (t < APPROACH) {
          const z = smooth(t / APPROACH);
          mouthX = mouthStartX + (biteX - mouthStartX) * z;
          mouthY = mouthStartY + (biteY + 12 - mouthStartY) * z;
          bodyDip = .34 + swim * .065;
          rot = -10 + z * 18 + swim * 2.2;
          opacity = clamp(t / 320, 0, 1);
        } else if (t < APPROACH + BREACH) {
          const z = smooth((t - APPROACH) / BREACH);
          mouthX = biteX + Math.sin(z * Math.PI) * 4;
          mouthY = (biteY + 8) + (biteY - (biteY + 8)) * z;
          bodyDip = .28 - z * .55 + swim * .028;
          rot = 10 + z * 18 + swim * 1.8;
          jawDeg = -12 - z * 30;
          if (!burst) { burst = true; splash(18); }
        } else if (t < APPROACH + BREACH + CHOMP) {
          const z = (t - APPROACH - BREACH) / CHOMP;
          mouthX = biteX - z * 4;
          mouthY = biteY + Math.sin(z * Math.PI) * 2;
          bodyDip = -.26 + Math.sin(z * Math.PI * 2.8) * .045;
          rot = 28 + Math.sin(z * Math.PI * 3.1) * 3.6 + swim * .7;
          jawDeg = -40 + Math.sin(z * Math.PI * 4.2) * 15;
          if (z > .18 && !biteDone) {
            biteDone = true;
            if (outcome === 'sink') {
              splash(24);
              sinkKrathong(target);
            } else {
              splash(20);
              shakeAndReleaseKrathong(target);
            }
          }
        } else if (t < APPROACH + BREACH + CHOMP + DRAG) {
          const z = smooth((t - APPROACH - BREACH - CHOMP) / DRAG);
          if (outcome === 'sink') {
            mouthX = biteX + (dragX - biteX) * z;
            mouthY = biteY + (dragY - biteY) * z;
            bodyDip = -.2 + z * .72 + swim * .02;
            rot = 24 - z * 24;
            jawDeg = -7 + z * 7;
          } else {
            // Outcome 'release': violent surface thrashing & shaking!
            mouthX = biteX + Math.sin(z * Math.PI * 4) * (sw * .12);
            mouthY = biteY + Math.sin(z * Math.PI * 3) * 6;
            bodyDip = -.15 + Math.sin(z * Math.PI * 4) * .12;
            rot = 20 + Math.sin(z * Math.PI * 5) * 14;
            jawDeg = -15 + Math.sin(z * Math.PI * 6) * 12;
          }
        } else {
          // FADE phase: creature dives away
          const z = smooth((t - APPROACH - BREACH - CHOMP - DRAG) / FADE);
          mouthX = dragX - sw * .1 * z;
          mouthY = dragY + sw * .14 * z;
          bodyDip = .5 + z * .25;
          rot = -3 - z * 10;
          opacity = 1 - z;
        }

        actor.style.left = (mouthX - sw * .60) + 'px';
        actor.style.top = (mouthY - sw * 1.22) + 'px';
        actor.style.opacity = opacity;
        actor.classList.add('on');
        actor.classList.toggle('is-biting', t >= APPROACH && t < APPROACH + BREACH + CHOMP);
        actor.classList.toggle('is-diving', t >= APPROACH + BREACH + CHOMP);
        actor.style.setProperty('--swim-kick', kick.toFixed(3));
        rig.style.transform = `translateY(${bodyDip * sw * .55}px) rotate(${rot}deg)`;
        if (jaw) jaw.style.transform = `rotate(${jawDeg}deg)`;
        alignMouth(mouthX, mouthY);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  async function loop() {
    // Initial wait on page load: 16-24 seconds
    await sleep(16000 + Math.random() * 8000);
    while (true) {
      const ok = await attack();
      // Requirement 3: สุ่มปลามากัดกระทงทุก 30-45 วิ
      const waitTime = ok ? (30000 + Math.random() * 15000) : 4000;
      await sleep(waitTime);
    }
  }
  loop();
})();
