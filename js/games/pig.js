/* ---------------------------------------------------------------------------
   Pig — roll and bank.

   Roll to build a round total, but a single one wipes the round and takes the
   whole lot with it. Banking keeps what you have and starts again.

   The nerve is the game: every extra roll is worth more and risks more.
   --------------------------------------------------------------------------- */

import { renderDice, roll } from '../dice.js';

/** Pause after a bust or a bank, long enough to see what you got. */
const BEAT_MS = 950;

const game = {
  id: 'pig',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'pig';

    this.diceEl = document.createElement('span');
    this.diceEl.className = 'dice';

    const roundLabel = document.createElement('p');
    roundLabel.className = 'cap';
    roundLabel.textContent = 'this round';

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

    wrap.append(this.diceEl, roundLabel, this.totalEl, actions);
    ctx.stage.append(wrap);

    // Space or Enter rolls (through the shell). B banks.
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'b' && event.key !== 'B') return;
      if (!this.alive || this.locked || this.round === 0) return;
      event.preventDefault();
      this.bank();
    });
  },

  start(ctx) {
    this.alive = true;
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

    this.diceEl.replaceChildren();
    this.totalEl.textContent = '0';
    this.bankBtn.disabled = true;

    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(true);
    ctx.message('Roll, or bank what you have.');
  },

  /* ---------------------------------------------------------------- action */

  act(ctx) {
    if (this.locked || !this.alive) return;

    const [value] = roll(ctx.rng, 1, 6);
    this.diceEl.replaceChildren(renderDice([value]));

    if (value === 1) {
      this.locked = true;
      this.round = 0;
      this.totalEl.textContent = '0';
      this.bankBtn.disabled = true;
      ctx.setActionLabel('Roll');
      ctx.setActionEnabled(false);
      ctx.message('A one. The round is wiped.');
      this.settle(ctx);
      return;
    }

    this.round += value;
    this.totalEl.textContent = String(this.round);
    this.bankBtn.disabled = false;
    ctx.setActionEnabled(true);
    ctx.message(`Rolled ${value}. Round total ${this.round}.`);
  },

  bank() {
    if (this.locked || !this.alive || this.round === 0) return;

    const ctx = this.ctx;
    const banked = this.round;

    ctx.addPoints(banked);
    this.locked = true;
    this.bankBtn.disabled = true;
    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(false);
    ctx.message(`Banked ${banked}.`);
    this.settle(ctx);
  },

  settle(ctx) {
    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(ctx);
    }, BEAT_MS);
  },
};

export default game;
