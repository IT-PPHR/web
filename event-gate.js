/* Phi Phi Loy Krathong 2026 — event pages (Asia/Bangkok, UTC+07:00).
 * Dates are absolute instants to avoid using a visitor's local time zone.
 * Frontend display gate only: server must independently reject late/early create.
 */
(function () {
  'use strict';
  const START_AT = Date.parse('2026-11-20T08:04:00+07:00');
  // 23:59 is the last permitted minute: stop at 25 Nov 00:00:00 Thailand time.
  const END_AT = Date.parse('2026-11-20T08:06:00+07:00');

  function phase(now) {
    const ms = typeof now === 'number' ? now : Date.now();
    return ms < START_AT ? 'before' : ms < END_AT ? 'live' : 'ended';
  }
  const initialPhase = phase();
  document.documentElement.dataset.eventPhase = initialPhase;
  window.EVENT_GATE = { phase, isLive: () => phase() === 'live', START_AT, END_AT };

  function paintCountdown() {
    const remaining = Math.max(0, Math.ceil((START_AT - Date.now()) / 1000));
    const d = Math.floor(remaining / 86400);
    const h = Math.floor((remaining % 86400) / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    const values = { days: d, hours: h, minutes: m, seconds: s };
    for (const [name, value] of Object.entries(values)) {
      const el = document.getElementById('event-' + name);
      if (el) el.textContent = String(value).padStart(2, '0');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const gate = document.getElementById('eventGate');
    const before = document.getElementById('eventBefore');
    const ended = document.getElementById('eventEnded');
    if (!gate || !before || !ended) return;

    function update() {
      const current = phase();
      if (current !== initialPhase) {
        // Reload once at either boundary so the normal sea app starts/stops cleanly.
        window.location.reload();
        return;
      }
      document.documentElement.dataset.eventPhase = current;
      gate.hidden = current === 'live';
      before.hidden = current !== 'before';
      ended.hidden = current !== 'ended';
      if (current === 'before') paintCountdown();
    }
    update();
    window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  });
})();
