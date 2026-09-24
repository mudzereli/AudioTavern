/* ---------------------------------------------------------------------------
   All Hallows' Eve — judge the knock.

   Someone is at the door and the veil is thin. The ledger reports the six signs
   you can read through the glass: shadow, breath, knocks, hounds, lantern, gate.
   The living break none of them. The dead break exactly one.

   Offer the cake or put the bar across. A wrong judgement, or none at all, ends
   the night, and what you have earned is kept.

   Two judgements, so this table draws its own buttons and the shell hides its
   single-action bar. Left and right arrows work too.
   --------------------------------------------------------------------------- */

import { pick, shuffle } from '../rng.js';

const TICK_MS = 40;

/** How often the meter's value is written back for screen readers. */
const ARIA_MS = 200;

/** The knock, then as long as you need with the ledger. The read is free: the
    window does not open and the award does not drain until it is over. */
const ARRIVE_MS = 450;
const READ_MS = 2600;

/** How long you have to judge once the window opens. It never plateaus, but the
    floor is set where a careful read of six rows can still be acted on. */
const WINDOW_BASE_MS = 6000;
const WINDOW_STEP_MS = 180;
const WINDOW_MIN_MS = 2200;

/** How many of the six rows have anything to report. Night 1 gives you three;
    by night 4 all six are talking, and there are six places for a tell to hide. */
const OBSERVED_BASE = 2;
const OBSERVED_MAX = 6;

/** Points. A sure hand pays double, and a run of clean judgements pays more. */
const REWARD_BASE = 10;
const SPEED_MAX = 2;
const STREAK_STEPS = [1, 1, 1.5, 1.5, 2, 2, 2.5, 2.5];

/** Eight clean judgements and the sky greys over. */
const DAWN_EVERY = 8;
const DAWN_BONUS_BASE = 50;
const DAWN_BONUS_STEP = 25;

/** The dead are a third of the callers at dusk and half of them by the small
    hours. They never come as the same sort of thing twice running. */
const DEAD_SHARE_BASE = 0.35;
const DEAD_SHARE_STEP = 0.05;
const DEAD_SHARE_MAX = 0.6;

/** Pauses: long enough to read a judgement, longer to read the end of a night. */
const BEAT_MS = 620;
const NIGHT_END_MS = 2200;
const DAWN_SETTLE_MS = 2600;

/** Every unreported row says this, whatever the sign. A row with nothing to
    report can never be the anomaly, so it must never read like one. */
const QUIET = 'nothing to report';

/**
 * The six signs, always in this order, so the ledger is read by position and
 * never re-learned. Each of the dead breaks exactly one of these.
 */
const SIGNS = [
  {
    id: 'shadow',
    key: 'Shadow',
    living: 'one, and cast long',
    dead: 'none at all',
    spirit: 'The Thin Woman',
  },
  {
    id: 'breath',
    key: 'Breath',
    living: 'fogs in the cold',
    dead: 'no fog, no breath',
    spirit: 'The Hollow Child',
  },
  {
    id: 'knocks',
    key: 'Knocks',
    living: 'three, patient',
    dead: 'four, and the fourth comes late',
    spirit: 'The Late Guest',
  },
  {
    id: 'hounds',
    key: 'Hounds',
    living: 'the village hounds are up',
    dead: 'the hounds do not stir',
    spirit: 'The Quiet Guest',
  },
  {
    id: 'lantern',
    key: 'Lantern',
    living: 'their lantern burns warm',
    dead: 'unlit, and still you see the face',
    spirit: 'The Lantern Man',
  },
  {
    id: 'gate',
    key: 'Gate',
    living: 'the gate creaks behind them',
    dead: 'the gate is still',
    spirit: 'The One Already In',
  },
];

const SIGN_ORDER = new Map(SIGNS.map((sign, index) => [sign.id, index]));

const LET_IN = 'You held out a cake. It took your hand instead.';
const TURNED_AWAY = 'You barred the door on a living child, and word travels the lane faster than you do.';
const LATE_CALL = 'You did not answer, and the latch lifted by itself.';
const DAWN_AGAIN = 'Grey light on the roofs. The dead have gone home, and you have another night in you.';

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function nightCopy(night) {
  return night === 1
    ? 'First dark. A knock at the door \u2014 read the signs, then judge.'
    : `Night ${night}. The veil is thinner than it was.`;
}

function livingCopy(count) {
  const lines = [
    'The child takes the cake and runs for the next gate.',
    'A small voice says thank you, and the lane goes quiet again.',
    'Soul cakes owed and paid, and the lanterns go with them.',
  ];
  return lines[count % lines.length];
}

function deadCopy(spirit) {
  return `It was ${spirit}. You slip the bar across, and nothing knocks again.`;
}

/** Whichever of the dead you did not just see, so the tells stay varied. */
function pickTell(rng, lastTell) {
  return pick(rng, SIGNS.filter((sign) => sign !== lastTell));
}

/**
 * One caller at the door. Living callers break nothing; a dead one breaks its
 * own sign, and that sign is always one of the rows you can see. The tell is
 * swapped into the observed set rather than added to it, so the number of
 * reporting rows is the same either way and never becomes a clue itself.
 */
function makeVisitor(rng, night, lastTell) {
  const count = Math.min(OBSERVED_BASE + night, OBSERVED_MAX);
  const observed = shuffle(rng, SIGNS).slice(0, count);

  const deadShare = Math.min(DEAD_SHARE_MAX, DEAD_SHARE_BASE + DEAD_SHARE_STEP * (night - 1));
  const alive = rng() >= deadShare;
  const tell = alive ? null : pickTell(rng, lastTell);

  if (tell && !observed.includes(tell)) {
    observed[Math.floor(rng() * observed.length)] = tell;
  }

  observed.sort((a, b) => SIGN_ORDER.get(a.id) - SIGN_ORDER.get(b.id));
  return { alive, tell, observed };
}

const game = {
  id: 'all-hallows-eve',

  mount(ctx) {
    this.ctx = ctx;
    this.phase = 'idle';
    this.night = 1;
    this.read = 0;
    this.streak = 0;
    this.lastAward = null;
    this.window = WINDOW_BASE_MS;
    this.phaseLeft = 0;
    this.lastTick = performance.now();
    this.lastAria = 0;
    this.visitor = null;
    this.pausedPhase = null;

    const wrap = el('section', 'hallows');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'The door on All Hallows\u2019 Eve');

    /* The scene. Deliberately uninformative: the glass is frosted, the visitor
       carries nothing, and nothing here changes with what is behind the door. */
    const door = el('div', 'hallows__door');
    door.setAttribute('aria-hidden', 'true');

    const lane = el('div', 'hallows__lane');
    lane.append(el('span', 'hallows__hedge'), el('span', 'hallows__fog'));

    const frame = el('div', 'hallows__frame');
    const glass = el('div', 'hallows__glass');

    this.visitorEl = el('span', 'hallows__visitor');
    this.visitorEl.append(
      el('span', 'hallows__visitor-head'),
      el('span', 'hallows__visitor-body'),
    );

    glass.append(this.visitorEl, el('span', 'hallows__frost'));
    frame.append(glass, el('span', 'hallows__lamp'));
    door.append(lane, frame);

    /* Readouts. */
    const stats = el('div', 'hallows__stats');

    const nightStat = el('div', 'hallows__stat');
    nightStat.append(el('span', 'hallows__stat-label', 'Night'));
    this.nightValue = el('strong', 'hallows__stat-value', '1');
    nightStat.append(this.nightValue);

    const readStat = el('div', 'hallows__stat');
    readStat.append(el('span', 'hallows__stat-label', 'Judged tonight'));
    this.readValue = el('strong', 'hallows__stat-value', '0');
    readStat.append(this.readValue);

    const multStat = el('div', 'hallows__stat');
    multStat.append(el('span', 'hallows__stat-label', 'Multiplier'));
    this.multValue = el('strong', 'hallows__stat-value', '\u00d71');
    multStat.append(this.multValue);

    const lastStat = el('div', 'hallows__stat');
    lastStat.append(el('span', 'hallows__stat-label', 'Last'));
    this.lastValue = el('strong', 'hallows__stat-value', '\u2014');
    lastStat.append(this.lastValue);

    stats.append(nightStat, readStat, multStat, lastStat);

    /* The ledger: every sign, every visitor, in the same order. */
    const ledger = el('div', 'hallows__ledger');
    ledger.setAttribute('role', 'group');
    ledger.setAttribute('aria-label', 'What you can see at the door');

    this.rows = SIGNS.map((sign) => {
      const row = el('div', 'hallows__sign');
      const value = el('span', 'hallows__sign-value', QUIET);
      const mark = el('span', 'hallows__sign-mark');
      mark.setAttribute('aria-hidden', 'true');
      row.append(el('span', 'hallows__sign-key cap', sign.key), value, mark);
      ledger.append(row);
      return { sign, row, value };
    });

    /* The window. */
    const meter = el('div', 'hallows__meter');
    const meterHead = el('div', 'hallows__meter-head');
    this.meterCap = el('span', 'hallows__meter-cap cap', 'Read the signs');
    this.meterLabel = el('strong', 'hallows__meter-label', '\u2014');
    meterHead.append(this.meterCap, this.meterLabel);

    this.meterTrack = el('div', 'hallows__meter-track');
    this.meterTrack.setAttribute('role', 'progressbar');
    this.meterTrack.setAttribute('aria-label', 'Time left to judge this visitor');
    this.meterTrack.setAttribute('aria-valuemin', '0');
    this.meterTrack.setAttribute('aria-valuemax', '100');
    this.meterTrack.setAttribute('aria-valuenow', '0');

    this.meterFill = el('span', 'hallows__meter-fill');
    this.meterTrack.append(this.meterFill);
    this.meterTrack.classList.add('hallows__meter-track--reading');
    meter.append(meterHead, this.meterTrack);

    /* The two judgements. Bar sits on the left, to match the arrow, and each one
       says who it is for: the rules are read once, the decision is made all night. */
    this.barBtn = el('button', 'btn btn--ghost hallows__choice');
    this.barBtn.type = 'button';
    this.barBtn.setAttribute('aria-keyshortcuts', 'ArrowLeft');
    this.barBtn.setAttribute('aria-label', 'Bar the door on the dead');
    this.barBtn.append(
      el('span', 'hallows__choice-label', 'Bar the door'),
      el('span', 'hallows__choice-for', 'the dead'),
    );
    this.barBtn.addEventListener('click', () => this.judge('bar'));

    this.offerBtn = el('button', 'btn btn--primary hallows__choice');
    this.offerBtn.type = 'button';
    this.offerBtn.setAttribute('aria-keyshortcuts', 'ArrowRight');
    this.offerBtn.setAttribute('aria-label', 'Offer the cake to the living');
    this.offerBtn.append(
      el('span', 'hallows__choice-label', 'Offer the cake'),
      el('span', 'hallows__choice-for', 'the living'),
    );
    this.offerBtn.addEventListener('click', () => this.judge('offer'));

    const choices = el('div', 'hallows__choices');
    choices.append(this.barBtn, this.offerBtn);

    const hint = el(
      'p',
      'hallows__hint',
      'The meter holds while you read, and only drains once the time to judge begins. Answer early and it pays double.',
    );

    /* The lore, open by default: the only thing teaching the six tells, and the
       only list of what the dead are. */
    const lore = el('details', 'hallows__lore');
    lore.open = true;
    lore.append(el('summary', 'hallows__lore-summary', 'The dead \u2014 and the sign each one breaks'));
    const list = el('ul', 'hallows__lore-list');
    for (const sign of SIGNS) {
      const item = el('li', 'hallows__lore-item');
      item.append(
        el('span', 'hallows__lore-spirit', sign.spirit),
        el('span', 'hallows__lore-tell', `${sign.key} \u2014 ${sign.dead}`),
      );
      list.append(item);
    }
    lore.append(list);
    lore.append(el(
      'p',
      'hallows__lore-note',
      'Those six are the dead, and the bar is what they get. Anyone else at the door is living: they break none of the signs, and they get the cake.',
    ));

    wrap.append(door, stats, ledger, meter, choices, hint, lore);
    ctx.stage.append(wrap);

    this.door = door;
    this.wrap = wrap;

    this.paintLedger();
    this.paint();
    this.setChoicesEnabled(false);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      this.judge(event.key === 'ArrowRight' ? 'offer' : 'bar');
    });

    // A hidden tab must not spend a knock window in the player's absence.
    document.addEventListener('visibilitychange', () => this.handleVisibility());
  },

  start(ctx) {
    this.alive = true;
    this.lastTell = null;
    this.pausedPhase = null;
    this.settleTimer = null;
    this.newNight(ctx, 1);
  },

  stop() {
    this.alive = false;
    this.phase = 'stopped';
    this.stopClock();
    clearTimeout(this.settleTimer);
    this.setChoicesEnabled(false);
    this.paint();
  },

  /* ---------------------------------------------------------------- a night */

  newNight(ctx, night) {
    this.night = night;
    this.read = 0;
    this.streak = 0;
    this.nightPoints = 0;
    this.window = Math.max(WINDOW_MIN_MS, WINDOW_BASE_MS - (night - 1) * WINDOW_STEP_MS);

    if (this.door) {
      this.door.classList.remove('hallows__door--lost', 'hallows__door--dawn', 'hallows__door--knocked');
    }
    this.ctx.message(nightCopy(night));
    this.paint();
    this.arrive(ctx);
  },

  arrive(ctx) {
    clearTimeout(this.settleTimer);
    this.stopClock();

    // ctx.rng is replaced at the start of every run, so it is read right here.
    this.visitor = makeVisitor(ctx.rng, this.night, this.lastTell);
    if (!this.visitor.alive) this.lastTell = this.visitor.tell;

    this.phase = 'arriving';
    this.phaseLeft = ARRIVE_MS;
    this.lastTick = performance.now();

    this.door.classList.add('hallows__door--knocked');
    this.paintVisitor('arriving');
    this.paintLedger();
    this.setChoicesEnabled(false);
    this.paint();
    this.startClock();
  },

  beginRead() {
    this.phase = 'reading';
    this.phaseLeft = READ_MS;
    this.meterCap.textContent = 'Read the signs';
    this.meterTrack.classList.add('hallows__meter-track--reading');
    this.setChoicesEnabled(true);
    this.paintMeter();
  },

  beginWindow() {
    this.phase = 'deciding';
    this.phaseLeft = this.window;
    this.meterCap.textContent = 'Time to judge';
    this.meterTrack.classList.remove('hallows__meter-track--reading');
    this.door.classList.remove('hallows__door--knocked');
    this.paintMeter();
  },

  /* ------------------------------------------------------------- the call */

  /** In answer to a knock, 'offer' and 'bar'; in answer to nothing, 'late'. */
  judge(answer) {
    if (!this.alive) return;
    if (this.phase !== 'reading' && this.phase !== 'deciding') return;

    const visitor = this.visitor;
    const speed = this.phase === 'reading'
      ? SPEED_MAX
      : 1 + Math.max(0, this.phaseLeft) / this.window;
    const correct = answer !== 'late'
      && (visitor.alive ? answer === 'offer' : answer === 'bar');

    this.stopClock();
    this.setChoicesEnabled(false);
    this.reveal();

    if (correct) {
      this.phase = 'won';
      const award = Math.round(REWARD_BASE * speed * this.streakMultiplier());
      this.ctx.addPoints(award);
      this.read += 1;
      this.streak += 1;
      this.nightPoints += award;
      this.lastAward = award;
      this.paintVisitor('gone');
      this.ctx.message(visitor.alive ? livingCopy(this.read) : deadCopy(visitor.tell.spirit));
      this.paint();

      if (this.read >= DAWN_EVERY) {
        this.dawn();
        return;
      }

      this.settle(BEAT_MS);
      return;
    }

    this.phase = 'lost';
    // A dead caller let in is inside the house; a living child turned away just
    // goes home, and either way the night is over.
    this.paintVisitor(answer === 'late' || !visitor.alive ? 'inside' : 'gone');
    this.door.classList.add('hallows__door--lost');

    const copy = answer === 'late' ? LATE_CALL : visitor.alive ? TURNED_AWAY : LET_IN;
    const next = Math.max(1, this.night - 1);
    this.ctx.message(
      `${copy} The night ends: ${this.read} judged, ${this.nightPoints} points. `
      + (next === this.night ? 'The next night is no lighter.' : `The next night starts at night ${next}.`),
    );
    this.paint();
    this.settle(NIGHT_END_MS, next);
  },

  dawn() {
    const bonus = DAWN_BONUS_BASE + DAWN_BONUS_STEP * (this.night - 1);
    this.ctx.addPoints(bonus);
    this.lastAward = bonus;
    this.nightPoints += bonus;
    this.phase = 'dawn';

    this.door.classList.remove('hallows__door--knocked');
    this.door.classList.add('hallows__door--dawn');
    this.paintVisitor('gone');
    this.paint();
    this.ctx.message(`${DAWN_AGAIN} Eight clean judgements: +${bonus}.`);
    this.settle(DAWN_SETTLE_MS, this.night + 1);
  },

  settle(ms, nextNight) {
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      if (!this.alive) return;
      if (nextNight != null) this.newNight(this.ctx, nextNight);
      else this.arrive(this.ctx);
    }, ms);
  },

  /* ---------------------------------------------------------------- clock */

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
    if (this.phase !== 'arriving' && this.phase !== 'reading' && this.phase !== 'deciding') return;

    const now = performance.now();
    this.phaseLeft -= now - this.lastTick;
    this.lastTick = now;

    if (this.phaseLeft > 0) {
      if (this.phase === 'deciding') this.paintMeter();
      return;
    }

    if (this.phase === 'arriving') this.beginRead();
    else if (this.phase === 'reading') this.beginWindow();
    else this.judge('late');
  },

  /* --------------------------------------------------------------- paints */

  /** The multiplier the next judgement will earn. */
  streakMultiplier() {
    return STREAK_STEPS[Math.min(this.streak ?? 0, STREAK_STEPS.length - 1)];
  },

  awardPreview(speed) {
    return Math.round(REWARD_BASE * speed * this.streakMultiplier());
  },

  paint() {
    if (!this.wrap) return;
    this.nightValue.textContent = String(this.night ?? 1);
    this.readValue.textContent = String(this.read ?? 0);
    this.multValue.textContent = `\u00d7${this.streakMultiplier()}`;
    this.lastValue.textContent = this.lastAward == null ? '\u2014' : `+${this.lastAward}`;
    this.wrap.classList.toggle('hallows--lost', this.phase === 'lost');
    this.wrap.classList.toggle('hallows--stopped', this.phase === 'stopped');
    this.paintMeter();
  },

  /**
   * Every row is written every time, whether it reports anything or not, and the
   * reported ones are worded exactly alike. Nothing here is styled by what the
   * visitor turns out to be, because the ledger is the whole puzzle.
   */
  paintLedger() {
    const visitor = this.visitor;
    for (const entry of this.rows) {
      const seen = visitor ? visitor.observed.includes(entry.sign) : false;
      const broken = seen && !visitor.alive && visitor.tell === entry.sign;
      entry.row.classList.toggle('hallows__sign--quiet', !seen);
      entry.row.classList.remove('hallows__sign--tell');
      entry.value.textContent = !seen
        ? QUIET
        : broken ? entry.sign.dead : entry.sign.living;
    }
  },

  paintVisitor(state) {
    if (!this.visitorEl) return;
    this.visitorEl.className = 'hallows__visitor';
    this.visitorEl.classList.add(`hallows__visitor--${state}`);
  },

  paintMeter() {
    if (!this.meterFill) return;

    let ratio = 0;
    let label = '\u2014';
    if (this.phase === 'arriving' || this.phase === 'reading') {
      ratio = 1;
      label = `+${this.awardPreview(SPEED_MAX)}`;
    } else if (this.phase === 'deciding') {
      ratio = Math.max(0, Math.min(1, this.phaseLeft / this.window));
      label = `+${this.awardPreview(1 + ratio)}`;
    } else if (this.phase === 'won' || this.phase === 'dawn') {
      label = `+${this.lastAward ?? 0}`;
    }

    this.meterFill.style.transform = `scaleX(${ratio})`;
    this.meterLabel.textContent = label;
    this.meterTrack.classList.toggle('hallows__meter-track--low', this.phase === 'deciding' && ratio < 0.3);

    const now = performance.now();
    if (now - this.lastAria >= ARIA_MS) {
      this.lastAria = now;
      this.meterTrack.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    }
  },

  /** The sign that gave it away, marked only once the judgement is made. */
  reveal() {
    if (!this.visitor || this.visitor.alive) return;
    const entry = this.rows.find((row) => row.sign === this.visitor.tell);
    if (entry) entry.row.classList.add('hallows__sign--tell');
  },

  setChoicesEnabled(enabled) {
    this.offerBtn.disabled = !enabled;
    this.barBtn.disabled = !enabled;
  },

  /* ------------------------------------------------------------ tab hidden */

  handleVisibility() {
    if (!this.alive) return;

    if (document.hidden) {
      if (this.phase !== 'arriving' && this.phase !== 'reading' && this.phase !== 'deciding') return;
      this.pausedPhase = this.phase;
      this.phase = 'paused';
      this.stopClock();
      this.setChoicesEnabled(false);
      this.ctx.message('The lane waits. Return to the door to continue.');
      return;
    }

    if (!this.pausedPhase) return;
    this.phase = this.pausedPhase;
    this.pausedPhase = null;
    // Resume on what was left of the phase, not on a fresh one.
    this.lastTick = performance.now();
    if (this.phase !== 'arriving') this.setChoicesEnabled(true);
    this.startClock();
    this.paintMeter();
  },
};

export default game;
