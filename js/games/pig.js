/* ---------------------------------------------------------------------------
   Pig — roll and bank.

   Roll to build a round total, but a single one wipes the round and takes the
   whole lot with it. Banking keeps what you have and starts again.

  this.roundLabelEl.textContent = 'this round';
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

    const diceSlot = document.createElement('div');
    diceSlot.className = 'pig__dice-slot';
    this.diceEl = document.createElement('span');
    this.diceEl.className = 'dice';
    diceSlot.append(this.diceEl);

    this.roundLabelEl = document.createElement('p');
    this.roundLabelEl.className = 'cap';
    this.roundLabelEl.textContent = 'this round';

    this.totalEl = document.createElement('p');
    this.totalEl.className = 'pig__total';
    this.totalEl.textContent = '0';

    this.tokensEl = document.createElement('div');
    this.tokensEl.className = 'pig__tokens';
    const tokenLabel = document.createElement('span');
    tokenLabel.textContent = 'Rerolls';
    this.tokenCountEl = document.createElement('strong');
    this.tokensEl.append(tokenLabel, this.tokenCountEl);

    this.bankBtn = document.createElement('button');
    this.bankBtn.type = 'button';
    this.bankBtn.className = 'btn btn--ghost';
    this.bankBtn.textContent = 'Bank';
    this.bankBtn.addEventListener('click', () => this.bank());

    this.rerollBtn = document.createElement('button');
    this.rerollBtn.type = 'button';
    this.rerollBtn.className = 'btn btn--ghost';
    this.rerollBtn.textContent = 'Reroll';
    this.rerollBtn.disabled = true;
    this.rerollBtn.hidden = true;
    this.rerollBtn.addEventListener('click', () => this.reroll());
    this.tokensEl.append(this.rerollBtn);

    const actions = document.createElement('div');
    actions.className = 'pig__actions';
    actions.append(this.bankBtn);

    wrap.append(diceSlot, this.roundLabelEl, this.totalEl, this.tokensEl, actions, ctx.actionBar);
    ctx.stage.append(wrap);

    // Space or Enter rolls (through the shell). B banks.
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'b' && event.key !== 'B') return;
      if (!this.alive || this.locked || (this.round === 0 && !this.pendingBust)) return;
      event.preventDefault();
      this.bank();
    });
  },

  start(ctx) {
    this.alive = true;
    this.bankedTotal = 0;
    this.milestones = 0;
    this.tokens = 0;
    this.updateTokenCount();
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
    this.roundBeforeLastRoll = 0;
    this.lastRoll = null;
    this.canReroll = false;
    this.pendingBust = false;

    this.diceEl.replaceChildren();
    this.totalEl.textContent = '0';
    this.roundLabelEl.textContent = 'this round';
    this.bankBtn.textContent = 'Bank';
    this.bankBtn.disabled = true;
    this.updateRerollButton();

    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(true);
    ctx.message('Roll, or bank what you have.');
  },

  /* ---------------------------------------------------------------- action */

  act(ctx) {
    if (this.locked || this.pendingBust || !this.alive) return;

    this.roundBeforeLastRoll = this.round;
    const [value] = roll(ctx.rng, 1, 6);
    this.diceEl.replaceChildren(renderDice([value]));
    this.lastRoll = value;

    if (value === 1) {
      this.round = 0;
      if (this.tokens > 0) {
        this.pendingBust = true;
        this.roundLabelEl.textContent = 'subtotal at risk';
        this.totalEl.textContent = String(this.roundBeforeLastRoll);
        this.bankBtn.textContent = 'Accept bust';
        this.bankBtn.disabled = false;
        this.canReroll = true;
        this.updateRerollButton();
        ctx.setActionEnabled(false);
        ctx.message(`A one. Your ${this.roundBeforeLastRoll} points are at risk. Reroll it, or accept the bust.`);
      } else {
        this.totalEl.textContent = '0';
        this.finishBust(ctx);
      }
      return;
    }

    this.round += value;
    this.canReroll = true;
    this.totalEl.textContent = String(this.round);
    this.bankBtn.disabled = false;
    this.updateRerollButton();
    ctx.setActionEnabled(true);
    ctx.message(`Rolled ${value}. Round total ${this.round}.`);
  },

  bank() {
    if (!this.alive || this.locked) return;
    if (this.pendingBust) {
      this.acceptBust();
      return;
    }
    if (this.round === 0) return;

    const ctx = this.ctx;
    const banked = this.round;
    const previousMilestones = this.milestones;
    this.bankedTotal += banked;
    this.milestones = Math.floor(this.bankedTotal / 100);
    const earnedTokens = this.milestones - previousMilestones;
    this.tokens += earnedTokens;
    this.updateTokenCount();

    ctx.addPoints(banked);
    this.locked = true;
    this.bankBtn.disabled = true;
    this.canReroll = false;
    this.updateRerollButton();
    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(false);
    ctx.message(earnedTokens
      ? `Banked ${banked}. Earned ${earnedTokens} reroll${earnedTokens === 1 ? '' : 's'}.`
      : `Banked ${banked}.`);
    this.settle(ctx);
  },

  reroll() {
    if (!this.alive || this.locked || !this.canReroll || this.tokens === 0) return;

    const ctx = this.ctx;
    this.round = this.roundBeforeLastRoll;
    this.pendingBust = false;
    this.tokens -= 1;
    this.canReroll = false;
    this.updateTokenCount();

    const [value] = roll(ctx.rng, 1, 6);
    this.lastRoll = value;
    this.diceEl.replaceChildren(renderDice([value]));

    if (value === 1) {
      this.finishBust(ctx);
      return;
    }

    this.round += value;
    this.totalEl.textContent = String(this.round);
    this.roundLabelEl.textContent = 'this round';
    this.bankBtn.textContent = 'Bank';
    this.bankBtn.disabled = false;
    this.updateRerollButton();
    ctx.setActionEnabled(true);
    ctx.message(`Rerolled ${value}. Round total ${this.round}.`);
  },

  acceptBust() {
    if (!this.pendingBust || this.locked) return;
    this.pendingBust = false;
    this.locked = true;
    this.totalEl.textContent = '0';
    this.roundLabelEl.textContent = 'round lost';
    this.bankBtn.disabled = true;
    this.canReroll = false;
    this.updateRerollButton();
    this.ctx.message('Bust accepted. The round is wiped.');
    this.settle(this.ctx);
  },

  finishBust(ctx) {
    this.pendingBust = false;
    this.locked = true;
    this.round = 0;
    this.totalEl.textContent = '0';
    this.roundLabelEl.textContent = 'round lost';
    this.bankBtn.textContent = 'Bank';
    this.bankBtn.disabled = true;
    this.canReroll = false;
    this.updateRerollButton();
    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(false);
    ctx.message('A one. The round is wiped.');
    this.settle(ctx);
  },

  updateTokenCount() {
    this.tokenCountEl.textContent = String(this.tokens);
    this.rerollBtn.hidden = this.tokens === 0;
  },

  updateRerollButton() {
    this.rerollBtn.disabled = !this.alive || this.locked || !this.canReroll || this.tokens === 0;
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
