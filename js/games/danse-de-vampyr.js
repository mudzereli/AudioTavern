import { el, plural } from '../dom.js';

const TICK_MS = 16;

const START_BEAT_MS = 780;
const ACT_TEMPO_STEP_MS = 30;
const MULTIPLIER_TEMPO_STEP_MS = 12;
const MIN_BEAT_MS = 560;

const HOLD_GRACE_MS = 170;

const HOLD_START_MS = 1500;
const HOLD_STEP_MS = 50;
const MIN_HOLD_MS = 1100;

const MAX_DANSE_BEATS_START = 7;
const MAX_DANSE_BEATS_FINAL = 12;

const MULTIPLIER_CAP = 10;
const SETTLE_MS = 950;
const ACTS = ['The Invitation', 'Hesitation', 'The Mirror', 'Masquerade', 'Grand Dance'];
const ACT_PATTERN_COUNTS = [1, 2, 4, 6, 8];
const PATTERNS = [
  [1, 1, 1, 1], [1, 0, 1, 0], [1, 1, 0, 1], [1, 0, 0, 1],
  [0, 1, 1, 0], [1, 0, 1, 1], [0, 1, 0, 1], [0, 0, 1, 1],
];

const game = {
  id: 'danse-de-vampyr',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = el('section', 'danse');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'The vampire ballroom');

    const readout = el('div', 'danse__readout');

    const grace = el('div', 'danse__stat');
    grace.append(el('span', 'danse__label', 'Grace'));
    this.graceValue = el('strong', 'danse__value', '0');
    grace.append(this.graceValue);

    const steps = el('div', 'danse__stat');
    steps.append(el('span', 'danse__label', 'Steps'));
    this.stepsValue = el('strong', 'danse__stat-value', '0');
    steps.append(this.stepsValue);

    const multiplier = el('div', 'danse__stat');
    multiplier.append(el('span', 'danse__label', 'Multiplier'));
    this.multiplierValue = el('strong', 'danse__stat-value', '\u00d71');
    multiplier.append(this.multiplierValue);

    const danse = el('div', 'danse__stat');
    danse.append(el('span', 'danse__label', 'Danse'));
    this.danseValue = el('strong', 'danse__stat-value', '1');
    danse.append(this.danseValue);

    readout.append(grace, steps, multiplier, danse);

    const hall = el('div', 'danse__hall');

    const arches = el('div', 'danse__arches');
    arches.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 3; index += 1) arches.append(el('span', 'danse__arch'));

    this.phrase = el('div', 'danse__phrases');
    this.phrase.setAttribute('role', 'group');
    this.phrase.setAttribute('aria-label', 'Dance steps timeline');
    this.currentMeasureCues = el('div', 'danse__measure-cues');
    this.phraseSlots = [];
    this.playhead = el('span', 'danse__playhead');
    this.playhead.setAttribute('aria-hidden', 'true');
    this.phrase.append(this.currentMeasureCues, this.playhead);

    const floor = el('div', 'danse__floor');
    floor.setAttribute('aria-hidden', 'true');

    this.dancers = el('div', 'danse__dancers');
    this.dancers.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 6; index += 1) {
      const dancer = el('span', 'danse__dancer');
      dancer.append(el('span', 'danse__dancer-head'), el('span', 'danse__dancer-body'));
      this.dancers.append(dancer);
    }

    this.host = el('div', 'danse__host');
    this.host.setAttribute('aria-hidden', 'true');
    this.host.append(el('span', 'danse__host-eye'), el('span', 'danse__host-eye'));

    this.stateLabel = el('p', 'danse__state', 'The orchestra plays');
    this.stateLabel.setAttribute('aria-live', 'polite');

    hall.append(arches, floor, this.dancers, this.host, this.stateLabel, this.phrase);

    this.hint = el(
      'p',
      'danse__hint',
      'Step on STEP beats, stay still for WATCH, then hold when the music stops.',
    );

    wrap.append(readout, hall, ctx.actionBar, this.hint);
    this.hall = hall;
    ctx.stage.append(wrap);
    this.wrap = wrap;

    document.addEventListener('visibilitychange', () => this.handleVisibility());
  },

  start(ctx) {
    this.alive = true;
    this.multiplier = 1;
    this.survived = 0;
    this.danseNumber = 0;
    this.actIndex = -1;
    this.patternDeck = [];
    this.lastPattern = -1;
    this.previousBeatInterval = null;
    this.hiddenAt = null;
    this.steps = 0;
    this.phase = 'ready';
    this.phrase.hidden = true;
    this.stateLabel.textContent = 'The orchestra is ready';
    this.hint.textContent = 'Press Start when you are ready.';
    ctx.setActionLabel('Start');
    ctx.setActionEnabled(true);
    ctx.message('Press Start when you are ready.');
    this.paint();
  },

  stop() {
    this.alive = false;
    this.phase = 'stopped';
    this.stopClock();
    clearTimeout(this.settleTimer);
    this.clearHitFlash();
    if (this.wrap) {
      this.wrap.classList.remove('danse--dance', 'danse--hold', 'danse--tell');
      this.wrap.classList.add('danse--stopped');
    }
    if (this.ctx) this.ctx.setActionEnabled(false);
  },

  clearHitFlash() {
    clearTimeout(this.hitFlashTimer);
    this.hitFlashTimer = null;
    if (this.hitCue) this.hitCue.classList.remove('danse__cue--hit');
    this.hitCue = null;
  },

  newDanse(ctx) {
    clearTimeout(this.settleTimer);
    this.clearHitFlash();
    this.danseNumber += 1;
    this.steps = 0;
    this.lastPressBeat = -1;
    this.toldFalter = false;

    const elapsed = ctx.run.durationMs - ctx.run.remainingMs;
    const act = Math.min(ACTS.length - 1, Math.floor(elapsed * ACTS.length / ctx.run.durationMs));
    const actChanged = act !== this.actIndex;
    if (actChanged) {
      this.actIndex = act;
      this.patternDeck = [];
      this.wrap.dataset.act = String(act);
    }

    this.beatInterval = Math.max(
      MIN_BEAT_MS,
      START_BEAT_MS - this.actIndex * ACT_TEMPO_STEP_MS - (this.multiplier - 1) * MULTIPLIER_TEMPO_STEP_MS,
    );
    const mostBeats = Math.min(MAX_DANSE_BEATS_FINAL, MAX_DANSE_BEATS_START + this.survived);
    this.danseBeats = 4 * (1 + Math.floor(ctx.rng() * Math.ceil(mostBeats / 4)));
    this.dansePattern = [];
    this.bars = [];
    for (let bar = 0; bar < this.danseBeats / 4; bar += 1) {
      const pattern = this.danseNumber === 1 ? 0 : this.drawPattern(ctx);
      this.lastPattern = pattern;
      this.bars.push(pattern);
      this.dansePattern.push(...PATTERNS[pattern]);
    }
    this.phraseSlots = this.dansePattern.map((step, index) => {
      const cue = el('span', `danse__cue ${step ? 'danse__cue--step' : 'danse__cue--watch'}`, step ? 'STEP' : 'WATCH');
      cue.dataset.beat = String(index + 1);
      cue.setAttribute('aria-label', step ? 'Step on the beat' : 'The host is watching; stay still');
      return cue;
    });
    this.graceCue = el('span', 'danse__cue danse__cue--grace');
    this.graceCue.setAttribute('aria-hidden', 'true');
    this.holdCue = el('span', 'danse__cue danse__cue--hold', 'HOLD');
    this.holdCue.setAttribute('aria-label', 'Hold still when the music stops');
    this.currentMeasureCues.replaceChildren(this.graceCue, ...this.phraseSlots, this.holdCue);
    this.phrasePadding = null;
    this.beatResults = Array(this.danseBeats);
    this.activeBeat = -1;
    this.activeStepIndex = -1;
    this.holdMs = Math.max(MIN_HOLD_MS, HOLD_START_MS - this.survived * HOLD_STEP_MS);
    this.stepPose = false;
    this.holdStartedAt = 0;

    this.phase = 'dance';
    this.phrase.hidden = false;
    this.beatOrigin = performance.now() + this.beatInterval;

    this.wrap.classList.remove('danse--survived', 'danse--caught', 'danse--hold', 'danse--tell');
    this.dancers.classList.remove('danse__dancers--step');
    this.stateLabel.textContent = ACTS[this.actIndex];
    this.hint.textContent = 'Step on STEP beats, stay still for WATCH, then hold when the music stops.';
    // The button never asks to be pressed, so it keeps one label all night.
    ctx.setActionLabel('Step');
    ctx.setActionEnabled(true);
    const quickened = this.previousBeatInterval === null
      || this.beatInterval < this.previousBeatInterval;
    this.previousBeatInterval = this.beatInterval;
    ctx.message(`${actChanged ? `${ACTS[this.actIndex]}. ` : ''}${this.danseNumber === 1
      ? 'The orchestra begins. Step on called beats, and be still when the measure resolves.'
      : quickened
        ? `Danse ${this.danseNumber}. The orchestra quickens with your multiplier.`
        : `Danse ${this.danseNumber}. A slower measure \u2014 the multiplier is \u00d7${this.multiplier}.`}`);
    this.showPhrase(-1);
    this.positionPhrase(-1);
    this.paint();
    this.startClock();
  },

  drawPattern(ctx) {
    if (!this.patternDeck.length) {
      this.patternDeck = Array.from({ length: ACT_PATTERN_COUNTS[this.actIndex] }, (_, index) => index);
      for (let index = this.patternDeck.length - 1; index > 0; index -= 1) {
        const other = Math.floor(ctx.rng() * (index + 1));
        [this.patternDeck[index], this.patternDeck[other]] = [this.patternDeck[other], this.patternDeck[index]];
      }
      const last = this.patternDeck.length - 1;
      if (last > 0 && this.patternDeck[last] === this.lastPattern) {
        [this.patternDeck[0], this.patternDeck[last]] = [this.patternDeck[last], this.patternDeck[0]];
      }
    }
    this.lastPattern = this.patternDeck.pop();
    return this.lastPattern;
  },

  showPhrase(beatIndex) {
    if (beatIndex < 0) {
      this.phraseSlots.forEach((slot) => slot.classList.remove('danse__cue--active'));
      this.activeBeat = -1;
      this.activeStepIndex = -1;
      return;
    }
    this.activeStepIndex = beatIndex;
    if (beatIndex !== this.activeBeat) {
      this.phraseSlots.forEach((slot, index) => slot.classList.toggle('danse__cue--active', index === beatIndex));
      this.activeBeat = beatIndex;
    }
  },

  cueAtPlayhead(playheadRect = this.playhead.getBoundingClientRect()) {
    return this.phraseSlots.findIndex((cue) => {
      const rect = cue.getBoundingClientRect();
      return rect.left <= playheadRect.right && rect.right >= playheadRect.left;
    });
  },

  positionPhrase(progress) {
    const viewportWidth = this.phrase.clientWidth;
    const firstCueWidth = this.graceCue.offsetWidth;
    const sidePadding = Math.max(0, (viewportWidth - firstCueWidth) / 2);
    if (sidePadding !== this.phrasePadding) {
      this.currentMeasureCues.style.paddingInline = `${sidePadding}px`;
      this.phrasePadding = sidePadding;
    }
    const firstRight = this.graceCue.offsetLeft + this.graceCue.offsetWidth;
    const stride = this.phraseSlots[0].offsetLeft - this.graceCue.offsetLeft;
    const offset = viewportWidth / 2 - firstRight - stride * progress;
    this.currentMeasureCues.style.transform = `translate3d(${offset}px, 0, 0)`;
  },

  startClock() {
    this.stopClock();
    this.clock = setInterval(() => this.tick(), TICK_MS);
  },

  stopClock() {
    if (this.clock != null) {
      clearInterval(this.clock);
      this.clock = null;
    }
  },

  tick() {
    if (!this.alive) return;
    const now = performance.now();

    if (this.phase === 'dance') {
      const elapsed = now - this.beatOrigin;
      if (elapsed < 0) {
        this.showPhrase(-1);
        this.positionPhrase(elapsed / this.beatInterval);
        return;
      }
      const timelineProgress = elapsed / this.beatInterval;
      this.positionPhrase(timelineProgress);
      if (timelineProgress < 1) {
        this.showPhrase(-1);
        this.wrap.classList.remove('danse--watch');
        return;
      }
      const beatProgress = timelineProgress - 1;
      const beatIndex = Math.floor(beatProgress);
      const playheadRect = this.playhead.getBoundingClientRect();
      let missedStep = false;
      for (let beat = 0; beat < this.danseBeats; beat += 1) {
        const cueRight = this.phraseSlots[beat].getBoundingClientRect().right;
        if (this.dansePattern[beat] && this.beatResults[beat] === undefined && cueRight < playheadRect.left) {
          this.beatResults[beat] = false;
          missedStep = true;
        }
      }
      if (missedStep && this.multiplier !== 1) {
        this.multiplier = 1;
        this.paint();
      }
      if (beatIndex >= this.danseBeats) {
        this.beginHold(now);
        return;
      }
      const cueBeat = this.cueAtPlayhead(playheadRect);
      this.showPhrase(cueBeat);
      this.wrap.classList.toggle('danse--watch', cueBeat >= 0 && this.dansePattern[cueBeat] === 0);

      const pose = beatIndex % 2 === 1;
      if (pose !== this.stepPose) {
        this.stepPose = pose;
        this.dancers.classList.toggle('danse__dancers--step', pose);
      }

      if (!this.toldFalter && beatIndex === this.danseBeats - 1) {
        this.toldFalter = true;
        this.wrap.classList.add('danse--tell');
        this.stateLabel.textContent = 'The music falters\u2026';
        this.ctx.message('The music falters \u2014 be ready to stop.');
      }

      return;
    }

    if (this.phase === 'hold' && now >= this.holdEndsAt) this.survive();
  },

  act(ctx) {
    if (!this.alive) return;
    if (this.phase === 'ready') {
      this.newDanse(ctx);
      return;
    }
    if (this.phase === 'hold') {
      // A press already in flight when the measure resolved is not a mistake.
      if (performance.now() - this.holdStartedAt < HOLD_GRACE_MS) return;
      this.caught();
      return;
    }
    if (this.phase !== 'dance') return;
    this.step();
  },

  step() {
    if (performance.now() < this.beatOrigin) {
      this.ctx.message('Wait for the first beat before stepping.');
      return;
    }
    const beat = this.cueAtPlayhead();
    if (beat < 0) {
      this.ctx.message('Wait until a cue reaches the playhead.');
      return;
    }
    if (beat >= this.danseBeats) return;
    if (beat === this.lastPressBeat) {
      this.ctx.message('This beat was already counted. Wait for the next beat.');
      return;
    }
    this.lastPressBeat = beat;
    this.showPhrase(beat);

    const activeCue = this.phraseSlots[beat];
    if (activeCue.classList.contains('danse__cue--step')) {
      this.steps += 1;
      this.beatResults[beat] = true;
      this.clearHitFlash();
      this.hitCue = activeCue;
      activeCue.classList.add('danse__cue--hit');
      this.hitFlashTimer = setTimeout(() => this.clearHitFlash(), 220);
    } else {
      this.beatResults[beat] = false;
      this.multiplier = 1;
      this.ctx.message(this.dansePattern[beat] ? 'Out of step \u2014 that beat is lost.' : 'A step on the rest \u2014 the host notices.');
    }
    this.paint();
  },

  beginHold(now) {
    this.phase = 'hold';
    this.clearHitFlash();
    this.holdStartedAt = now;
    this.holdEndsAt = now + this.holdMs;
    this.positionPhrase(this.danseBeats + 1);
    this.wrap.classList.remove('danse--tell');
    this.wrap.classList.add('danse--hold');
    this.dancers.classList.remove('danse__dancers--step');
    this.stateLabel.textContent = 'The music stops \u2014 hold still';
    this.hint.textContent = 'Do not move. Any step now is noticed by the host.';
    this.ctx.message('The music stops. Hold still \u2014 anything moving is noticed.');
    this.paint();
  },

  survive() {
    this.phase = 'survived';
    this.stopClock();

    const multiplierUsed = this.multiplier;
    const award = this.steps * multiplierUsed;
    if (award > 0) this.ctx.addPoints(award);

    const clean = this.dansePattern.reduce((total, step, beat) => total + (step ? this.beatResults[beat] === true : this.beatResults[beat] !== false), 0);
    const flawless = this.dansePattern.every((step, beat) => (
      step ? this.beatResults[beat] === true : this.beatResults[beat] !== false
    ));
    const raised = flawless && multiplierUsed < MULTIPLIER_CAP;
    if (raised) this.multiplier += 1;
    this.survived += 1;

    const hit = Math.min(this.steps, this.danseBeats);
    const move = raised
      ? `\u00d7${multiplierUsed} \u2192 \u00d7${this.multiplier}`
      : `multiplier holds at \u00d7${this.multiplier}`;

    this.wrap.classList.remove('danse--hold', 'danse--tell');
    this.wrap.classList.add('danse--survived');
    this.stateLabel.textContent = 'The hall breathes again';
    this.hint.textContent = `${hit} steps \u00b7 ${clean}/${this.danseBeats} beats clean \u00b7 ${move}`;
    this.ctx.setActionEnabled(false);
    this.ctx.message(
      `Held still \u00b7 ${clean} of ${this.danseBeats} beats clean; ${award} grace. `
      + (raised ? `Multiplier \u00d7${this.multiplier}.` : 'The multiplier holds.'),
    );

    this.paint();
    this.settle();
  },

  caught() {
    this.phase = 'caught';
    this.stopClock();
    const lost = this.steps;
    const from = this.multiplier;
    this.multiplier = 1;

    this.wrap.classList.remove('danse--hold', 'danse--tell');
    this.wrap.classList.add('danse--caught');
    this.stateLabel.textContent = 'The host has seen you';
    this.hint.textContent = from > 1
      ? `You moved during the hold. Multiplier \u00d7${from} \u2192 \u00d7${this.multiplier}; danse ${this.danseNumber + 1} begins shortly.`
      : `You moved during the hold. Danse ${this.danseNumber + 1} begins shortly.`;
    this.ctx.setActionEnabled(false);
    this.ctx.message(from > 1
      ? `You moved. ${lost} ${plural(lost, 'step')} lost, and the multiplier resets: \u00d7${from} \u2192 \u00d71.`
      : `You moved. ${lost} ${plural(lost, 'step')} lost. Multiplier stays at \u00d71.`);

    this.paint();
    this.settle();
  },

  settle() {
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      if (this.alive) this.newDanse(this.ctx);
    }, SETTLE_MS);
  },

  paint() {
    if (!this.wrap) return;
    const steps = this.steps ?? 0;
    const multiplier = this.multiplier ?? 1;
    this.graceValue.textContent = String(steps * multiplier);
    this.stepsValue.textContent = String(steps);
    this.multiplierValue.textContent = `\u00d7${multiplier}`;
    this.danseValue.textContent = String(this.danseNumber ?? 1);
    this.wrap.classList.toggle('danse--dance', this.phase === 'dance');
    this.wrap.classList.toggle('danse--hold', this.phase === 'hold');
  },

  handleVisibility() {
    if (!this.alive) return;

    if (document.hidden) {
      this.hiddenAt = performance.now();
      this.stopClock();
      this.ctx.message('The hall waits. Return to continue the danse.');
      return;
    }

    if (this.hiddenAt === null) return;
    const gap = performance.now() - this.hiddenAt;
    this.hiddenAt = null;
    if (this.beatOrigin != null) this.beatOrigin += gap;
    if (this.holdEndsAt != null) this.holdEndsAt += gap;
    if (this.phase === 'dance' || this.phase === 'hold') this.startClock();
  },
};

export default game;
