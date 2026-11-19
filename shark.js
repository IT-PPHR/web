/* ==========================================================================
   Phi Phi Blacktip Reef Shark (ฉลามหูดำเกาะพีพี - ครีบว่ายผิวน้ำ & พุ่งงับกระทง)
   ========================================================================== */

(function () {
  'use strict';

  const SHARK_CHOMPER = {
    name: 'ฉลามหูดำเกาะพีพี',
    msg: '🦈 งับ!! ฉลามหูดำเกาะพีพีโผล่มางับกระทง!',
    svg: `
    <svg viewBox="0 0 120 110" style="width:100%; height:100%; overflow:visible; filter:drop-shadow(0 6px 12px rgba(0,0,0,0.6));">
      <path d="M22,105 Q28,32 60,12 Q92,32 98,105 Z" fill="#475569" stroke="#0f172a" stroke-width="2.5"/>
      <path d="M34,105 Q60,52 86,105 Z" fill="#f8fafc"/>
      <path d="M36,62 Q60,38 84,62 Q60,84 36,62 Z" fill="#be123c" stroke="#881337" stroke-width="1.5"/>
      <polygon points="40,60 45,68 50,59 55,68 60,58 65,68 70,59 75,68 80,60" fill="#ffffff"/>
      <circle cx="41" cy="39" r="4" fill="#0f172a"/><circle cx="42" cy="38" r="1.2" fill="#ffffff"/>
      <circle cx="79" cy="39" r="4" fill="#0f172a"/><circle cx="78" cy="38" r="1.2" fill="#ffffff"/>
      <path d="M10,85 L28,70 L24,95 Z" fill="#475569"/><path d="M10,85 L18,78 L16,88 Z" fill="#0f172a"/>
      <path d="M110,85 L92,70 L96,95 Z" fill="#475569"/><path d="M110,85 L102,78 L104,88 Z" fill="#0f172a"/>
    </svg>
  `
  };

  let isChomping = false;
  let chompTimer = null;

  function safeRemove(el) {
    if (!el) return;
    if (typeof el.remove === 'function') el.remove();
    else if (el.parentNode) el.parentNode.removeChild(el);
  }

  // เรียกใช้ฟังก์ชันนี้โดยส่ง Element ของกระทง (krathongEl) และ Element พื้นที่ทะเล (seaContainerEl) เข้าไป
    // isDragDown: true = งับลากลงน้ำ, false = งับแล้วปล่อย (หากไม่ระบุจะสุ่ม 50/50)
    function triggerSharkChomp(krathongEl, seaContainerEl, isDragDown) {
      if (!krathongEl || !krathongEl.parentNode || krathongEl.dataset.chomped === 'true') return;
      krathongEl.dataset.chomped = 'true';
      isChomping = true;

      // สุ่ม 50/50 ว่าจะงับลากลงน้ำ หรืองับแล้วปล่อย
      const willDragDown = (typeof isDragDown === 'boolean') ? isDragDown : (Math.random() < 0.5);

      // หยุดการเคลื่อนที่ไปด้านข้างชั่วคราวเพื่อให้เห็นจังหวะงับชัดเจน
      krathongEl.style.animationPlayState = 'paused';
      krathongEl.style.zIndex = '49';

      // ป้ายข้อความแจ้งเตือนด้านบนกระทง
      const alertBubble = document.createElement('div');
      const msg = willDragDown
        ? '🦈 งับ!! ฉลามหูดำเกาะพีพีโผล่มางับลากกระทงลงน้ำ!'
        : '🦈 งับ!! ฉลามหูดำแวะมางับหยอกๆ แล้วปล่อยกระทงไป~';
      const bubbleBg = willDragDown ? '#fb7185' : '#facc15';
      const bubbleColor = willDragDown ? '#ffffff' : '#0f172a';

      alertBubble.style.cssText = `position:absolute; top:-44px; left:50%; transform:translateX(-50%); background:${bubbleBg}; color:${bubbleColor}; font-size:12px; font-weight:800; padding:4px 14px; border-radius:999px; white-space:nowrap; z-index:50; border:2px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,0.4);`;
      alertBubble.innerText = msg;
      krathongEl.appendChild(alertBubble);

      // สั่งกระทงสั่น: ถ้างับลากลงน้ำให้จมลงสู่ใต้ทะเล ถ้าเป็นงับแล้วปล่อยให้สั่นโยกเยกแล้วกลับมาลอยต่อ
      const innerBody = krathongEl.querySelector('.sea-bob') || krathongEl.firstElementChild;
      if (innerBody) {
        if (willDragDown) {
          innerBody.classList.add('krathong-sinking');
        } else {
          innerBody.classList.add('krathong-nibble-release');
        }
      }

      // วงคลื่นน้ำกระเพื่อม 2 ชั้น
      const splash1 = document.createElement('div');
      splash1.className = 'splash-ring-1';
      krathongEl.appendChild(splash1);

      const splash2 = document.createElement('div');
      splash2.className = 'splash-ring-2';
      krathongEl.appendChild(splash2);

      // หยดน้ำกระจาย 8 ทิศทาง
      const burstCoords = [
        { dx: '-48px', dy: '-38px' }, { dx: '-28px', dy: '-52px' },
        { dx: '0px', dy: '-58px' }, { dx: '28px', dy: '-52px' },
        { dx: '48px', dy: '-38px' }, { dx: '-38px', dy: '-22px' },
        { dx: '38px', dy: '-22px' }, { dx: '14px', dy: '-44px' }
      ];
      burstCoords.forEach(pt => {
        const drop = document.createElement('div');
        drop.className = 'water-burst-drop';
        drop.style.setProperty('--dx', pt.dx);
        drop.style.setProperty('--dy', pt.dy);
        krathongEl.appendChild(drop);
      });

      // ตัวฉลามพุ่งพ้นน้ำขึ้นมางับ
      const creatureEl = document.createElement('div');
      creatureEl.className = 'creature-chomp-anim';
      creatureEl.innerHTML = SHARK_CHOMPER.svg;
      krathongEl.appendChild(creatureEl);

      // สั่นหน้าจอทะเลจังหวะพุ่งงับ (วินาทีที่ 0.9)
      setTimeout(() => {
        if (seaContainerEl) {
          seaContainerEl.classList.remove('sea-impact-shake');
          void seaContainerEl.offsetWidth;
          seaContainerEl.classList.add('sea-impact-shake');
        }
      }, 900);

      // คืนค่าหรือนำออกหลังจบอนิเมชัน 4.25 วินาที
      setTimeout(() => {
        if (seaContainerEl) seaContainerEl.classList.remove('sea-impact-shake');
        safeRemove(alertBubble);
        safeRemove(splash1);
        safeRemove(splash2);
        safeRemove(creatureEl);
        krathongEl.querySelectorAll('.water-burst-drop').forEach(safeRemove);

          if (willDragDown) {
            // 1. กรณีงับลากลงน้ำ: เรียก sinkDrifterItem เพื่อ recycle กระทงให้วนกลับมาลอยใหม่
            const itemId = krathongEl.dataset.itemId;
            if (typeof window.sinkDrifterItem === 'function' && itemId) {
              window.sinkDrifterItem(itemId);
            } else {
              if (innerBody) innerBody.classList.remove('krathong-sinking');
              krathongEl.dataset.chomped = 'false';
              krathongEl.style.animationPlayState = 'running';
              safeRemove(krathongEl);
            }
          } else {
            // 2. กรณีงับแล้วปล่อย: กระทงไม่จม คืนค่าให้ลอยต่อไปตามปกติ
            if (innerBody) innerBody.classList.remove('krathong-nibble-release');
            krathongEl.dataset.chomped = 'false';
            krathongEl.style.animationPlayState = 'running';
            krathongEl.style.zIndex = '';
          }

          isChomping = false;
          scheduleNextChomp();
        }, 4250);
    }

    function getEligibleTarget(sea) {
      if (!sea) return null;
      const items = Array.from(sea.querySelectorAll('.sea-item')).filter(el => {
        const left = parseFloat(el.style.left) || 0;
        const top = parseFloat(el.style.top) || 0;
        const isInBounds = left > 100 && left < (sea.clientWidth - 120) && top > (sea.clientHeight * 0.46) && top < (sea.clientHeight * 0.88);
        return isInBounds &&
          el.dataset.chomped !== 'true' &&
          !el.classList.contains('krathong-sinking') &&
          !el.classList.contains('just-released');
      });
      if (!items.length) return null;
      return items[Math.floor(Math.random() * items.length)];
    }

    function autoChomp() {
      if (isChomping) {
        scheduleNextChomp(6000);
        return;
      }
      const sea = document.getElementById('seaBoard');
      if (!sea || document.hidden) {
        scheduleNextChomp(6000);
        return;
      }
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scheduleNextChomp(30000);
        return;
      }

      const targetEl = getEligibleTarget(sea);
      if (!targetEl) {
        scheduleNextChomp(6000);
        return;
      }

      triggerSharkChomp(targetEl, sea);
    }

    function scheduleNextChomp(customDelay) {
      clearTimeout(chompTimer);
      // สุ่มเวลา 30 - 60 วินาที (30000 ถึง 60000 ms) ตามคำขอของผู้ใช้
      const delay = customDelay || (30000 + Math.random() * 30000);
      chompTimer = setTimeout(autoChomp, delay);
    }

    function init() {
      // โหลดครั้งแรกสุ่มในช่วง 15 - 30 วินาที เพื่อให้เริ่มเร็วขึ้น ไม่ต้องรอนาน
      scheduleNextChomp(15000 + Math.random() * 15000);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    window.triggerSharkChomp = triggerSharkChomp;
      window.triggerChibiShark = function (isDragDown) {
        const sea = document.getElementById('seaBoard');
        if (!sea) return;
        const target = getEligibleTarget(sea) || sea.querySelector('.sea-item');
        if (target) {
          triggerSharkChomp(target, sea, isDragDown);
        }
      };
    }) ();
