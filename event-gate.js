/* Phi Phi Loy Krathong 2026 – V73 server-authoritative event clock.
 * Server timestamps are anchored to performance.now(), not device wall clock.
 * Fail closed for submissions when a verified server clock cannot be obtained.
 * Keep HR login accessible during before / ended / syncing phases.
 */
(function () {
  'use strict';
  // Worker is the single source of truth for the event schedule.
  // These fallback values are never used to unlock submissions before sync.
  let START_AT = Date.parse('2026-11-20T09:59:00+07:00');
  let END_AT = Date.parse('2026-11-20T09:60:00+07:00');
  const RESYNC_MS = 60000;
  const RETRY_MS = 15000;
  const CLOCK_MAX_AGE_MS = 300000;
  const REQUEST_TIMEOUT_MS = 9000;

  let serverAtReceipt = 0;
  let receivedAtMono = 0;
  let isSynchronized = false;
  let firstPhase = null;
  let inFlight = null;
  let lastAttemptMono = -Infinity;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  // Do not briefly expose the sea based on an untrusted device clock.
  document.documentElement.dataset.eventPhase = 'syncing';

  const monotonicNow = () => performance.now();
  function validClock() {
    return isSynchronized && monotonicNow() - receivedAtMono < CLOCK_MAX_AGE_MS;
  }
  function now() {
    return validClock() ? serverAtReceipt + (monotonicNow() - receivedAtMono) : null;
  }
  function phase(at) {
    const ms = typeof at === 'number' ? at : now();
    if (ms === null || !Number.isFinite(ms)) return 'syncing';
    return ms < START_AT ? 'before' : ms < END_AT ? 'live' : 'ended';
  }
  const isLive = () => phase() === 'live';

  window.EVENT_GATE = {
    phase, isLive, now, ready,
    get START_AT() { return START_AT; },
    get END_AT() { return END_AT; },
    refresh: () => fetchStatus(),
    isSynchronized: validClock
  };

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function countdown() {
    const current = now();
    if (current === null) return;
    const seconds = Math.max(0, Math.ceil((START_AT - current) / 1000));
    for (const [key, value] of Object.entries({
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60
    })) setText('event-' + key, String(value).padStart(2, '0'));
  }

  function paint() {
    const current = phase();
    if (firstPhase !== null && current !== 'syncing' && current !== firstPhase) {
      // Reinitialize the sea renderer only after a verified phase transition.
      window.location.reload();
      return;
    }
    document.documentElement.dataset.eventPhase = current;
    const gate = document.getElementById('eventGate');
    const before = document.getElementById('eventBefore');
    const ended = document.getElementById('eventEnded');
    const syncing = document.getElementById('eventSyncing');
    if (gate) gate.hidden = current === 'live';
    if (before) before.hidden = current !== 'before';
    if (ended) ended.hidden = current !== 'ended';
    if (syncing) syncing.hidden = current !== 'syncing';
    if (current === 'before') countdown();
  }

  async function fetchStatus() {
    if (inFlight) return inFlight;
    lastAttemptMono = monotonicNow();
    inFlight = (async () => {
      const apiUrl = (window.APP_CONFIG || {}).API_URL;
      if (!apiUrl) throw new Error('API_URL not configured');
      const u = new URL(apiUrl);
      u.searchParams.set('action', 'event_status');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const sentAt = monotonicNow();
      try {
        const response = await fetch(u.toString(), {
          method: 'GET', cache: 'no-store', signal: controller.signal
        });
        if (!response.ok) throw new Error('Server time unavailable: ' + response.status);
        const data = await response.json();
        if (!data || data.ok !== true) {
          throw new Error('Worker event_status unavailable: ' + String(data?.error || 'unexpected API response'));
        }
        if (!Number.isFinite(data.serverTime) || !Number.isFinite(data.startAt) ||
            !Number.isFinite(data.endAt) || data.startAt >= data.endAt ||
            data.endAt - data.startAt > 31 * 86400000 ||
            data.startAt < Date.parse('2026-01-01T00:00:00+07:00')) {
          throw new Error('Worker event_status returned missing or invalid timestamps');
        }
        // Use Worker dates rather than rejecting an otherwise valid status
        // whenever an operator changes the schedule for staging/tests.
        START_AT = data.startAt;
        END_AT = data.endAt;
        // Worker supplies time when sending its response; estimate the one-way
        // network delay from round-trip duration (capped to reduce jitter).
        const received = monotonicNow();
        const estimatedLatency = Math.min(Math.max(0, received - sentAt) / 2, 1500);
        serverAtReceipt = data.serverTime + estimatedLatency;
        receivedAtMono = received;
        isSynchronized = true;
        if (firstPhase === null) {
          firstPhase = phase();
          resolveReady(firstPhase);
        }
        paint();
        return data;
      } finally {
        clearTimeout(timeout);
      }
    })();
    try {
      return await inFlight;
    } catch (err) {
      console.warn('Event clock sync failed:', err);
      // Never authorize a release using an expired server clock.
      paint();
      return null;
    } finally {
      inFlight = null;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    paint();
    fetchStatus();
    window.setInterval(() => {
      paint();
      if (!document.hidden && !inFlight &&
          (validClock()
            ? monotonicNow() - receivedAtMono >= RESYNC_MS
            : monotonicNow() - lastAttemptMono >= RETRY_MS)) {
        fetchStatus();
      }
    }, 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) fetchStatus();
    });
  });
})();
