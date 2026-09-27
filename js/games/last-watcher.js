/* ---------------------------------------------------------------------------
   The Last Watcher — keep the signal.

   Four beacons answer one another across the dark. Watch their sequence, then
   repeat it. Each completed watch adds one signal and quickens the relay, so
   the climb gets shorter and sharper as it goes; a missed beacon drops the
   watcher halfway back rather than to the opening pattern.
   --------------------------------------------------------------------------- */

import { plural } from '../dom.js';

const SIGNALS = [
  { id: 'harbour', name: 'Harbour', glyph: '\u25b3' },
  { id: 'headland', name: 'Headland', glyph: '\u2726' },
  { id: 'channel', name: 'Channel', glyph: '\u25bd' },
  { id: 'reef', name: 'Reef', glyph: '\u2739' },
];

const START_LENGTH = 3;
const FLASH_MS = 520;
const GAP_MS = 260;
const RESET_MS = 1100;
const IDLE_BASE_MS = 3000;
const IDLE_PER_SIGNAL_MS = 400;

/* The relay quickens as the climb goes on, the way Escape the Hold's pursuer
   does. Flash and gap shrink together, which holds the watching phase near five
   seconds however long the sequence gets: higher rounds are denser, never
   longer. The floors stop the beacons blurring into one another. */
const RELAY_SPEEDUP = 1.08;
const MIN_FLASH_MS = 200;
const MIN_GAP_MS = 80;

function flashFor(length) {
  return Math.max(MIN_FLASH_MS, FLASH_MS / RELAY_SPEEDUP ** (length - START_LENGTH));
}

function gapFor(length) {
  return Math.max(MIN_GAP_MS, GAP_MS / RELAY_SPEEDUP ** (length - START_LENGTH));
}

function relayGain(length) {
  return Math.round((1 - flashFor(length) / FLASH_MS) * 100);
}

const game = {
  id: 'last-watcher',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'watcher';

    const readout = document.createElement('div');
    readout.className = 'watcher__readout';

    const stat = (label, quiet) => {
      const box = document.createElement('div');
      box.className = 'watcher__stat';
      const caption = document.createElement('span');
      caption.className = 'watcher__stat-label';
      caption.textContent = label;
      const value = document.createElement('strong');
      value.className = `watcher__stat-value${quiet ? ' watcher__stat-value--quiet' : ''}`;
      value.textContent = '0';
      box.append(caption, value);
      return { box, value };
    };

    const signals = stat('Signals');
    const deepest = stat('Deepest', true);
    const relay = stat('Relay', true);
    this.signalsValue = signals.value;
    this.deepestValue = deepest.value;
    this.relayValue = relay.value;
    readout.append(signals.box, deepest.box, relay.box);

    this.progress = document.createElement('p');
    this.progress.className = 'watcher__progress';
    this.progress.setAttribute('aria-live', 'polite');

    this.board = document.createElement('div');
    this.board.className = 'watcher__board';

    this.buttons = SIGNALS.map((signal, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `watcher__signal watcher__signal--${signal.id}`;
      button.setAttribute('aria-label', `${signal.name} beacon`);

      const glyph = document.createElement('span');
      glyph.className = 'watcher__glyph';
      glyph.textContent = signal.glyph;
      glyph.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'watcher__label';
      label.textContent = signal.name;
      label.setAttribute('aria-hidden', 'true');

      button.append(glyph, label);
      button.addEventListener('click', () => this.answer(index));
      this.board.append(button);
      return button;
    });

    wrap.append(readout, this.progress, this.board);
    ctx.stage.append(wrap);

    document.addEventListener('visibilitychange', () => {
      if (!this.alive) return;
      if (document.hidden) this.pauseWatch();
      else this.resumeWatch();
    });
  },

  start(ctx) {
    this.alive = true;
    this.pausedPhase = null;
    this.deepest = 0;
    this.paintStats(START_LENGTH);
    this.beginWatch(ctx, START_LENGTH);
  },

  stop() {
    this.alive = false;
    this.phase = 'stopped';
    this.clearTimers();
    this.setEnabled(false);
  },

  clearTimers() {
    for (const timer of this.timers || []) clearTimeout(timer);
    this.timers = [];
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  },

  setEnabled(enabled) {
    for (const button of this.buttons) button.disabled = !enabled;
  },

  beginWatch(ctx, length, sequence = null) {
    if (!this.alive) return;

    this.clearTimers();
    this.phase = 'showing';
    this.sequence = sequence || [];
    this.position = 0;
    this.timers = [];

    if (!sequence) {
      for (let index = 0; index < length; index += 1) {
        this.sequence.push(Math.floor(ctx.rng() * SIGNALS.length));
      }
    }

    this.progress.textContent = `Watch ${length} signals`;
    this.setEnabled(false);
    this.paintStats(length);
    ctx.message('Watch the beacons, then click them back in the order they flashed.');

    this.playSequence(ctx);
  },

  playSequence(ctx) {
    const showStart = 650;
    const length = this.sequence.length;
    const flash = flashFor(length);
    const gap = gapFor(length);

    for (let index = 0; index < length; index += 1) {
      const signalIndex = this.sequence[index];
      const onAt = showStart + index * (flash + gap);

      this.timers.push(setTimeout(() => {
        if (!this.alive || this.phase !== 'showing') return;
        this.light(signalIndex, true);
        ctx.message(`${SIGNALS[signalIndex].name} beacon.`);
      }, onAt));

      this.timers.push(setTimeout(() => {
        this.light(signalIndex, false);
      }, onAt + flash));
    }

    const inputAt = showStart + length * (flash + gap);
    this.timers.push(setTimeout(() => {
      if (!this.alive || this.phase !== 'showing') return;
      this.phase = 'input';
      this.position = 0;
      this.setEnabled(true);
      this.setInputPrompt();
      ctx.message('Your turn.');
      this.armIdle();
    }, inputAt));
  },

  light(index, on) {
    this.buttons[index].classList.toggle('watcher__signal--lit', on);
  },

  setInputPrompt() {
    const total = this.sequence.length;
    this.progress.textContent = `Repeat ${total} signals \u00b7 ${this.position} of ${total}`;
  },

  /* Stalling mid-input means the player lost their place, so the watcher runs
     the sequence again from the top rather than letting a guess decide it.
     Longer sequences are allowed longer to think in, or the replay would
     interrupt recall instead of rescuing it. */
  armIdle() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (!this.alive || this.phase !== 'input') return;
      this.replaySequence();
    }, IDLE_BASE_MS + this.sequence.length * IDLE_PER_SIGNAL_MS);
  },

  paintStats(length = this.sequence?.length ?? START_LENGTH) {
    const gain = relayGain(length);
    this.signalsValue.textContent = String(length);
    this.deepestValue.textContent = String(this.deepest ?? 0);
    this.relayValue.textContent = gain > 0 ? `+${gain}%` : 'normal';
    this.signalsValue.classList.toggle('watcher__stat-value--hot', length > START_LENGTH);
  },

  replaySequence() {
    this.phase = 'showing';
    this.position = 0;
    this.setEnabled(false);
    this.progress.textContent = `Watching again \u00b7 ${this.sequence.length} signals`;
    this.ctx.message('Signal repeated \u2014 watch the beacons again.');
    this.playSequence(this.ctx);
  },

  pauseWatch() {
    if (!['showing', 'input', 'transition', 'resetting'].includes(this.phase)) return;
    this.pausedPhase = this.phase;
    this.phase = 'paused';
    this.clearTimers();
    for (const button of this.buttons) {
      button.classList.remove('watcher__signal--lit', 'watcher__signal--wrong');
    }
    this.setEnabled(false);
    this.ctx.message('Watch paused. Return to the beacons to continue.');
  },

  resumeWatch() {
    if (!this.pausedPhase) return;
    const phase = this.pausedPhase;
    this.pausedPhase = null;

    if (phase === 'showing') {
      this.phase = 'showing';
      this.playSequence(this.ctx);
    } else if (phase === 'input') {
      this.phase = 'input';
      this.setEnabled(true);
      this.setInputPrompt();
      this.armIdle();
      this.ctx.message('Your turn.');
    } else if (phase === 'transition') {
      this.beginWatch(this.ctx, this.nextLength, this.nextSequence);
    } else if (phase === 'resetting') {
      this.beginWatch(this.ctx, this.restartLength ?? START_LENGTH);
    }
  },

  answer(index) {
    if (!this.alive || this.phase !== 'input') return;

    const ctx = this.ctx;
    const expected = this.sequence[this.position];

    if (index !== expected) {
      const lost = this.sequence.length;
      const fallen = Math.max(START_LENGTH, Math.floor(lost / 2));

      this.phase = 'resetting';
      this.restartLength = fallen;
      this.setEnabled(false);
      this.buttons[index].classList.add('watcher__signal--wrong');
      this.progress.textContent = `Signal lost \u00b7 ${lost} \u2192 ${fallen}`;
      ctx.message(`Not quite. The watch falls from ${lost} to ${fallen} ${plural(fallen, 'signal')}.`);
      this.paintStats();

      this.clearTimers();
      this.timers.push(setTimeout(() => {
        this.buttons[index].classList.remove('watcher__signal--wrong');
        if (this.alive) this.beginWatch(ctx, fallen);
      }, RESET_MS));
      return;
    }

    this.light(index, true);
    this.timers.push(setTimeout(() => this.light(index, false), 160));
    this.position += 1;

    if (this.position < this.sequence.length) {
      this.setInputPrompt();
      this.armIdle();
      return;
    }

    const completed = this.sequence.length;
    const record = completed > (this.deepest ?? 0);
    this.deepest = Math.max(this.deepest ?? 0, completed);
    ctx.addPoints(completed);
    this.progress.textContent = `Watch kept \u00b7 ${completed} signals`;
    ctx.message(record
      ? `Deepest yet \u2014 ${completed} ${plural(completed, 'signal')} held, worth ${completed} ${plural(completed, 'point')}. The relay quickens.`
      : `Signal held \u2014 ${completed} ${plural(completed, 'signal')}, worth ${completed} ${plural(completed, 'point')}. The relay quickens.`);
    this.paintStats();

    this.phase = 'transition';
    this.setEnabled(false);
    this.nextLength = completed + 1;
    this.nextSequence = [...this.sequence, Math.floor(ctx.rng() * SIGNALS.length)];
    this.timers.push(setTimeout(() => {
      if (this.alive) this.beginWatch(ctx, this.nextLength, this.nextSequence);
    }, 700));
  },
};

export default game;