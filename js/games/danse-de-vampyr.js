/* ---------------------------------------------------------------------------
   Danse de Vampyr - dance while the orchestra plays, and do not move when the
   measure resolves.

   The track itself never stops. Each danse runs on its own internal beat
   clock; when the measure resolves the hall goes rigid and a single step is
   noticed by the host. Grace is banked only on a survived hold, and hitting two
   beats in three is what raises the multiplier. The orchestra quickens with the
   multiplier, so the music rises and eases with your standing.
   --------------------------------------------------------------------------- */

import { el, plural } from '../dom.js';

/* The cue is redrawn on this interval, while a press is judged against the true
   beat. A long tick makes the flash stutter against its own window, so keep
   this well under the tolerance at the fastest tempo. */
const TICK_MS = 20;

/** Tempo follows the multiplier, and the floor is reached at the top of it. A
    catch costs one level, so it eases the music by a single step rather than
    slamming it back — which also makes the danse you must climb back on a little
    kinder than the one you lost. */
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

const MULTIPLIER_CAP = 10;

/** The share of a danse's beats you must hit for the multiplier to rise. A beat
    you miss counts whether the press was clumsy or never made, so this is the
    only thing a danse is judged on — there is no clean or unclean state, just a
    count. The resolve's leading flash is hittable too, which makes the bar a
    touch forgiving. */
const BEATS_REQUIRED_RATIO = 2 / 3;

/** Pause on the failure and success screens, long enough to read them. */
const SETTLE_MS = 950;

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

    // Steps, not a streak: the streak had no mechanical effect, and two counters
    // of the same unit under two different names was most of what made the
    // readout unreadable.
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
    this.lastPressBeat = -1;
    this.toldFalter = false;

    // Tempo follows the multiplier; danse length and hold length keep climbing
    // with the night itself.
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
        : `Danse ${this.danseNumber}. A slower measure \u2014 the multiplier is \u00d7${this.multiplier}.`);
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
        // The count-in is an ordinary beat with its opening flash suppressed:
        // the ring contracts and lands on the target, and the downbeat's own
        // flash straddles the beat as usual. Parking the ring at full size for
        // the whole count-in is what made the opening step arrive unannounced.
        this.paintBeat(elapsed + this.beatInterval, true);
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

  /* `countIn` runs the same contraction as any other beat; it only drops the
     flash that would otherwise open the danse out of nowhere. The downbeat's
     flash still straddles the beat, so the first step is cued like every later
     one — including the early half of its window. */
  paintBeat(positionWithinBeat, countIn = false) {
    const ratio = Math.max(0, Math.min(1, positionWithinBeat / this.beatInterval));
    const flashStart = 1 - BEAT_FLASH_RATIO;

    // The flash straddles the beat: from a fraction before it to the same
    // fraction after, so the cue is centred on the moment you must step.
    const flashing = ratio >= flashStart || (!countIn && ratio <= BEAT_FLASH_RATIO);
    this.wrap.classList.toggle('danse--beat', flashing);

    if (this.reducedMotion) return;

    // While the flash is lit the ring sits exactly on the target, so the two
    // rings are always concentric at the beat. The rest of the beat is a single
    // inward contraction, from full size back down to the target. Clamped, so a
    // count-in parks the ring at full size rather than overshooting it.
    const contraction = Math.max(0, Math.min(1, (ratio - BEAT_FLASH_RATIO) / (flashStart - BEAT_FLASH_RATIO)));
    const scale = flashing ? APPROACH_LAND_SCALE : 1 - (1 - APPROACH_LAND_SCALE) * contraction;
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

    // One step per beat — but the beat is the boundary the window straddles, not
    // the cell it falls in. Keying this on beatIndex let a step taken in the
    // first quarter of a cell swallow the next beat's step without a word.
    const beat = Math.round(elapsed / this.beatInterval);
    if (beat === this.lastPressBeat) return;
    this.lastPressBeat = beat;

    if (this.withinWindow(elapsed - beatIndex * this.beatInterval)) {
      this.steps += 1;
      this.ctx.message(`${this.steps} ${plural(this.steps, 'step')} in time.`);
    } else {
      this.ctx.message('Out of step \u2014 that beat is lost.');
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

    const required = Math.ceil(this.danseBeats * BEATS_REQUIRED_RATIO);
    const raised = this.steps >= required && multiplierUsed < MULTIPLIER_CAP;
    if (raised) this.multiplier += 1;
    this.survived += 1;

    // The resolve's leading flash counts as a beat, so the raw count can run one
    // past the danse's length. Clamped for the readout only — the grace is banked
    // either way.
    const hit = Math.min(this.steps, this.danseBeats);
    const move = raised
      ? `\u00d7${multiplierUsed} \u2192 \u00d7${this.multiplier}`
      : `multiplier holds at \u00d7${this.multiplier}`;

    this.wrap.classList.remove('danse--hold', 'danse--tell', 'danse--beat');
    this.wrap.classList.add('danse--survived');
    this.stateLabel.textContent = 'The hall breathes again';
    this.hint.textContent = `Held ${hit} of ${this.danseBeats} beats \u00b7 ${move}`;
    this.ctx.setActionEnabled(false);
    this.ctx.message(
      `Held still \u00b7 ${hit} of ${this.danseBeats} beats at \u00d7${multiplierUsed} = ${award} grace. `
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
    // One level: a catch should sting without deciding the night, and the
    // multiplier is what the dancing is for.
    this.multiplier = Math.max(1, this.multiplier - 1);

    this.wrap.classList.remove('danse--hold', 'danse--tell', 'danse--beat');
    this.wrap.classList.add('danse--caught');
    this.stateLabel.textContent = 'The host has seen you';
    this.hint.textContent = from > 1
      ? `You moved during the hold. Multiplier \u00d7${from} \u2192 \u00d7${this.multiplier}; danse ${this.danseNumber + 1} begins shortly.`
      : `You moved during the hold. Danse ${this.danseNumber + 1} begins shortly.`;
    this.ctx.setActionEnabled(false);
    this.ctx.message(from > 1
      ? `You moved. ${lost} ${plural(lost, 'step')} lost, and the host takes one multiplier level: \u00d7${from} \u2192 \u00d7${this.multiplier}.`
      : `You moved. ${lost} ${plural(lost, 'step')} lost. The multiplier is already at \u00d71.`);

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
    const steps = this.steps ?? 0;
    const multiplier = this.multiplier ?? 1;
    this.graceValue.textContent = String(steps * multiplier);
    this.stepsValue.textContent = String(steps);
    this.multiplierValue.textContent = `\u00d7${multiplier}`;
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
