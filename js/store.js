/* ---------------------------------------------------------------------------
   store.js — everything that survives a reload.

   Two things are kept: a best score per table, and the player's preferences.
   There is no currency and no cross-table purse, so this file stays small.
   All keys are namespaced under "ttagames." to avoid collisions on a shared
   origin, and every access is wrapped because localStorage can throw (private
   browsing, storage disabled, quota).
   --------------------------------------------------------------------------- */

const PREFIX = 'ttagames.';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Storage unavailable. Losing a best score is not worth breaking the game. */
  }
}

/* Best score ---------------------------------------------------------------- */

/** The best score recorded for a table, or 0 if it has never been played. */
export function getBest(gameId) {
  const value = read(`best.${gameId}`, 0);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Record a finished run. Returns true when it beat the previous best, which
 * the summary screen uses to show its "New best" badge.
 */
export function submitScore(gameId, score) {
  const best = getBest(gameId);
  if (score > best) {
    write(`best.${gameId}`, score);
    return true;
  }
  return false;
}

/* Run counter -------------------------------------------------------------- */

export function getRuns(gameId) {
  const value = read(`runs.${gameId}`, 0);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function addRun(gameId) {
  const next = getRuns(gameId) + 1;
  write(`runs.${gameId}`, next);
  return next;
}

/* In-progress run --------------------------------------------------------- */

export function getProgress(gameId) {
  const value = read(`progress.${gameId}`, null);
  if (!value || typeof value !== 'object') return null;
  if (!Number.isFinite(value.score) || value.score < 0) return null;
  if (!Number.isFinite(value.remainingMs) || value.remainingMs <= 0) return null;
  return { score: value.score, remainingMs: value.remainingMs };
}

export function saveProgress(gameId, progress) {
  if (!Number.isFinite(progress.score) || progress.score < 0) return;
  if (!Number.isFinite(progress.remainingMs) || progress.remainingMs <= 0) return;
  write(`progress.${gameId}`, {
    score: progress.score,
    remainingMs: progress.remainingMs,
  });
}

export function clearProgress(gameId) {
  try {
    localStorage.removeItem(PREFIX + `progress.${gameId}`);
  } catch {
    /* Storage unavailable; a later valid save can replace the old value. */
  }
}

