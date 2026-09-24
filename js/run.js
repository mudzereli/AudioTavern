/* ---------------------------------------------------------------------------
   run.js — the ten-minute clock.

   Each table's run lasts exactly as long as its Tabletop Audio track, so this
   is the piece that ties the site to the music. It owns the countdown, the
   score, and the moment the night ends; the shell owns how that looks and the
   games own what happens during a round.

   Timing is derived from performance.now() rather than counted in ticks, so a
   throttled background tab or a slow frame cannot make the clock drift, and a
   pause genuinely pauses.
   --------------------------------------------------------------------------- */

export const RUN_MS = 10 * 60 * 1000;

const TICK_MS = 200;

/** "9:59" — rounds up, so the clock reads 10:00 before it starts. */
export function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * @param {object}   options
 * @param {number}   [options.durationMs]  length of a run
 * @param {Function} [options.onTick]      called on every visible change
 * @param {Function} [options.onEnd]       called once, when time runs out
 */
export function createRun({ durationMs = RUN_MS, onTick, onEnd } = {}) {
  let state = 'idle'; // 'idle' | 'running' | 'paused' | 'ended'
  let remainingMs = durationMs;
  let score = 0;
  let lastStamp = 0;
  let timer = null;

  function emit() {
    if (onTick) onTick({ state, remainingMs, durationMs, score });
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function begin() {
    lastStamp = performance.now();
    stopTimer();
    timer = setInterval(tick, TICK_MS);
    emit();
  }

  function finish() {
    stopTimer();
    state = 'ended';
    emit();
    if (onEnd) onEnd({ score, durationMs });
  }

  function tick() {
    if (state !== 'running') return;

    const now = performance.now();
    remainingMs -= now - lastStamp;
    lastStamp = now;

    if (remainingMs <= 0) {
      remainingMs = 0;
      finish();
      return;
    }

    emit();
  }

  return {
    get state() {
      return state;
    },
    get score() {
      return score;
    },
    get remainingMs() {
      return remainingMs;
    },
    get durationMs() {
      return durationMs;
    },

    /** Start a fresh run, or resume one that was paused mid-countdown. */
    start() {
      if (state === 'running') return;
      if (state === 'idle' || state === 'ended') {
        remainingMs = durationMs;
        score = 0;
      }
      state = 'running';
      begin();
    },

    /** Hold the clock. Used when the tab is hidden. */
    pause() {
      if (state !== 'running') return;
      tick(); // settle the time that elapsed before we noticed
      if (state !== 'running') return; // tick may have just ended the run
      state = 'paused';
      stopTimer();
      emit();
    },

    resume() {
      if (state !== 'paused') return;
      state = 'running';
      begin();
    },

    /** End the run early. */
    stop() {
      if (state === 'idle' || state === 'ended') return;
      remainingMs = 0;
      finish();
    },

    /** Back to an unstarted run. */
    reset() {
      stopTimer();
      state = 'idle';
      remainingMs = durationMs;
      score = 0;
      emit();
    },

    /** Restore score and time without starting the countdown. */
    restore(snapshot) {
      if (state !== 'idle' || !snapshot) return;
      if (!Number.isFinite(snapshot.score) || snapshot.score < 0) return;
      if (!Number.isFinite(snapshot.remainingMs) || snapshot.remainingMs <= 0) return;
      score = snapshot.score;
      remainingMs = Math.min(snapshot.remainingMs, durationMs);
      emit();
    },

    /** Resume a restored idle run without resetting its score or time. */
    resume() {
      if (state !== 'idle') return;
      state = 'running';
      begin();
    },

    addPoints(points) {
      if (!Number.isFinite(points) || points === 0) return;
      score += points;
      emit();
    },
  };
}
