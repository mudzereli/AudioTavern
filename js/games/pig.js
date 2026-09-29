/* ---------------------------------------------------------------------------
   Pig — beat the house.

   One die and the oldest bargain in dice: a one takes the round, so banking is
   the only way to keep anything. On its own that goes flat. With nobody to
   race, the best play is a fixed threshold and the round stops being a
   decision.

   So there is a house. It runs from 0 to 100 beside you and it ALWAYS MOVES
   FIRST — at the top of every round it takes a random step of HOUSE_MIN to
   HOUSE_MAX. Reach 100 before it does and it pays you everything it still had
   left to travel, and THAT MARGIN IS THE ONLY THING THAT SCORES: a pot never
   pays a point on its own, it only carries you towards the hundred. Lose the
   leg and nothing is taken from your score — you have simply spent the minutes.

   The step is the entire difficulty and the only dial worth touching. A round
   of this game is worth about 8 points to a good player, so the house's mean
   step has to sit under that or the race is unwinnable rather than hard.
   HOUSE_MIN 3 / HOUSE_MAX 9 means a mean of 6.
   --------------------------------------------------------------------------- */

import { renderDie, roll } from '../dice.js';
import { plural } from '../dom.js';
import { randInt } from '../rng.js';

/** Points either side needs to take a leg. */
const HOUSE_TARGET = 100;

/**
 * What the house takes at the top of a round, both ends inclusive.
 * THIS IS THE DIAL. Mean 6 against a player ceiling of about 8 a round.
 * Easier: 2/6. Harder: 4/12. Past a mean of ~8 the race cannot be won.
 */
const HOUSE_MIN = 3;
const HOUSE_MAX = 9;

/** Pause after a round ends, long enough to see what happened. */
const BEAT_MS = 950;
/** A leg result needs time to read before the next one begins. */
const LEG_BEAT_MS = 2500;

/** One lane of the race: a name, a bar, and the running number. */
function raceLine(label, modifier, fill, num) {
  const line = document.createElement('div');
  line.className = `pig__side ${modifier}`;

  const name = document.createElement('span');
  name.className = 'cap';
  name.textContent = label;

  const bar = document.createElement('span');
  bar.className = 'pig__bar';
  fill.className = 'pig__fill';
  bar.append(fill);

  num.className = 'pig__num';

  line.append(name, bar, num);
  return line;
}

const game = {
  id: 'pig',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'pig';

    /* The race. The house is on top because the house moves first. */
    const race = document.createElement('div');
    race.className = 'pig__race';

    this.houseFill = document.createElement('span');
    this.houseNum = document.createElement('strong');
    this.youFill = document.createElement('span');
    this.youNum = document.createElement('strong');

    race.append(
      raceLine('The house', 'pig__side--house', this.houseFill, this.houseNum),
      raceLine('You', 'pig__side--you', this.youFill, this.youNum),
    );

    /* The die slot keeps the die's height reserved, so the board does not jump
       when the die appears on the first roll of a round. */
    this.diceEl = document.createElement('span');
    this.diceEl.className = 'pig__die';

    this.roundLabelEl = document.createElement('p');
    this.roundLabelEl.className = 'cap';
    this.roundLabelEl.textContent = 'this round';

    this.totalEl = document.createElement('p');
    this.totalEl.className = 'pig__total';
    this.totalEl.textContent = '0';

    this.bankBtn = document.createElement('button');
    this.bankBtn.type = 'button';
    this.bankBtn.className = 'btn btn--ghost';
    this.bankBtn.textContent = 'Bank';
    this.bankBtn.addEventListener('click', () => this.bank());

    const actions = document.createElement('div');
    actions.className = 'pig__actions';
    actions.append(this.bankBtn);

    wrap.append(race, this.diceEl, this.roundLabelEl, this.totalEl, actions, ctx.actionBar);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.alive = true;
    this.house = 0;
    this.you = 0;
    this.die = null;
    this.renderRace();
    this.newRound(ctx);
  },

  stop() {
    this.alive = false;
    this.locked = true;
    clearTimeout(this.beat);
  },

  /* ------------------------------------------------------------- one round */

  newRound(ctx) {
    this.locked = false;
    this.round = 0;
    this.die = null;
    this.roundLabelEl.textContent = 'this round';
    this.bankBtn.textContent = 'Bank';
    this.bankBtn.disabled = true;
    this.render();

    // The house moves first, so a round always opens with the target already on
    // the board and the player knowing exactly how much of the leg is left.
    const step = randInt(ctx.rng, HOUSE_MIN, HOUSE_MAX);
    this.house = Math.min(HOUSE_TARGET, this.house + step);
    this.renderRace();

    if (this.house >= HOUSE_TARGET) {
      this.loseLeg(ctx);
      return;
    }

    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(true);
    ctx.message(
      `The house takes ${step} — ${HOUSE_TARGET - this.house} from the end. You need ${HOUSE_TARGET - this.you}.`,
    );
  },

  /* ---------------------------------------------------------------- action */

  act(ctx) {
    if (this.locked || !this.alive) return;

    const [value] = roll(ctx.rng, 1, 6);
    this.die = value;

    if (value === 1) {
      this.finishBust(ctx, this.round);
      return;
    }

    this.round += value;
    this.bankBtn.disabled = false;
    this.render();

    ctx.setActionEnabled(true);
    ctx.message(`Rolled ${value}. Round total ${this.round}.`);
  },

  bank() {
    if (!this.alive || this.locked) return;
    if (this.round === 0) return;

    // The pot does not score. All it does is carry the leg counter towards 100,
    // and it is the margin on the finished leg that pays (see winLeg).
    const ctx = this.ctx;
    const banked = this.round;
    this.you += banked;

    this.locked = true;
    this.bankBtn.disabled = true;
    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(false);
    this.render();

    // Take the leg before the house gets to move again.
    if (this.you >= HOUSE_TARGET) {
      this.winLeg(ctx);
      return;
    }

    this.renderRace();
    ctx.message(`Banked ${banked}. You are ${this.you} of ${HOUSE_TARGET}.`);
    this.settle(ctx);
  },

  /* ------------------------------------------------------------------ legs */

  /* The only scoring in the table: what the house still had to travel when you
     crossed 100. Cheapest leg pays 1, a house that stalled pays near 100. */
  winLeg(ctx) {
    const bonus = HOUSE_TARGET - this.house;
    this.locked = true;
    ctx.addPoints(bonus);
    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(false);

    this.round = 0;
    this.die = null;
    this.roundLabelEl.textContent = 'leg won · points';
    this.render();
    this.totalEl.textContent = `+${bonus}`;
    this.renderRace();

    ctx.message(`Leg won. +${bonus} ${plural(bonus, 'point', 'points')} added. Next leg starts shortly.`);
    this.settle(ctx, LEG_BEAT_MS, true);
  },

  loseLeg(ctx) {
    this.locked = true;
    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(false);

    this.round = 0;
    this.die = null;
    this.roundLabelEl.textContent = 'leg lost';
    this.render();
    this.renderRace();

    ctx.message(`Leg lost. The house reached 100 first. Your score stays at ${ctx.run.score}. Next leg starts shortly.`);
    this.settle(ctx, LEG_BEAT_MS, true);
  },

  finishBust(ctx, lost) {
    this.locked = true;
    this.round = 0;
    this.roundLabelEl.textContent = 'round lost';
    this.bankBtn.textContent = 'Bank';
    this.bankBtn.disabled = true;
    this.render();
    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(false);
    ctx.message(lost > 0 ? `A one. ${lost} points gone.` : 'A one. The round is gone.');
    this.settle(ctx);
  },

  /* ---------------------------------------------------------------- chrome */

  /* The one place the round is painted. The die and the total are set together
     on purpose: when the total was written at each call site instead, one of
     those writes went missing and the board sat at 0 while the die kept
     rolling. */
  render() {
    this.diceEl.replaceChildren();
    if (this.die !== null) this.diceEl.append(renderDie(this.die));
    this.totalEl.textContent = String(this.round);
  },

  renderRace() {
    this.houseFill.style.width = `${(this.house / HOUSE_TARGET) * 100}%`;
    this.youFill.style.width = `${(Math.min(this.you, HOUSE_TARGET) / HOUSE_TARGET) * 100}%`;
    this.houseNum.textContent = String(this.house);
    this.youNum.textContent = String(this.you);
  },

  settle(ctx, delay = BEAT_MS, nextLeg = false) {
    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      if (nextLeg) {
        this.you = 0;
        this.house = 0;
        this.renderRace();
      }
      this.newRound(ctx);
    }, delay);
  },
};

export default game;
