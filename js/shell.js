/* ---------------------------------------------------------------------------
   shell.js — the contract every table implements.

   The shell owns everything that is the same at every table: the header, the
   countdown, the score, the overlay that starts and ends a run, the sound
   link, and pausing when the tab is hidden.

   A game only has to provide:
     mount(ctx)   build its DOM once, into ctx.stage
     start(ctx)   begin a run: reset state and start the first round
     stop(ctx)    the run is over: clear timers and disable input
     act(ctx)     optional. The primary action, wired to its button. Omit it if
                  the table draws its own controls.

   ctx is how a game talks back:
     ctx.rng                the run's seeded generator
     ctx.stage              where to render
     ctx.message(text)      the live status line under the table
     ctx.addPoints(n)       score, which the HUD shows immediately
     ctx.setActionLabel(s)  rename the primary button
     ctx.setActionEnabled(b) enable or disable it
   --------------------------------------------------------------------------- */

import { el } from './dom.js';
import { RUN_MS, createRun, formatClock } from './run.js';
import { createRng, randomSeed } from './rng.js';
import { addRun, clearProgress, getBest, getProgress, saveProgress, submitScore } from './store.js';

const LOW_TIME_MS = 60_000;

export function mountShell(config, game) {
  const root = document.querySelector('[data-shell]');
  if (!root) throw new Error('shell: no [data-shell] container on the page');
  if (!config) throw new Error('shell: unknown table');

  root.style.setProperty('--accent', config.accent);
  document.title = `${config.title} — TTAGames`;

  let storedBest = getBest(config.id);

  /* ---------------------------------------------------------------- header */

  const back = el('a', 'top__back', '\u2190 The Tavern');
  back.href = '../index.html';

  const idBox = el('div', 'top__id');
  idBox.append(el('h1', 'top__title', config.title), el('p', 'top__tagline', config.tagline));

  const sound = el('a', 'top__sound');
  sound.href = config.track.soundUrl;
  sound.target = '_blank';
  sound.rel = 'noopener noreferrer';
  sound.title = `Open Tabletop Audio in a new tab, then play "${config.track.title}"`;
  sound.append(
    el('span', 'top__sound-label', 'Sound'),
    el('span', 'top__sound-track', `${config.track.title} \u2197`),
  );

  const trackAudio = document.createElement('audio');
  trackAudio.className = 'soundbar__audio';
  trackAudio.controls = true;
  trackAudio.preload = 'none';
  trackAudio.src = config.track.audioUrl;
  trackAudio.setAttribute('aria-label', `${config.track.title} by Tabletop Audio`);

  let pendingTrackPosition = null;
  function applyTrackPosition() {
    if (pendingTrackPosition === null || !Number.isFinite(trackAudio.duration)) return;
    trackAudio.currentTime = Math.min(pendingTrackPosition, trackAudio.duration);
    pendingTrackPosition = null;
  }
  function seekTrack(seconds) {
    pendingTrackPosition = Math.max(0, seconds);
    applyTrackPosition();
  }
  trackAudio.addEventListener('loadedmetadata', applyTrackPosition);

  const soundbar = el('section', 'soundbar');
  soundbar.append(trackAudio);

  const soundCredit = el('div', 'soundbar__credit');
  soundCredit.append(document.createTextNode('Audio: '));
  const creatorLink = el('a', null, 'Tabletop Audio');
  creatorLink.href = config.track.soundUrl;
  creatorLink.target = '_blank';
  creatorLink.rel = 'noopener noreferrer';
  soundCredit.append(creatorLink, document.createTextNode(' · '));
  const licenseLink = el('a', null, 'CC BY-NC-ND 4.0');
  licenseLink.href = 'https://creativecommons.org/licenses/by-nc-nd/4.0/';
  licenseLink.target = '_blank';
  licenseLink.rel = 'noopener noreferrer';
  soundCredit.append(licenseLink);
  soundbar.append(soundCredit);

  const top = el('header', 'top');
  top.append(back, idBox, sound);

  /* ------------------------------------------------------------------ score */

  const clockTime = el('span', 'clock__time', formatClock(RUN_MS));
  const clockFill = el('span', 'clock__fill');
  const clockBar = el('span', 'clock__bar');
  clockBar.append(clockFill);
  const clock = el('div', 'clock');
  clock.append(clockTime, clockBar);

  const scoreNum = el('span', 'scores__num', '0');
  const scoreBox = el('div', 'scores__box');
  scoreBox.append(scoreNum, el('span', 'scores__cap', config.scoreLabel));

  const bestNum = el('span', 'scores__num', String(storedBest));
  const bestBox = el('div', 'scores__box scores__box--best');
  bestBox.append(bestNum, el('span', 'scores__cap', 'best'));

  const scores = el('div', 'scores');
  scores.append(scoreBox, bestBox);

  const hud = el('div', 'hud');
  hud.append(clock, scores);

  const savedProgress = getProgress(config.id);
  const resumableProgress = savedProgress && savedProgress.remainingMs <= RUN_MS
    ? savedProgress
    : null;

  /* ------------------------------------------------------------ the table */

  const stage = el('div', 'stage');

  const message = el('p', 'message');
  message.setAttribute('aria-live', 'polite');

  const actionBtn = el('button', 'btn btn--primary');
  actionBtn.type = 'button';
  const actionBar = el('div', 'bar');
  actionBar.append(actionBtn);

  const overlay = el('div', 'overlay');

  // Order matters, and the player row is deliberately last: between the HUD and
  // the table it held ~70px of a phone screen, which pushed the clock away from
  // the board it is read against. Below the table it is still reachable — and
  // still in DOM order, so tabbing through stays honest — but it costs the game
  // nothing. Do not move it back above the stage.
  root.append(top, hud, stage, message, actionBar, soundbar, overlay);

  /* ------------------------------------------------------------------- run */

  let lastProgressSaveAt = 0;
  const run = createRun({
    onTick({ state, remainingMs, durationMs, score }) {
      clockTime.textContent = formatClock(remainingMs);
      clockFill.style.transform = `scaleX(${durationMs > 0 ? remainingMs / durationMs : 0})`;
      clock.classList.toggle('clock--low', remainingMs <= LOW_TIME_MS);
      scoreNum.textContent = String(score);
      bestNum.textContent = String(Math.max(storedBest, score));
      if (state === 'paused') persistProgress(true);
      else if (state === 'running') persistProgress();
    },
    onEnd({ score }) {
      finishRun(score);
    },
  });

  function persistProgress(force = false) {
    if (run.state !== 'running' && run.state !== 'paused') return;
    const now = Date.now();
    if (!force && now - lastProgressSaveAt < 2000) return;
    saveProgress(config.id, { score: run.score, remainingMs: run.remainingMs });
    lastProgressSaveAt = now;
  }

  const ctx = {
    config,
    run,
    rng: createRng(randomSeed()),
    stage,
    actionBar,
    message(text) {
      message.textContent = text || '';
    },
    addPoints(points) {
      run.addPoints(points);
      persistProgress(true);
    },
    setActionLabel(text) {
      actionBtn.textContent = text;
    },
    setActionEnabled(enabled) {
      actionBtn.disabled = !enabled;
    },
  };

  /* -------------------------------------------------------------- overlays */

  function showOverlay(panel) {
    overlay.replaceChildren(panel);
    overlay.hidden = false;
  }

  function showIdle() {
    const panel = el('div', 'panel');
    panel.append(
      el('p', 'panel__kicker', config.tagline),
      el('h2', 'panel__title', config.title),
      el('p', 'panel__rules', config.rules),
    );

    const track = el('p', 'panel__track');
    track.append(document.createTextNode('Themed after '));
    track.append(el('strong', null, config.track.title));
    track.append(document.createTextNode(' on Tabletop Audio'));
    panel.append(track);
    panel.append(el(
      'p',
      'panel__hint',
      'A ten-minute run. Choose whether to play the track.',
    ));

    const trackPreference = el('label', 'panel__pref');
    const playTrack = document.createElement('input');
    playTrack.type = 'checkbox';
    playTrack.checked = true;
    trackPreference.append(playTrack, document.createTextNode('Play the track'));
    panel.append(trackPreference);

    if (resumableProgress) {
      panel.append(el(
        'p',
        'panel__best',
        `Saved run: ${resumableProgress.score} ${config.scoreLabel}, ${formatClock(resumableProgress.remainingMs)} remaining.`,
      ));
      panel.append(el(
        'p',
        'panel__hint',
        'Resuming restores score and time; the game starts a fresh round.',
      ));
      panel.append(el('p', 'panel__hint', 'Or start a new run.'));
    }

    if (storedBest > 0) {
      panel.append(el('p', 'panel__best', `Your best: ${storedBest} ${config.scoreLabel}`));
    }

    const actions = el('div', 'panel__actions');
    if (resumableProgress) {
      const resume = el('button', 'btn btn--primary', 'Resume saved run');
      resume.type = 'button';
      resume.addEventListener('click', () => resumeRun(playTrack.checked));

      const startFresh = el('button', 'btn btn--ghost', 'Start new run');
      startFresh.type = 'button';
      startFresh.addEventListener('click', () => beginRun(playTrack.checked));
      actions.append(resume, startFresh);
    } else {
      const start = el('button', 'btn btn--primary', 'Start run');
      start.type = 'button';
      start.addEventListener('click', () => beginRun(playTrack.checked));
      actions.append(start);
    }
    panel.append(actions);

    showOverlay(panel);
  }

  function showSummary(score, isBest) {
    const panel = el('div', 'panel');
    panel.append(el('p', 'panel__kicker', 'The night ends'));
    panel.append(el('h2', 'panel__title', `${score} ${config.scoreLabel}`));

    if (isBest) {
      panel.append(el('p', 'panel__badge', 'New best'));
    } else {
      panel.append(el('p', 'panel__best', `Your best: ${storedBest} ${config.scoreLabel}`));
    }

    const again = el('button', 'btn btn--primary', 'Again');
    again.type = 'button';
    again.addEventListener('click', () => beginRun());

    const actions = el('div', 'panel__actions');
    actions.append(again);
    panel.append(actions);

    const ledger = el('a', 'panel__link', 'Back to the tavern \u2192');
    ledger.href = '../index.html';
    panel.append(ledger);

    showOverlay(panel);
  }

  /* ------------------------------------------------------------- lifecycle */

  let runWithAudio = false;

  function prepareRun(withAudio, trackPosition = 0) {
    overlay.hidden = true;
    overlay.replaceChildren();

    runWithAudio = withAudio;
    seekTrack(trackPosition);
    if (runWithAudio) {
      trackAudio.play().catch(() => {
        message.textContent = 'Track playback was blocked. Use the player controls to try again.';
      });
    } else {
      trackAudio.pause();
    }
  }

  function beginRun(withAudio = runWithAudio) {
    prepareRun(withAudio);

    // A fresh generator per run, so no two nights are the same.
    ctx.rng = createRng(randomSeed());

    ctx.message('');
    clearProgress(config.id);
    lastProgressSaveAt = 0;
    run.reset();
    run.start();
    if (game.start) game.start(ctx);
  }

  function resumeRun(withAudio) {
    const elapsedSeconds = (RUN_MS - resumableProgress.remainingMs) / 1000;
    prepareRun(withAudio, elapsedSeconds);
    ctx.message('');
    ctx.rng = createRng(randomSeed());
    run.resume();
    if (game.start) game.start(ctx);
  }

  function finishRun(score) {
    if (game.stop) game.stop(ctx);
    trackAudio.pause();
    clearProgress(config.id);

    actionBtn.disabled = true;

    const isBest = submitScore(config.id, score);
    storedBest = Math.max(storedBest, score);
    addRun(config.id);

    clockTime.textContent = formatClock(0);
    clockFill.style.transform = 'scaleX(0)';
    scoreNum.textContent = String(score);
    bestNum.textContent = String(storedBest);

    showSummary(score, isBest);
  }

  /* ---------------------------------------------------------------- input */

  // Mouse only. The primary action is a button and nothing else: no table on the
  // site binds a key, so there is no document-level key handling to guard.
  if (config.actionLabel) {
    actionBtn.textContent = config.actionLabel;
    actionBtn.addEventListener('click', () => {
      if (run.state !== 'running') return;
      if (game.act) game.act(ctx);
    });
  } else {
    actionBar.hidden = true;
  }

  /* ------------------------------------------------------------------ boot */

  if (game.mount) game.mount(ctx);
  if (resumableProgress) run.restore(resumableProgress);
  else run.reset();
  showIdle();

  window.addEventListener('pagehide', () => {
    if (run.state === 'running') run.pause();
    persistProgress(true);
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted && run.state === 'paused') run.resume();
  });
}
