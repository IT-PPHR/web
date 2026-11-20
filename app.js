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
  items: [], recentItems: [], total: 0, minute: null, ownItem: null, ownUntil: 0, tickerIndex: 0, adminToken: ((token) => token && !token.startsWith('local_admin_') ? token : '')(localStorage.getItem('phiPhiHrToken') || ''), hrPool: [], serverWinners: [], winnerHistoryReady: false, renderToken: 0
};

const $ = id => document.getElementById(id);
const API = (window.APP_CONFIG || {}).API_URL || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safePhoto = s => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(s || '')) ? s : '';
const drifters = new Map();
const completedKrathongs = new Set();
const recycledFromShark = [];

let pendingSeaEntries = [];
let nextSeaEntryAt = 0;
const SEA_ENTRY_GAP_MS = 1600;
// Mobile optimization: one compositor transform per krathong rather than layout-changing left/top.
const SEA_SAMPLE_SIZE = 8;
const getSeaSampleSize = () => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 6 : 8);
const SEA_REFRESH_MS = 45000;
const marineLife = [];
let lastFrame = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getAllAvailableKrathongs() {
  // Real submissions only: in-memory items returned by the API or just saved successfully.
  const apiItems = Array.isArray(state.items) ? state.items : [];
  const uniqueMap = new Map();
  for (const item of apiItems) {
    if (item && item.id && !uniqueMap.has(String(item.id))) {
      uniqueMap.set(String(item.id), item);
    }
  }
  return Array.from(uniqueMap.values());
}

function getNextStreamKrathong() {
  // 1. Shark recycle queue: only krathongs dragged underwater by the shark re-enter the sea
  if (recycledFromShark.length > 0) {
    return recycledFromShark.shift();
  }

  // 2. Fresh unshown krathongs from pool that haven't finished their voyage
  const all = getAllAvailableKrathongs();
  const unshown = all.filter(item => {
    const id = String(item.id);
    return !completedKrathongs.has(id) &&
           !drifters.has(id) &&
           !pendingSeaEntries.some(p => String(p.id) === id);
  });

  if (unshown.length > 0) {
    return unshown[Math.floor(Math.random() * unshown.length)];
  }

  // 3. Grand cycle fallback: only if every single krathong has drifted to the horizon
  if (completedKrathongs.size > 0 && drifters.size < getSeaSampleSize()) {
    completedKrathongs.clear();
    const fallback = all.filter(item => !drifters.has(String(item.id)) && !pendingSeaEntries.some(p => String(p.id) === String(item.id)));
    if (fallback.length > 0) {
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
  }

  return null;
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
  } catch (e) {}
}

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

// V60: anchor the builder's name tag to the actual SVG hull, not the smaller
// #krathongPreview container. This also works when the responsive size changes.
let previewNamePositionQueued = false;
function positionPreviewName() {
  if (previewNamePositionQueued) return;
  previewNamePositionQueued = true;
  requestAnimationFrame(() => {
    previewNamePositionQueued = false;
    const sky = document.querySelector('#builderModal .preview-sky');
    const svg = document.querySelector('#builderModal #previewArt svg.krathong-svg');
    const label = $('previewName');
    if (!sky || !svg || !label || !sky.clientWidth) return;
    const skyRect = sky.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    if (!svgRect.width || !svgRect.height) return;

    // SVG viewBox: 200 x 165; waterline/hull near y=140-150.
    // Position directly beneath that hull and center on SVG x=100.
    const centerX = svgRect.left - skyRect.left + svgRect.width * 0.5;
    const preferredTop = svgRect.top - skyRect.top + svgRect.height * (149 / 165) + 8;
    const halfWidth = Math.min(label.offsetWidth, sky.clientWidth - 12) / 2;
    const safeX = Math.max(halfWidth + 6, Math.min(sky.clientWidth - halfWidth - 6, centerX));
    const labelHeight = Math.max(label.offsetHeight || 0, 26);
    const minTop = 16;
    const maxTop = Math.max(minTop, sky.clientHeight - labelHeight - 16);
    const safeTop = Math.max(minTop, Math.min(maxTop, preferredTop));
    label.style.left = safeX + 'px';
    label.style.top = safeTop + 'px';
  });
}
window.addEventListener('resize', positionPreviewName, { passive: true });

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
  positionPreviewName();
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

$('openBuilder').onclick = () => {
  setWizardStep(1);
  openModal('builderModal');
  // Re-render after the modal becomes visible so the preview-name anchor uses
  // real dimensions immediately on first open (same look as after selecting a base).
  requestAnimationFrame(() => {
    updatePreview();
    positionPreviewName();
    setTimeout(positionPreviewName, 60);
    setTimeout(positionPreviewName, 180);
  });
};
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

// All mutations use a bounded fetch. Never retry an ambiguous create/draw unless
// the server supports idempotency for the SAME requestId (see Dev 2 handoff).
const IDEMPOTENCY_READY = (window.APP_CONFIG || {}).IDEMPOTENCY_READY === true;
const REQUEST_TIMEOUT_MS = 18000;
let releaseInProgress = false;
function makeRequestId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (!window.crypto || !crypto.getRandomValues) throw Error('เบราว์เซอร์ไม่รองรับการสร้างรหัสคำขอที่ปลอดภัย');
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function request(action, data = {}, method = 'POST', retries = 1) {
  if (!API || API.includes('REPLACE-WITH')) throw Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js');
  const isMutation = method !== 'GET';
  const safeToRetry = !isMutation || (action === 'create' && IDEMPOTENCY_READY && !!data.requestId);
  const maxRetries = safeToRetry ? Math.min(2, Math.max(0, retries)) : 0;
  const base = API.replace(/\/$/, '');
  const url = method === 'GET' ? base + '?' + new URLSearchParams({ action, ...data }) : base;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let transient = false;
    try {
      const resp = await fetch(url, {
        method,
        headers: isMutation ? { 'Content-Type': 'application/json' } : {},
        body: isMutation ? JSON.stringify({ action, ...data }) : undefined,
        signal: controller.signal,
        cache: 'no-store'
      });
      transient = resp.status === 429 || resp.status >= 500;
      let out;
      try { out = await resp.json(); } catch { throw Error('API ตอบกลับไม่ใช่ JSON'); }
      if (!resp.ok || !out || out.ok !== true) {
        const e = new Error((out && out.error) || `API Error (${resp.status})`);
        e.transient = transient;
        throw e;
      }
      return out;
    } catch (e) {
      lastError = e;
      if (attempt >= maxRetries || (e.transient === false)) break;
      // Network/timeout failures can have reached the server. Reuse requestId.
      await sleep(Math.min(2200, 450 * (2 ** attempt)) + Math.random() * 250);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || Error('เชื่อมต่อ API ไม่สำเร็จ');
}
async function fingerprintSubmission(payload) {
  if (!window.crypto || !window.crypto.subtle) throw Error('ต้องเข้าเว็บไซต์ผ่าน HTTPS เพื่อบันทึกกระทงอย่างปลอดภัย');
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const SUBMISSION_KEY = 'phiPhiPendingCreate_v1';
function stableSubmissionId(fingerprint) {
  try {
    const previous = JSON.parse(sessionStorage.getItem(SUBMISSION_KEY) || 'null');
    if (previous && previous.fingerprint === fingerprint && previous.requestId) return previous.requestId;
  } catch {}
  const requestId = makeRequestId();
  try { sessionStorage.setItem(SUBMISSION_KEY, JSON.stringify({ fingerprint, requestId })); } catch {}
  return requestId;
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

  const lowPowerScene = window.matchMedia('(max-width:760px), (prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < (lowPowerScene ? 0 : 3); i++) {
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

  const waterCloudsLayer = $('waterCloudsLayer');
  if (waterCloudsLayer) waterCloudsLayer.innerHTML = '';

  const cloudConfigs = [
    { top: 27, scale: 1.05, duration: 38, delay: -8, dir: 'right' },
    { top: 9,  scale: 0.82, duration: 52, delay: -24, dir: 'left' },
    { top: 33, scale: 0.96, duration: 44, delay: -29, dir: 'left' },
    { top: 48, scale: 0.74, duration: 55, delay: -14, dir: 'right' },
    { top: 62, scale: 0.65, duration: 62, delay: -36, dir: 'right' }
  ];

  (lowPowerScene ? cloudConfigs.slice(0, 1) : cloudConfigs).forEach((cfg) => {
    const isRight = cfg.dir === 'right';

    const cloud = document.createElement('div');
    cloud.className = 'v7-cloud ' + (isRight ? 'v7-cloud-right' : 'v7-cloud-left');
    cloud.style.top = cfg.top + '%';
    cloud.style.setProperty('--cloud-scale', cfg.scale);
    cloud.style.setProperty('--cloud-duration', cfg.duration + 's');
    cloud.style.setProperty('--cloud-delay', cfg.delay + 's');
    sky.appendChild(cloud);

    if (waterCloudsLayer) {
      const waterCloud = document.createElement('div');
      waterCloud.className = 'water-cloud-mirror ' + (isRight ? 'water-cloud-right' : 'water-cloud-left');
      waterCloud.style.top = (5 + (cfg.top * 0.72)).toFixed(1) + '%';
      waterCloud.style.setProperty('--cloud-scale', (cfg.scale * 0.95).toFixed(2));
      waterCloud.style.setProperty('--cloud-duration', cfg.duration + 's');
      waterCloud.style.setProperty('--cloud-delay', cfg.delay + 's');
      waterCloudsLayer.appendChild(waterCloud);
    }
  });

  for (let i = 0; i < (lowPowerScene ? 1 : 9); i++) {
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

  // Dynamic Moon Occlusion: เมื่อเมฆเคลื่อนผ่านบดบังดวงจันทร์ ลำแสงสะท้อนบนน้ำจะหรี่แสงลงอย่างนุ่มนวล
  const moon = $('seaMoon') || sea.querySelector('.moon');
  const beam = $('moonlightWaterBeam');
  if (moon && beam) {
    const clouds = sky.querySelectorAll('.v7-cloud');
    const checkMoonOcclusion = () => {
      if (!moon.isConnected || !beam.isConnected) return;
      const mRect = moon.getBoundingClientRect();
      if (!mRect || mRect.width === 0) return;

      let isCovered = false;
      for (let i = 0; i < clouds.length; i++) {
        const cRect = clouds[i].getBoundingClientRect();
        const xOverlap = Math.max(0, Math.min(cRect.right, mRect.right) - Math.max(cRect.left, mRect.left));
        const yOverlap = Math.max(0, Math.min(cRect.bottom, mRect.bottom) - Math.max(cRect.top, mRect.top));
        if (xOverlap > mRect.width * 0.22 && yOverlap > mRect.height * 0.22) {
          isCovered = true;
          break;
        }
      }

      if (isCovered) {
        beam.classList.add('cloud-occluded');
        moon.classList.add('cloud-dimmed');
      } else {
        beam.classList.remove('cloud-occluded');
        moon.classList.remove('cloud-dimmed');
      }
    };

    setInterval(() => { if (!document.hidden && !lowPowerScene) checkMoonOcclusion(); }, 1200);
  }
  window.addEventListener('resize', () => {
    for (const lantern of sky.querySelectorAll('.v7-lantern'))
      lantern.style.setProperty('--lantern-travel', (sky.clientHeight + 75) + 'px');
  }, { passive: true });
  initSeaLife();
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
    ? ['fish', 'turtle']
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

// Level 2: Smart Dynamic Lane Allocation (กระจายลงเลนที่โล่งที่สุดเสมอ)
function allocateBestLane(sea) {
  const H = sea.clientHeight;
  const laneScores = SEA_LANES.map(fraction => {
    const laneY = H * fraction;
    let count = 0;
    let entryCrowding = 0;
    for (const d of drifters.values()) {
      if (d.sinking || d.respawnPending || !d.el.isConnected) continue;
      if (Math.abs(d.y - laneY) < H * 0.055) {
        count++;
        if (d.x < 280) entryCrowding += (280 - d.x) / 280;
      }
    }
    return { fraction, score: count * 1.5 + entryCrowding * 2.5 + Math.random() * 0.35 };
  });

  laneScores.sort((a, b) => a.score - b.score);
  const bestFraction = laneScores[0].fraction;
  const jitter = (Math.random() - 0.5) * (H * 0.022);
  return Math.max(H * 0.55, Math.min(H * 0.86, H * bestFraction + jitter));
}

function randomPosition(sea) {
  return {
    x: -130,
    y: allocateBestLane(sea)
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
  node.dataset.itemId = String(item.id || '');
}

function seaItemHTML(item) {
  return `<span class="sea-bob"><span class="krathong-candle-glow" aria-hidden="true"></span><span class="krathong-ripple" aria-hidden="true"></span><span class="krathong-art">${artHTML(item, 'sea_' + (item.id || '0'))}</span><span class="sea-name">${esc(item.name || 'ไม่ระบุชื่อ')}</span></span>`;
}

function addDrifter(item, startX = null, startY = null) {
  const sea = $('seaBoard');
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'sea-item';
  b.setAttribute('aria-label', 'กระทงของ ' + (item.name || ''));
  patchDrifterNode(b, item);
  sea.appendChild(b);
  const pos = (startX !== null && startY !== null) ? { x: startX, y: startY } : randomPosition(sea);
  const direction = 1;
  const speed = 16 + Math.random() * 9;
  drifters.set(String(item.id), {
    el: b, item, x: pos.x, y: pos.y,
    vx: speed, vy: 0, entrySpeed: startX !== null ? speed : (42 + Math.random() * 8),
    entering: startX === null,
    retiring: false,
    direction, flow: Math.random() * Math.PI * 2, turn: 0, phase: Math.random() * 7
  });
  b.style.left = '0px';
  b.style.top = '0px';
  b.dataset.seaX = String(pos.x);
  b.dataset.seaY = String(pos.y);
  b.style.transform = `translate3d(${pos.x}px,${pos.y}px,0) translate(-50%,-50%)`;
  return b;
}

function launchKrathongToSea(item) {
  const sea = $('seaBoard');
  if (!sea) return;

  completedKrathongs.delete(String(item.id));
  const existing = drifters.get(String(item.id));
  if (existing) {
    if (existing.el && existing.el.isConnected) existing.el.remove();
    drifters.delete(String(item.id));
  }

  pendingSeaEntries = pendingSeaEntries.filter(x => String(x.id) !== String(item.id));

  const spawnX = Math.min(180, Math.floor(sea.clientWidth * 0.16));
  const spawnY = Math.floor(sea.clientHeight * 0.74);
  const el = addDrifter(item, spawnX, spawnY);
  if (el) {
    el.classList.add('just-released');
    setTimeout(() => { if (el.isConnected) el.classList.remove('just-released'); }, 2000);
  }
}

function renderSea() {
  const totalCount = Number(state.total || getAllAvailableKrathongs().length);
  $('total').textContent = totalCount.toLocaleString('th-TH');
  const sea = $('seaBoard');
  sea.querySelectorAll('.empty').forEach(x => x.remove());

  const targetCount = getSeaSampleSize();
  const currentCount = drifters.size + pendingSeaEntries.length;
  const needed = Math.max(0, targetCount - currentCount);

  for (let i = 0; i < needed; i++) {
    const nextItem = getNextStreamKrathong();
    if (nextItem && !drifters.has(String(nextItem.id)) && !pendingSeaEntries.some(p => String(p.id) === String(nextItem.id))) {
      pendingSeaEntries.push(nextItem);
    }
  }

  if (!nextSeaEntryAt && pendingSeaEntries.length) nextSeaEntryAt = performance.now();
  renderWishTicker();
}

window.renderSea = renderSea;

window.sinkDrifterItem = function(itemId) {
  const idStr = String(itemId);
  const d = drifters.get(idStr);
  let sunkItem = null;
  if (d) {
    d.sinking = true;
    sunkItem = d.item;
    if (d.el && d.el.isConnected) d.el.remove();
    drifters.delete(idStr);
  }
  if (!sunkItem) {
    const all = getAllAvailableKrathongs();
    sunkItem = all.find(x => String(x.id) === idStr);
  }
  if (sunkItem) {
    // Sunk by shark: this is the ONLY condition where a krathong loops/re-enters the sea!
    completedKrathongs.delete(idStr);
    recycledFromShark.push(sunkItem);
  }

  // Queue next krathong to replace sunken one
  const nextItem = getNextStreamKrathong();
  if (nextItem && !pendingSeaEntries.some(p => String(p.id) === String(nextItem.id))) {
    pendingSeaEntries.push(nextItem);
    if (!nextSeaEntryAt) nextSeaEntryAt = performance.now();
  }
  renderWishTicker();
};

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

const MOBILE_LOW_POWER = window.matchMedia('(max-width:760px)').matches;
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEVICE_MEMORY = Number(navigator.deviceMemory || 0);
const LOW_END_MOBILE = MOBILE_LOW_POWER && (DEVICE_MEMORY > 0 && DEVICE_MEMORY <= 3 || (navigator.hardwareConcurrency || 8) <= 4);
const MOTION_FPS = REDUCE_MOTION ? 20 : (LOW_END_MOBILE ? 24 : (MOBILE_LOW_POWER ? 30 : 60));
let lastPaintFrame = 0;
let smoothedFrameMs = 1000 / MOTION_FPS;
let performanceDegrade = 0;
let frameSamples = 0;
function setSceneQuality(low) {
  document.documentElement.classList.toggle('sea-low-power', low);
  const marine = $('seaBoard')?.querySelectorAll('.marine-animal') || [];
  marine.forEach((el, i) => { el.style.display = low && i > 2 ? 'none' : ''; });
}
setSceneQuality(LOW_END_MOBILE || REDUCE_MOTION);

function animateSea(ts) {
  const fpsInterval = 1000 / MOTION_FPS;
  if (!document.hidden && lastPaintFrame && ts - lastPaintFrame < fpsInterval) {
    requestAnimationFrame(animateSea);
    return;
  }
  const deltaMs = lastFrame ? Math.max(0, ts - lastFrame) : fpsInterval;
  lastPaintFrame = ts;
  const dt = Math.min(.06, deltaMs / 1000);
  lastFrame = ts;
  // Only change detail level after sustained slow frames; never oscillate on transient GC pauses.
  if (MOBILE_LOW_POWER && !REDUCE_MOTION && !document.hidden) {
    smoothedFrameMs += (Math.min(deltaMs, 160) - smoothedFrameMs) * .025;
    if (++frameSamples >= 150) {
      frameSamples = 0;
      if (smoothedFrameMs > 48) performanceDegrade = Math.min(2, performanceDegrade + 1);
      else if (smoothedFrameMs < 37) performanceDegrade = Math.max(0, performanceDegrade - 1);
      setSceneQuality(LOW_END_MOBILE || performanceDegrade > 0);
    }
  }
  const sea = $('seaBoard');
  if (!document.hidden && sea.clientWidth) {
    const w = sea.clientWidth, h = sea.clientHeight;
    releaseNextSeaEntry(ts);

    for (const m of marineLife) {
      if (m.el.style.display === 'none') continue;
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

    // Soft separation with frame-rate independent damping. No abrupt vertical jumps.
    const activeDrifters = Array.from(drifters.values()).filter(d =>
      !d.sinking && !d.respawnPending && d.el.isConnected && d.el.dataset.chomped !== 'true');
    for (let i = 0; i < activeDrifters.length; i++) {
      for (let j = i + 1; j < activeDrifters.length; j++) {
        const a = activeDrifters[i], b = activeDrifters[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const distX = Math.abs(dx), distY = Math.abs(dy);
        if (distX > 188 || distY > 66) continue;
        const proximity = Math.max(0, 1 - distX / 188) * Math.max(0, 1 - distY / 66);
        const pushX = Math.min(9 * dt, 11 * proximity * dt);
        const signX = dx >= 0 ? 1 : -1;
        a.x -= signX * pushX;
        b.x += signX * pushX;
        // Smoothly drift apart in Y only when genuinely overlapping.
        if (distX < 130 && distY < 45) {
          const signY = dy >= 0 ? 1 : -1;
          const pushY = Math.min(8 * dt, (45 - distY) * .18 * dt);
          a.y -= signY * pushY;
          b.y += signY * pushY;
        }
      }
    }

    for (const [id, v] of drifters) {
      if (v.el && v.el.dataset.chomped === 'true') {
        // Paused during shark bite attack so the chomp animation plays cleanly in place
        continue;
      }
      v.phase += dt;
      v.flow += dt;
      v.vx = Math.abs(v.vx) || 18;

      // V55: smooth approach speed from the left edge to the normal drift speed.
      // Smoothstep has zero slope at either end; there is no abrupt speed drop at x=120.
      if (v.entering) {
        const entryStartX = -130;
        const entryEndX = 120;
        const progress = Math.max(0, Math.min(1, (v.x - entryStartX) / (entryEndX - entryStartX)));
        const eased = progress * progress * (3 - 2 * progress);
        const speed = v.entrySpeed + (v.vx - v.entrySpeed) * eased;
        v.x += speed * dt;
        if (v.x >= entryEndX) {
          v.entering = false;
          // Do not snap the position; subsequent frames use the same terminal speed.
        }
      } else {
        v.x += v.vx * dt;
      }
      v.y += Math.sin(v.flow * .6) * dt * 1.6;
      v.y = Math.max(h * .55, Math.min(h * .88, v.y));
      const margin = 140;
      if (v.x > w + margin) {
        // Finished voyage to horizon: mark as completed and do NOT loop back
        completedKrathongs.add(String(id));
        if (v.el && v.el.isConnected) v.el.remove();
        drifters.delete(id);

        const nextItem = getNextStreamKrathong();
        if (nextItem && !pendingSeaEntries.some(p => String(p.id) === String(nextItem.id))) {
          pendingSeaEntries.push(nextItem);
          if (!nextSeaEntryAt) nextSeaEntryAt = performance.now();
        }
        continue;
      }

      v.el.dataset.seaX = String(v.x);
      v.el.dataset.seaY = String(v.y);
      v.el.style.transform = `translate3d(${v.x.toFixed(2)}px,${v.y.toFixed(2)}px,0) translate(-50%,-50%)`;
    }
  }
  requestAnimationFrame(animateSea);
}

// V59 — randomly spotlight a real wish attached to a krathong currently visible on the sea.
// This is purely visual: no API call, extra network request, or generated/demo wishes.
const SEA_WISH_SPOTLIGHT_MS = 10500;
const SEA_WISH_VISIBLE_MS = 6300;
let seaWishSpotlight = null;
let seaWishHideTimer = 0;
let lastSpotlightId = '';

function hideSeaWishSpotlight() {
  clearTimeout(seaWishHideTimer);
  seaWishHideTimer = 0;
  if (seaWishSpotlight && seaWishSpotlight.isConnected) {
    seaWishSpotlight.remove();
  }
  seaWishSpotlight = null;
  document.querySelectorAll('.sea-item.wish-speaking').forEach(el => el.classList.remove('wish-speaking'));
}

function showRandomSeaWish() {
  hideSeaWishSpotlight();
  if (document.hidden || document.querySelector('.modal:not([hidden])')) return;
  const sea = $('seaBoard');
  if (!sea || !sea.clientWidth || !sea.clientHeight) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const sidePadding = Math.min(110, Math.max(65, sea.clientWidth * 0.19));
  const choices = Array.from(drifters.entries()).filter(([id, d]) => {
    if (!d.el || !d.el.isConnected || d.el.dataset.chomped === 'true' ||
        d.el.classList.contains('just-released') || d.sinking || d.respawnPending) return false;
    if (!String(d.item?.wish || '').trim()) return false;
    return d.x > sidePadding && d.x < sea.clientWidth - sidePadding &&
           d.y > sea.clientHeight * .48 && d.y < sea.clientHeight * .88;
  });
  if (!choices.length) return;
  const fresh = choices.filter(([id]) => id !== lastSpotlightId);
  const pool = fresh.length ? fresh : choices;
  const [id, target] = pool[Math.floor(Math.random() * pool.length)];
  const wish = String(target.item.wish).trim();
  const bubble = document.createElement('span');
  bubble.className = 'sea-wish-spotlight';
  // Show a short excerpt, with the entire wish available by tapping the krathong.
  bubble.textContent = wish.length > 84 ? wish.slice(0, 84).trimEnd() + '…' : wish;
  bubble.setAttribute('aria-hidden', 'true');
  target.el.appendChild(bubble);
  target.el.classList.add('wish-speaking');
  seaWishSpotlight = bubble;
  lastSpotlightId = id;
  seaWishHideTimer = setTimeout(hideSeaWishSpotlight, SEA_WISH_VISIBLE_MS);
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
  const sampleSize = getSeaSampleSize();
  try {
    const out = await request('list', { limit: String(sampleSize), random: String(sampleSize) }, 'GET');
    if (!out || !Array.isArray(out.items)) throw Error('API ส่งข้อมูลกระทงไม่ถูกต้อง');
    const nextItems = out.items.filter(item => item && item.id);
    const nextRecent = Array.isArray(out.recent) ? out.recent : nextItems;
    const nextTotal = Number(out.total ?? nextItems.length);
    const nextMinute = out.minute ?? Math.floor(Date.now() / 60000);

    const nextKey = nextItems.map(x => String(x.id)).join('|');
    const prevKey = state.items.map(x => String(x.id)).join('|');
    const structureChanged = state.minute !== nextMinute || nextKey !== prevKey ||
      nextItems.some((x, i) => seaItemKey(x) !== seaItemKey(state.items[i] || {}));

    state.items = nextItems;
    state.recentItems = nextRecent;
    state.total = Number.isFinite(nextTotal) ? nextTotal : nextItems.length;
    state.minute = nextMinute;
    initSeaDecor();
    if (structureChanged) renderSea();
    else {
      $('total').textContent = state.total.toLocaleString('th-TH');
      renderWishTicker();
    }
  } catch (e) {
    // Never replace a failed API response with local, demo, or fabricated records.
    console.error('โหลดกระทงจาก API ไม่สำเร็จ:', e);
    const sea = $('seaBoard');
    if (sea && !state.items.length && !drifters.size && !sea.querySelector('.empty')) {
      sea.insertAdjacentHTML('beforeend', '<div class="empty">ไม่สามารถโหลดกระทงได้ กรุณาลองใหม่อีกครั้ง</div>');
    }
  } finally {
    loadSea.busy = false;
  }
}

$('release').onclick = async () => {
  if (window.EVENT_GATE && !window.EVENT_GATE.isLive()) {
    $('status').textContent = 'ยังไม่อยู่ในช่วงเวลาที่เปิดให้ลอยกระทง';
    return;
  }
  if (wizardStep !== 4 || releaseInProgress) return;
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

  releaseInProgress = true;
  setReleaseLoading(true);
  $('status').textContent = 'กำลังปล่อยกระทง...';

  const chosenBase = state.type;
  const chosenCandle = state.candle;
  const fallbackBase = LEGACY_BASE_MAP[chosenBase] || 'orchid';
  const fallbackCandle = LEGACY_CANDLE_MAP[chosenCandle] || 'classic';

  try {
    // Spread traffic slightly; the server must still handle concurrency atomically.
    const jitterMs = Math.floor(Math.random() * 450);
    if (jitterMs) await sleep(jitterMs);
    const payload = {
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
    };
    const fingerprint = await fingerprintSubmission(payload);
    const requestId = stableSubmissionId(fingerprint);
    if (window.EVENT_GATE && !window.EVENT_GATE.isLive()) throw Error('หมดเวลาร่วมกิจกรรมแล้ว');
    const out = await request('create', { ...payload, requestId }, 'POST', IDEMPOTENCY_READY ? 2 : 0);
    if (!out || !out.item || !out.item.id) {
      throw Error('API ไม่ได้ยืนยันการบันทึกกระทง กรุณาตรวจสอบก่อนลองอีกครั้ง');
    }

    // Only an API-confirmed submission can be shown.
    try { sessionStorage.removeItem(SUBMISSION_KEY); } catch {}
    saveDesign(out.item.id, chosenBase, chosenCandle);
    const enhancedItem = {
      ...out.item,
      type: chosenBase,
      candle: chosenCandle,
      baseDesign: chosenBase,
      candleDesign: chosenCandle
    };
    state.total += 1;
    state.recentItems = [enhancedItem, ...state.recentItems.filter(x => String(x.id) !== String(out.item.id))].slice(0, 15);
    state.items = [enhancedItem, ...state.items.filter(x => String(x.id) !== String(out.item.id))].slice(0, getSeaSampleSize());
    // HR pool is loaded from admin_list, not from a browser-local substitute.

    $('total').textContent = state.total.toLocaleString('th-TH');
    renderSea();
    launchKrathongToSea(enhancedItem);
    state.tickerIndex = 0;
    renderWishTicker();

    $('launch').hidden = false;
    setTimeout(() => { $('launch').hidden = true; }, 2300);
    $('status').textContent = 'กระทงลอยอยู่ในทะเลแล้ว!';
    setTimeout(() => { resetBuilder(); closeModal('builderModal'); }, 1000);
    localStorage.setItem('phiPhiLastWish', new Date().toISOString());
  } catch (err) {
    console.error('บันทึกกระทงไม่สำเร็จ:', err);
    $('status').textContent = 'ยังไม่สามารถยืนยันผลการบันทึกได้: ' + (err.message || 'กรุณาตรวจสอบรายการก่อนกดซ้ำ') + ' หากเน็ตหลุดหลังส่ง อาจบันทึกสำเร็จแล้ว';
  } finally {
    releaseInProgress = false;
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
  // Never trust browser storage as the source of truth for prize winners.
  return state.serverWinners;
}
async function syncWinnerHistory() {
  const out = await request('winner_history', { token: state.adminToken });
  if (!Array.isArray(out.winners)) throw Error('Backend ต้องส่ง winners[] จาก winner_history');
  state.serverWinners = out.winners;
  state.winnerHistoryReady = true;
  updateHrViews();
  return out.winners;
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
  $('hrLoginBtn').disabled = true;
  $('hrLoginStatus').textContent = 'กำลังตรวจสอบ...';
  try {
    const out = await request('hr_login', { pin });
    if (!out || typeof out.token !== 'string' || !out.token || out.token.startsWith('local_admin_')) {
      throw Error('API ไม่ได้ยืนยันสิทธิ์ HR');
    }
    state.adminToken = out.token;
    localStorage.setItem('phiPhiHrToken', out.token);
    await loadAdminList();
    $('hrLoginStatus').textContent = 'เข้าสู่ระบบสำเร็จ';
    $('hrLoginBox').hidden = true;
    $('hrPanel').hidden = false;
  } catch (e) {
    state.adminToken = '';
    state.hrPool = [];
    localStorage.removeItem('phiPhiHrToken');
    $('hrLoginBox').hidden = false;
    $('hrPanel').hidden = true;
    $('hrLoginStatus').textContent = 'เข้าสู่ระบบไม่สำเร็จ: ' + (e.message || 'กรุณาลองใหม่');
  } finally {
    $('hrLoginBtn').disabled = false;
  }
}

async function loadAdminList() {
  if (!state.adminToken) throw Error('ยังไม่ได้เข้าสู่ระบบ HR');
  try {
    const out = await request('admin_list', { token: state.adminToken });
    if (!out || !Array.isArray(out.items)) throw Error('API ส่งรายชื่อผู้เข้าร่วมไม่ถูกต้อง');
    state.hrPool = out.items;
    state.winnerHistoryReady = false;
    await syncWinnerHistory();
  } catch (e) {
    state.hrPool = [];
    state.serverWinners = [];
    state.winnerHistoryReady = false;
    updateHrViews();
    console.error('โหลดรายชื่อ HR ไม่สำเร็จ:', e);
    throw e;
  }
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
  const confettiCount = window.matchMedia('(max-width:760px), (prefers-reduced-motion: reduce)').matches ? 22 : 60;
  for (let i = 0; i < confettiCount; i++) {
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
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    if (!state.adminToken) throw Error('กรุณาเข้าสู่ระบบ HR');
    await loadAdminList(); // refresh server-side eligibility/history before the draw
    const selectedDept = $('hrDeptFilter') ? $('hrDeptFilter').value : 'ALL';
    const seen = new Set(), eligiblePool = [];
    for (const item of state.hrPool) {
      if (selectedDept !== 'ALL' && item.department !== selectedDept) continue;
      if (getItemWinnerStatus(item, getWinners(), seen).type === 'eligible') eligiblePool.push(item);
    }
    if (!eligiblePool.length) throw Error('ไม่มีผู้มีสิทธิ์ลุ้นรางวัลในแผนกที่เลือก');

    // The backend atomically chooses, excludes previously-won employees,
    // commits the result and returns the authoritative winner.
    const out = await request('draw', {
      token: state.adminToken,
      department: selectedDept,
      requestId: makeRequestId()
    }, 'POST', 0);
    if (!out.winner || !out.winner.id) {
      throw Error('Backend ไม่ได้ส่ง winner ที่ยืนยันแล้ว จึงไม่แสดงผลการจับรางวัล');
    }
    const finalWinner = out.winner;
    // The animation has no effect on winner selection.
    await runLuckyAnimation(finalWinner, eligiblePool);
    await syncWinnerHistory();
    const winnerRecord = getWinners().find(w => String(w.id) === String(finalWinner.id));
    if (!winnerRecord) throw Error('ไม่พบผู้ชนะในประวัติกลาง กรุณารีเฟรชและตรวจสอบก่อนจับครั้งถัดไป');
    const prizeRank = Number(winnerRecord.prizeRank) || getWinners().length;
    updateHrViews();
    showWinnerCelebration(winnerRecord, prizeRank);
  } catch (e) {
    // Never fabricate a winner when draw/history fails.
    alert('ไม่สามารถยืนยันผลจับรางวัล: ' + (e.message || 'กรุณาตรวจสอบประวัติที่ Backend ก่อนลองใหม่'));
  } finally {
    btn.disabled = false;
  }
}

function syncHrUi() {
  // A previously saved token must not unlock the HR panel before server validation.
  $('hrLoginBox').hidden = false;
  $('hrPanel').hidden = true;
  if (!state.adminToken) return;
  $('hrLoginStatus').textContent = 'กำลังตรวจสอบสิทธิ์ HR...';
  loadAdminList().then(() => {
    if (!state.adminToken) return;
    $('hrLoginBox').hidden = true;
    $('hrPanel').hidden = false;
    $('hrLoginStatus').textContent = '';
  }).catch(err => {
    state.adminToken = '';
    state.hrPool = [];
    localStorage.removeItem('phiPhiHrToken');
    $('hrLoginStatus').textContent = 'ไม่สามารถยืนยันสิทธิ์ HR: ' + (err.message || 'กรุณาเข้าสู่ระบบใหม่');
  });
}

function logoutHr() {
  state.adminToken = '';
  state.serverWinners = [];
  state.winnerHistoryReady = false;
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
  $('clearHistoryBtn').onclick = async () => {
    if (!state.adminToken || !state.winnerHistoryReady) return alert('ยังไม่สามารถยืนยันข้อมูลผู้ชนะจาก Backend');
    if (!confirm('ยืนยันล้างประวัติผู้ได้รับรางวัลทั้งหมดบน Server? การดำเนินการนี้ควรจำกัดเฉพาะผู้มีสิทธิ์เท่านั้น')) return;
    const clearBtn = $('clearHistoryBtn');
    clearBtn.disabled = true;
    try {
      await request('clear_winners', { token: state.adminToken }, 'POST', 0);
      await syncWinnerHistory();
      $('winnerBox').classList.add('emptywinner');
      $('winnerBox').classList.remove('drawing', 'rolling-shake');
      $('winnerBox').innerHTML = '<div class="winner-placeholder">กด “สุ่มรางวัล” เพื่อเลือกผู้โชคดี</div>';
    } catch(e) {
      alert('ยังไม่ยืนยันการล้างประวัติบน Server: ' + e.message);
    } finally { clearBtn.disabled = false; }
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
        audio.play().then(() => updateUI(true)).catch(() => {});
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
    audio.play().catch(() => {});
  });
}

if ($('photoPublic')) $('photoPublic').onchange = () => { $('photoPublic').dataset.touched = '1'; };
try { localStorage.removeItem('phiPhiLocalKrathongs_v1'); } catch (e) {}
try { localStorage.removeItem('phiPhiMyKrathong_v1'); localStorage.removeItem('phiPhiMyKrathong'); } catch (e) {}
initChoices();
updatePreview();
syncHrUi();
initMusicPlayer();
// Countdown/finished pages do not start the sea renderer or poll participant data.
// HR login remains available from the existing top navigation.
// Sea rendering starts only after V73 verifies time with the Worker.
async function startSeaIfEventLive() {
  if (window.EVENT_GATE) await window.EVENT_GATE.ready;
  if (window.EVENT_GATE && !window.EVENT_GATE.isLive()) return;
  initSeaDecor();
  loadSea();
  requestAnimationFrame(animateSea);
  setTimeout(showRandomSeaWish, 4800);
  setInterval(showRandomSeaWish, SEA_WISH_SPOTLIGHT_MS);
  setInterval(() => { state.tickerIndex++; renderWishTicker(); }, 8000);
  function scheduleSeaPolling() {
    const nextInterval = SEA_REFRESH_MS + (Math.random() - 0.5) * 6000;
    setTimeout(() => {
      if (!document.hidden && (!window.EVENT_GATE || window.EVENT_GATE.isLive())) loadSea();
      scheduleSeaPolling();
    }, nextInterval);
  }
  scheduleSeaPolling();
  document.addEventListener('visibilitychange', () => {
    lastFrame = 0;
    lastPaintFrame = 0;
    if (document.hidden) hideSeaWishSpotlight();
    else if (!window.EVENT_GATE || window.EVENT_GATE.isLive()) loadSea();
  });
}
startSeaIfEventLive();
