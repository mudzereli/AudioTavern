/* ---------------------------------------------------------------------------
   The Last Watcher — keep the signal.

   Four beacons answer one another across the dark. Watch their sequence, then
   repeat it. Each completed watch adds one signal; a mistake sends the watcher
   back to the opening pattern, ready to try again.
   --------------------------------------------------------------------------- */

const SIGNALS = [
  { id: 'north', name: 'North', glyph: '\u25b3' },
  { id: 'east', name: 'East', glyph: '\u2726' },
  { id: 'south', name: 'South', glyph: '\u25bd' },
  { id: 'west', name: 'West', glyph: '\u2739' },
];

const START_LENGTH = 3;
const MAX_LENGTH = 8;
const FLASH_MS = 520;
const GAP_MS = 260;
const RESET_MS = 1100;

const game = {
  id: 'last-watcher',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'watcher';

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

    wrap.append(this.progress, this.board);
    ctx.stage.append(wrap);

    document.addEventListener('keydown', (event) => {
      if (!this.alive || this.phase !== 'input') return;
      if (!/^[1-4]$/.test(event.key)) return;
      event.preventDefault();
      this.answer(Number(event.key) - 1);
    });

    document.addEventListener('visibilitychange', () => {
      if (!this.alive) return;
      if (document.hidden) this.pauseWatch();
      else this.resumeWatch();
    });
  },

  start(ctx) {
    this.alive = true;
    this.pausedPhase = null;
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
    ctx.message('Watch the beacons, then repeat them. Keys 1 through 4 map north, east, south, west.');

    this.playSequence(ctx);
  },

  playSequence(ctx) {
    const showStart = 650;
    for (let index = 0; index < this.sequence.length; index += 1) {
      const signalIndex = this.sequence[index];
      const onAt = showStart + index * (FLASH_MS + GAP_MS);

      this.timers.push(setTimeout(() => {
        if (!this.alive || this.phase !== 'showing') return;
        this.light(signalIndex, true);
        ctx.message(`${SIGNALS[signalIndex].name} beacon.`);
      }, onAt));

      this.timers.push(setTimeout(() => {
        this.light(signalIndex, false);
      }, onAt + FLASH_MS));
    }

    const inputAt = showStart + this.sequence.length * (FLASH_MS + GAP_MS);
    this.timers.push(setTimeout(() => {
      if (!this.alive || this.phase !== 'showing') return;
      this.phase = 'input';
      this.position = 0;
      this.setEnabled(true);
      this.progress.textContent = `Repeat ${length} signals`;
      ctx.message('Your turn.');
    }, inputAt));
  },

  light(index, on) {
    this.buttons[index].classList.toggle('watcher__signal--lit', on);
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
      this.ctx.message('Your turn.');
    } else if (phase === 'transition') {
      this.beginWatch(this.ctx, this.nextLength, this.nextSequence);
    } else if (phase === 'resetting') {
      this.beginWatch(this.ctx, START_LENGTH);
    }
  },

  answer(index) {
    if (!this.alive || this.phase !== 'input') return;

    const ctx = this.ctx;
    const expected = this.sequence[this.position];

    if (index !== expected) {
      this.phase = 'resetting';
      this.setEnabled(false);
      this.buttons[index].classList.add('watcher__signal--wrong');
      this.progress.textContent = 'Signal lost';
      ctx.message(`Not quite. The watcher starts again with ${START_LENGTH} signals.`);

      this.clearTimers();
      this.timers.push(setTimeout(() => {
        this.buttons[index].classList.remove('watcher__signal--wrong');
        if (this.alive) this.beginWatch(ctx, START_LENGTH);
      }, RESET_MS));
      return;
    }

    this.light(index, true);
    this.timers.push(setTimeout(() => this.light(index, false), 160));
    this.position += 1;

    if (this.position < this.sequence.length) return;

    const completed = this.sequence.length;
    ctx.addPoints(completed);
    this.progress.textContent = `Watch kept · ${completed} signals`;
    ctx.message(`Signal held. +${completed}.`);

    this.phase = 'transition';
    this.setEnabled(false);
    this.nextLength = completed >= MAX_LENGTH ? START_LENGTH : completed + 1;
    this.nextSequence = completed >= MAX_LENGTH
      ? null
      : [...this.sequence, Math.floor(ctx.rng() * SIGNALS.length)];
    this.timers.push(setTimeout(() => {
      if (this.alive) this.beginWatch(ctx, this.nextLength, this.nextSequence);
    }, 700));
  },
};

export default game;