/* ---------------------------------------------------------------------------
   Danse de Vampyr - dance while the orchestra plays, and do not move when the
   measure resolves.

   The track itself never stops. Each danse runs on its own internal beat
   clock; when the measure resolves the hall goes rigid and a single step is
   noticed by the host. Grace is banked only on a survived hold, and a danse
   danced without a misstep is what raises the multiplier.
   --------------------------------------------------------------------------- */

const TICK_MS = 40;

/** Tempo follows the multiplier: the deeper you go, the faster the beat, and a
    catch that resets the multiplier slows the music back down. The floor is
    reached at the top multiplier. */
const START_BEAT_MS = 780;
const TEMPO_STEP_MS = 52;
const MIN_BEAT_MS = 520;

/** How much of a beat counts as being in time. A fraction of the beat, so the
    timing stays equally demanding as the tempo rises. */
const TOLERANCE_RATIO = 0.2;
const MIN_TOLERANCE_MS = 95;

/** How long the landing ring stays lit, as a fraction of the beat, on either
    side of the beat. The whole flash sits inside the timing tolerance, so a step
    taken the moment it lights up always counts. */
const BEAT_FLASH_RATIO = 0.18;

/** The size of the target ring around the chandelier, as a fraction of the
    metronome. The beat ring contracts inward and sits exactly here while the
    flash is lit, so the two rings are concentric at every beat. */
const APPROACH_LAND_SCALE = 0.7;

/** Forgive a press that was already in flight when the measure resolved. */
const HOLD_GRACE_MS = 170;

/** The hold: generous early, never a formality later. */
const HOLD_START_MS = 1500;
const HOLD_STEP_MS = 50;
const MIN_HOLD_MS = 1100;

/** Each danse's length is random and grows, so the resolve cannot be counted. */
const MIN_DANSE_BEATS = 4;
const MAX_DANSE_BEATS_START = 7;
const MAX_DANSE_BEATS_FINAL = 12;

const MULTIPLIER_CAP = 6;

/** Pause on the failure and success screens, long enough to read them. */
const SETTLE_MS = 950;

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

const game = {
  id: 'danse-de-vampyr',

  mount(ctx) {
    this.ctx = ctx;
    this.reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const wrap = el('section', 'danse');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'The vampire ballroom');

    const readout = el('div', 'danse__readout');

    const grace = el('div', 'danse__stat');
    grace.append(el('span', 'danse__label', 'Grace this danse'));
    this.graceValue = el('strong', 'danse__value', '0');
    grace.append(this.graceValue);

    const streak = el('div', 'danse__stat');
    streak.append(el('span', 'danse__label', 'In step'));
    this.streakValue = el('strong', 'danse__stat-value', '0');
    streak.append(this.streakValue);

    const multiplier = el('div', 'danse__stat');
    multiplier.append(el('span', 'danse__label', 'Multiplier'));
    this.multiplierValue = el('strong', 'danse__stat-value', '\u00d71');
    multiplier.append(this.multiplierValue);

    const danse = el('div', 'danse__stat');
    danse.append(el('span', 'danse__label', 'Danse'));
    this.danseValue = el('strong', 'danse__stat-value', '1');
    danse.append(this.danseValue);

    readout.append(grace, streak, multiplier, danse);

    const hall = el('div', 'danse__hall');

    const arches = el('div', 'danse__arches');
    arches.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 3; index += 1) arches.append(el('span', 'danse__arch'));

    this.chandelier = el('div', 'danse__chandelier');
    this.chandelier.setAttribute('aria-hidden', 'true');

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

    // The chandelier marks the beat: a ring closes on it and lands as you step.
    const metronome = el('div', 'danse__metronome');
    metronome.setAttribute('aria-hidden', 'true');
    this.approachRing = el('span', 'danse__approach');
    this.beatTarget = el('span', 'danse__target');
    metronome.append(this.approachRing, this.chandelier, this.beatTarget);

    hall.append(arches, metronome, floor, this.dancers, this.host, this.stateLabel);

    this.hint = el(
      'p',
      'danse__hint',
      'The ring closes in on the chandelier and flashes on the beat \u2014 step as it flashes. When the music stops, hold still.',
    );

    wrap.append(readout, hall, ctx.actionBar, this.hint);
    this.hall = hall;
    ctx.stage.append(wrap);
    this.wrap = wrap;

    // A hidden tab must not burn through a hold in the player's absence.
    document.addEventListener('visibilitychange', () => this.handleVisibility());
  },

  start(ctx) {
    this.alive = true;
    this.multiplier = 1;
    this.survived = 0;
    this.danseNumber = 0;
    this.previousBeatInterval = null;
    this.hiddenAt = null;
    this.newDanse(ctx);
  },

  stop() {
    this.alive = false;
    this.phase = 'stopped';
    this.stopClock();
    clearTimeout(this.settleTimer);
    if (this.wrap) {
      this.wrap.classList.remove('danse--dance', 'danse--hold', 'danse--tell', 'danse--beat');
      this.wrap.classList.add('danse--stopped');
    }
    if (this.ctx) this.ctx.setActionEnabled(false);
  },

  /* ------------------------------------------------------------ one danse */

  newDanse(ctx) {
    clearTimeout(this.settleTimer);
    this.danseNumber += 1;
    this.steps = 0;
    this.streak = 0;
    this.flawless = true;
    this.lastPressBeat = -1;
    this.toldFalter = false;

    // The measure quickens with the multiplier. Only the length of a danse and
    // the length of the hold keep climbing with the night itself.
    this.beatInterval = Math.max(MIN_BEAT_MS, START_BEAT_MS - (this.multiplier - 1) * TEMPO_STEP_MS);
    const mostBeats = Math.min(MAX_DANSE_BEATS_FINAL, MAX_DANSE_BEATS_START + this.survived);
    this.danseBeats = MIN_DANSE_BEATS + Math.floor(ctx.rng() * (mostBeats - MIN_DANSE_BEATS + 1));
    this.holdMs = Math.max(MIN_HOLD_MS, HOLD_START_MS - this.survived * HOLD_STEP_MS);
    this.stepPose = false;
    this.holdStartedAt = 0;

    this.phase = 'dance';
    // One beat of count-in, so the downbeat is never a surprise.
    this.beatOrigin = performance.now() + this.beatInterval;

    this.wrap.classList.remove('danse--survived', 'danse--caught', 'danse--hold', 'danse--tell', 'danse--beat');
    this.dancers.classList.remove('danse__dancers--step');
    this.stateLabel.textContent = 'The orchestra plays';
    this.hint.textContent = this.danseNumber === 1
      ? 'The ring closes in and flashes on the beat \u2014 step as it flashes.'
      : 'Step as the ring flashes on the chandelier.';
    // The button never asks to be pressed, so it keeps one label all night.
    ctx.setActionLabel('Step');
    ctx.setActionEnabled(true);
    const quickened = this.previousBeatInterval === null
      || this.beatInterval < this.previousBeatInterval;
    this.previousBeatInterval = this.beatInterval;
    ctx.message(this.danseNumber === 1
      ? 'The orchestra begins. Step on the beat, and be still when the measure resolves.'
      : quickened
        ? `Danse ${this.danseNumber}. The orchestra quickens with your multiplier.`
        : `Danse ${this.danseNumber}. A slower measure \u2014 the multiplier is back to \u00d71.`);
    this.paint();
    this.startClock();
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
        // The count-in: the ring waits at full size and nothing flashes.
        this.wrap.classList.remove('danse--beat');
        if (!this.reducedMotion) this.approachRing.style.transform = 'scale(1)';
        return;
      }
      const beatIndex = Math.floor(elapsed / this.beatInterval);
      if (beatIndex >= this.danseBeats) {
        this.beginHold(now);
        return;
      }

      // The guests step on every beat, so a beat that never lands is unmissable.
      const pose = beatIndex % 2 === 1;
      if (pose !== this.stepPose) {
        this.stepPose = pose;
        this.dancers.classList.toggle('danse__dancers--step', pose);
      }

      // Every danse warns a beat before it resolves. When that happens is still
      // random, so the resolve still cannot be counted.
      if (!this.toldFalter && beatIndex === this.danseBeats - 1) {
        this.toldFalter = true;
        this.wrap.classList.add('danse--tell');
        this.stateLabel.textContent = 'The music falters\u2026';
        this.ctx.message('The music falters \u2014 be ready to stop.');
      }

      this.paintBeat(elapsed - beatIndex * this.beatInterval);
      return;
    }

    if (this.phase === 'hold' && now >= this.holdEndsAt) this.survive();
  },

  paintBeat(positionWithinBeat) {
    const ratio = Math.max(0, Math.min(1, positionWithinBeat / this.beatInterval));
    const flashStart = 1 - BEAT_FLASH_RATIO;

    // The flash straddles the beat: from a fraction before it to the same
    // fraction after, so the cue is centred on the moment you must step.
    const flashing = ratio >= flashStart || ratio <= BEAT_FLASH_RATIO;
    this.wrap.classList.toggle('danse--beat', flashing);

    if (this.reducedMotion) return;

    // While the flash is lit the ring sits exactly on the target, so the two
    // rings are always concentric at the beat. The rest of the beat is a single
    // inward contraction, from full size back down to the target.
    const scale = flashing
      ? APPROACH_LAND_SCALE
      : 1 - (1 - APPROACH_LAND_SCALE) * ((ratio - BEAT_FLASH_RATIO) / (flashStart - BEAT_FLASH_RATIO));
    this.approachRing.style.transform = `scale(${scale})`;
  },

  /* ------------------------------------------------------------- the step */

  act(ctx) {
    if (!this.alive) return;
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
    const now = performance.now();
    const elapsed = now - this.beatOrigin;
    if (elapsed < 0) return; // the count-in is free

    const beatIndex = Math.floor(elapsed / this.beatInterval);
    if (beatIndex >= this.danseBeats) return; // resolving; the hold guard decides
    if (beatIndex === this.lastPressBeat) return; // one step per beat
    this.lastPressBeat = beatIndex;

    const positionWithinBeat = elapsed - beatIndex * this.beatInterval;
    if (this.withinWindow(positionWithinBeat)) {
      this.steps += 1;
      this.streak += 1;
      this.ctx.message(`${this.steps} step${this.steps === 1 ? '' : 's'} in time.`);
    } else {
      this.streak = 0;
      this.flawless = false;
      this.ctx.message('Out of step. Your streak breaks.');
    }
    this.paint();
  },

  withinWindow(positionWithinBeat) {
    const tolerance = Math.max(MIN_TOLERANCE_MS, this.beatInterval * TOLERANCE_RATIO);
    const distance = Math.min(positionWithinBeat, this.beatInterval - positionWithinBeat);
    return distance <= tolerance;
  },

  /* -------------------------------------------------------------- outcomes */

  beginHold(now) {
    this.phase = 'hold';
    this.holdStartedAt = now;
    this.holdEndsAt = now + this.holdMs;
    this.wrap.classList.remove('danse--tell');
    this.wrap.classList.add('danse--hold');
    this.dancers.classList.remove('danse__dancers--step');
    this.stateLabel.textContent = 'The music stops \u2014 hold still';
    this.wrap.classList.remove('danse--beat');
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

    const clean = this.flawless && this.steps > 0;
    if (clean) this.multiplier = Math.min(MULTIPLIER_CAP, this.multiplier + 1);
    this.survived += 1;

    this.wrap.classList.remove('danse--hold', 'danse--tell', 'danse--beat');
    this.wrap.classList.add('danse--survived');
    this.stateLabel.textContent = clean ? 'The hall breathes again' : 'Held \u2014 but not cleanly';
    this.hint.textContent = `Grace banked. Danse ${this.danseNumber + 1} begins shortly.`;
    this.ctx.setActionEnabled(false);

    if (clean) {
      this.ctx.message(
        `Held still \u00b7 ${this.steps} steps at \u00d7${multiplierUsed} = ${award} grace. Multiplier \u00d7${this.multiplier}.`,
      );
    } else if (this.steps === 0) {
      this.ctx.message('Held still, but you never stepped. No grace, and the multiplier does not rise.');
    } else {
      this.ctx.message(
        `Held still, but a step was clumsy \u00b7 ${this.steps} steps at \u00d7${multiplierUsed} = ${award} grace. The multiplier stays \u00d7${this.multiplier}.`,
      );
    }

    this.paint();
    this.settle();
  },

  caught() {
    this.phase = 'caught';
    this.stopClock();
    const lost = this.steps;
    this.multiplier = 1;

    this.wrap.classList.remove('danse--hold', 'danse--tell', 'danse--beat');
    this.wrap.classList.add('danse--caught');
    this.stateLabel.textContent = 'The host has seen you';
    this.hint.textContent = `You moved during the hold. Multiplier back to \u00d71; danse ${this.danseNumber + 1} begins shortly.`;
    this.ctx.setActionEnabled(false);
    this.ctx.message(`You moved. ${lost} step${lost === 1 ? '' : 's'} lost, and the host resets your multiplier to \u00d71.`);

    this.paint();
    this.settle();
  },

  settle() {
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      if (this.alive) this.newDanse(this.ctx);
    }, SETTLE_MS);
  },

  /* ---------------------------------------------------------------- paints */

  paint() {
    if (!this.wrap) return;
    this.graceValue.textContent = String(this.steps ?? 0);
    this.streakValue.textContent = String(this.streak ?? 0);
    this.multiplierValue.textContent = `\u00d7${this.multiplier ?? 1}`;
    this.danseValue.textContent = String(this.danseNumber ?? 1);
    this.wrap.classList.toggle('danse--dance', this.phase === 'dance');
    this.wrap.classList.toggle('danse--hold', this.phase === 'hold');
    if (this.chandelier) {
      this.chandelier.classList.toggle('danse__chandelier--lit', this.phase === 'dance');
      if (this.phase !== 'dance') this.chandelier.style.opacity = '';
    }
  },

  /* ------------------------------------------------------------- tab hidden */

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
    // Shift the clock forward by the time away, so a hidden tab costs nothing.
    if (this.beatOrigin != null) this.beatOrigin += gap;
    if (this.holdEndsAt != null) this.holdEndsAt += gap;
    if (this.phase === 'dance' || this.phase === 'hold') this.startClock();
  },
};

export default game;
