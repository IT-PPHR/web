/*
  PHI PHI LOY KRATHONG - GIANT SHARK ANIMATION (3x Scale)
  *หมายเหตุ: ในฟังก์ชัน animateSea() อย่าลืมเพิ่มบรรทัดนี้ในลูป drifters:
  if(v.sharkGrabbed) continue;
*/

function initShark() {
  const sea = $('seaBoard');

  if (!sea || sea.querySelector('.friendly-shark')) {
    return;
  }

  // สร้าง Element รูปฉลาม
  const shark = document.createElement('img');
  shark.className = 'friendly-shark';
  shark.src = 'assets/shark.png'; // ตรวจสอบ path รูปภาพฉลามของคุณ
  shark.alt = '';
  shark.setAttribute('aria-hidden', 'true');
  shark.draggable = false;

  sea.appendChild(shark);

  let active = false;

  const ease = t => t * t * (3 - 2 * t);
  const mix = (a, b, t) => {
    const value = Math.max(0, Math.min(1, t));
    return a + (b - a) * ease(value);
  };

  function visit() {
    if (active || document.hidden) {
      setTimeout(visit, 10000);
      return;
    }

    const candidates = [...drifters.values()]
      .filter(v => v.el.isConnected);

    if (!candidates.length) {
      setTimeout(visit, 2000);
      return;
    }

    const w = sea.clientWidth;
    const h = sea.clientHeight;

    const target = candidates[
      Math.floor(Math.random() * candidates.length)
    ];

    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -200 : w + 200;
    const endX = fromLeft ? w + 200 : -200;

    const targetX = Math.max(w * 0.18, Math.min(w * 0.82, target.x));
    const targetY = Math.max(h * 0.55, Math.min(h * 0.84, target.y));
    const swimY = Math.max(h * 0.56, Math.min(h * 0.83, targetY + 14));

    const jawOffset = fromLeft ? 80 : -80; // ปรับระยะการงับตามขนาดตัวที่ใหญ่ขึ้น 3 เท่า
    const grabX = targetX - jawOffset;

    const saved = {
      x: target.x,
      y: target.y
    };

    const started = performance.now();
    active = true;

    shark.classList.add('is-swimming');
    shark.style.transform = fromLeft
      ? 'translate(-50%,-50%)'
      : 'translate(-50%,-50%) scaleX(-1)';

    let released = false;

    function frame(now) {
      const t = Math.min(1, (now - started) / 10000);
      let x;

      if (t < 0.34) {
        x = mix(startX, grabX, t / 0.34);
      } else if (t < 0.66) {
        x = grabX + Math.sin((t - 0.34) / 0.32 * Math.PI) * 12 * (fromLeft ? 1 : -1);
      } else {
        x = mix(grabX, endX, (t - 0.66) / 0.34);
      }

      const y = swimY + Math.sin(t * Math.PI * 7) * 3;

      shark.style.left = x + 'px';
      shark.style.top = y + 'px';

      if (t >= 0.34 && t < 0.66) {
        target.sharkGrabbed = true;
        target.x = x + jawOffset;
        target.y = y - 14;

        target.el.style.left = target.x + 'px';
        target.el.style.top = target.y + 'px';
        target.el.classList.add('shark-held');
      } else if (t >= 0.66 && !released) {
        released = true;
        target.sharkGrabbed = false;
        target.el.classList.remove('shark-held');

        target.x = Math.max(w * 0.08, Math.min(w * 0.9, saved.x));
        target.y = Math.max(h * 0.5, Math.min(h * 0.88, saved.y));
      }

      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }

      target.sharkGrabbed = false;
      target.el.classList.remove('shark-held');
      shark.classList.remove('is-swimming');
      active = false;

      setTimeout(visit, 10000);
    }

    requestAnimationFrame(frame);
  }

  setTimeout(visit, 1000);
}

// เริ่มต้นทำงานอัตโนมัติ
initShark();
