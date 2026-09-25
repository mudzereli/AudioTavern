/* ---------------------------------------------------------------------------
   Higher or Lower — the pot on the table.

   Call the next card higher or lower. Every correct call grows the pot by your
   streak squared, but the pot is only yours once you bank it, and a wrong call
   takes everything on the table. A tie costs nothing.

   The pile is only a source of physical cards, so the same card cannot turn up
   twice in a pair. Nothing is counted or displayed: the calls are read off the
   table, and an ace or a two simply closes the side it cannot beat.

   This table draws its own buttons — two calls and a bank — so the shell hides
   its single-action bar.
   --------------------------------------------------------------------------- */

import { cardLabel, cardShort, createDeck, renderCard } from '../deck.js';
import { shuffle } from '../rng.js';

/** A correct call or a push, then the revealed card takes the table. */
const STEP_MS = 420;
/** A miss: long enough to see the card that beat you. */
const BEAT_MS = 1100;
/** A bank: long enough to watch the pot leave the table. */
const BANK_MS = 450;
/** How often the bell is checked for the last call and the settle. */
const CLOCK_MS = 250;
/** Settle this long before the clock stops. See settleAtBell(). */
const SETTLE_MS = 1200;
/** From here on the pot reads "last call". */
const LAST_CALL_MS = 30_000;

const game = {
  id: 'higher-lower',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'hl';
    this.wrap = wrap;

    // The pot is the stake, so it sits above the cards.
    this.potPanel = document.createElement('div');
    this.potPanel.className = 'hl__pot';
    this.potEl = document.createElement('strong');
    this.potEl.className = 'hl__pot-value';
    this.potEl.textContent = '0';
    this.potCap = document.createElement('span');
    this.potCap.className = 'hl__pot-cap';
    this.potCap.textContent = 'on the table';
    this.potPanel.append(this.potEl, this.potCap);

    const pair = document.createElement('div');
    pair.className = 'hl__pair';

    this.currentSlot = document.createElement('div');
    this.currentSlot.className = 'hl__slot';

    const arrow = document.createElement('span');
    arrow.className = 'hl__arrow';
    arrow.textContent = '\u2192';

    this.nextSlot = document.createElement('div');
    this.nextSlot.className = 'hl__slot';

    pair.append(this.currentSlot, arrow, this.nextSlot);

    this.lowerBtn = document.createElement('button');
    this.lowerBtn.type = 'button';
    this.lowerBtn.className = 'btn btn--ghost hl__call';
    this.lowerBtn.textContent = '\u2190 Lower';
    this.lowerBtn.disabled = true;
    this.lowerBtn.addEventListener('click', () => this.call('lower'));

    this.higherBtn = document.createElement('button');
    this.higherBtn.type = 'button';
    this.higherBtn.className = 'btn btn--primary hl__call';
    this.higherBtn.textContent = 'Higher \u2192';
    this.higherBtn.disabled = true;
    this.higherBtn.addEventListener('click', () => this.call('higher'));

    const calls = document.createElement('div');
    calls.className = 'hl__calls';
    calls.append(this.lowerBtn, this.higherBtn);

    // Banking is the whole decision, so the button carries the number.
    this.bankBtn = document.createElement('button');
    this.bankBtn.type = 'button';
    this.bankBtn.className = 'btn btn--primary hl__bank';
    const bankLabel = document.createElement('span');
    bankLabel.className = 'hl__bank-label';
    bankLabel.textContent = 'Bank';
    this.bankValue = document.createElement('span');
    this.bankValue.className = 'hl__bank-value';
    this.bankValue.textContent = '0';
    this.bankBtn.append(bankLabel, this.bankValue);
    this.bankBtn.disabled = true;
    this.bankBtn.addEventListener('click', () => this.bank());

    const stats = document.createElement('div');
    stats.className = 'hl__stats';

    const streakStat = document.createElement('div');
    streakStat.className = 'hl__stat';
    const streakLabel = document.createElement('span');
    streakLabel.className = 'hl__stat-label';
    streakLabel.textContent = 'Streak';
    this.streakEl = document.createElement('strong');
    this.streakEl.className = 'hl__stat-value';
    streakStat.append(streakLabel, this.streakEl);

    const nextStat = document.createElement('div');
    nextStat.className = 'hl__stat hl__stat--next';
    const nextLabel = document.createElement('span');
    nextLabel.className = 'hl__stat-label';
    nextLabel.textContent = 'Next call pays';
    this.nextPaysEl = document.createElement('strong');
    this.nextPaysEl.className = 'hl__stat-value';
    nextStat.append(nextLabel, this.nextPaysEl);

    const bestStat = document.createElement('div');
    bestStat.className = 'hl__stat';
    const bestLabel = document.createElement('span');
    bestLabel.className = 'hl__stat-label';
    bestLabel.textContent = 'Biggest pot';
    this.bestPotEl = document.createElement('strong');
    this.bestPotEl.className = 'hl__stat-value';
    bestStat.append(bestLabel, this.bestPotEl);

    stats.append(streakStat, nextStat, bestStat);

    wrap.append(this.potPanel, pair, calls, this.bankBtn, stats);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.ctx = ctx;
    this.alive = true;
    this.settled = false;
    this.lastCall = false;
    this.bestPot = 0;
    this.deck = [];
    this.wrap.classList.remove('hl--lastcall');
    this.potPanel.classList.remove('hl__pot--lost', 'hl__pot--banked');
    this.startClock();
    this.newHand();
  },

  stop() {
    this.alive = false;
    this.phase = 'stopped';
    clearTimeout(this.beat);
    clearInterval(this.clock);
    this.wrap.classList.remove('hl--lastcall');
  },

  /* -------------------------------------------------------------- one hand */

  newHand() {
    this.phase = 'awaiting';
    this.streak = 0;
    this.pot = 0;
    this.revealed = null;
    this.current = this.draw();

    this.nextSlot.replaceChildren();
    this.potPanel.classList.remove('hl__pot--lost', 'hl__pot--banked');
    this.setPotCaption(this.lastCall ? 'last call' : 'on the table');
    this.refresh();

    this.ctx.message('Call the next card. Left arrow for lower, right for higher.');
  },

  refresh() {
    this.currentSlot.replaceChildren(renderCard(this.current));
    this.paintStats();
    this.syncControls();
  },

  paintStats() {
    this.potEl.textContent = String(this.pot);
    this.streakEl.textContent = String(this.streak);
    this.nextPaysEl.textContent = String((this.streak + 1) ** 2);
    this.bestPotEl.textContent = String(this.bestPot);
    this.bankValue.textContent = String(this.pot);
  },

  /**
   * Both calls are open while a hand is live. An ace is the top card and a two
   * the bottom, so a side that cannot be won stays shut rather than take a bet
   * that is already lost.
   */
  syncControls() {
    const open = this.phase === 'awaiting';
    const value = this.current.value;

    this.lowerBtn.disabled = !open || value === 2;
    this.higherBtn.disabled = !open || value === 14;
    this.bankBtn.disabled = !open || this.pot <= 0;
  },

  setPotCaption(text) {
    this.potCap.textContent = text;
  },

  draw() {
    // A source, not a tracked deck: it refills, so a hand can never stall and the
    // same physical card can never appear twice in a pair.
    if (this.deck.length === 0) this.deck = shuffle(this.ctx.rng, createDeck());
    return this.deck.pop();
  },

  /* -------------------------------------------------------------- the bell */

  startClock() {
    clearInterval(this.clock);
    this.clock = setInterval(() => {
      if (!this.alive) return;

      const remaining = this.ctx.run.remainingMs;
      const lastCall = remaining <= LAST_CALL_MS;
      if (lastCall !== this.lastCall) {
        this.lastCall = lastCall;
        this.wrap.classList.toggle('hl--lastcall', lastCall);
        if (!this.potPanel.classList.contains('hl__pot--lost')) {
          this.setPotCaption(lastCall ? 'last call' : 'on the table');
        }
      }

      if (this.settled || remaining > SETTLE_MS) return;
      this.settled = true;
      this.settleAtBell();
    }, CLOCK_MS);
  },

  /**
   * The house takes the pot off the table before the clock stops. This has to
   * happen here rather than in stop(), because the shell captures the final score
   * as the run ends and points added after that never reach the summary.
   */
  settleAtBell() {
    const ctx = this.ctx;
    const banked = this.pot;

    this.pot = 0;
    this.streak = 0;
    this.phase = 'settling';
    this.bestPot = Math.max(this.bestPot, banked);

    this.streakEl.textContent = '0';
    this.nextPaysEl.textContent = '1';
    this.bestPotEl.textContent = String(this.bestPot);
    this.bankValue.textContent = '0';

    if (banked > 0) {
      ctx.addPoints(banked);
      this.potPanel.classList.add('hl__pot--banked');
      this.potEl.textContent = String(banked);
      this.setPotCaption('settled');
      ctx.message(`The house settles up \u2014 ${banked} banked.`);
    } else {
      this.setPotCaption('settled');
      ctx.message('The house settles up \u2014 nothing on the table.');
    }

    this.syncControls();
  },

  /* --------------------------------------------------------------- action */

  call(direction) {
    if (!this.alive || this.phase !== 'awaiting') return;

    // An ace has nothing above it and a two nothing below.
    const impossible = direction === 'higher' ? 14 : 2;
    if (this.current.value === impossible) return;

    const ctx = this.ctx;
    const next = this.draw();
    this.revealed = next;
    this.nextSlot.replaceChildren(renderCard(next));

    this.phase = 'settling';
    this.syncControls();

    if (next.value === this.current.value) {
      ctx.message(`Push \u2014 ${cardLabel(next)}. The streak holds at ${this.streak}.`);
      this.beat = setTimeout(() => this.advance(), STEP_MS);
      return;
    }

    const isHigher = next.value > this.current.value;
    const isRight = direction === 'higher' ? isHigher : !isHigher;

    if (isRight) {
      this.streak += 1;
      this.pot += this.streak ** 2;
      this.paintStats();
      ctx.message(`${cardShort(next)} \u2014 called. Pot ${this.pot}; next call pays ${(this.streak + 1) ** 2}.`);
      this.beat = setTimeout(() => this.advance(), STEP_MS);
      return;
    }

    // Missed: the hand ends and the pot goes with it.
    const lost = this.pot;
    const endedStreak = this.streak;

    this.streak = 0;
    this.pot = 0;
    this.phase = 'busted';

    if (lost > 0) {
      this.potPanel.classList.add('hl__pot--lost');
      this.setPotCaption('lost');
    }
    this.potEl.textContent = String(lost);
    this.streakEl.textContent = '0';
    this.nextPaysEl.textContent = '1';
    this.bankValue.textContent = '0';
    this.syncControls();

    const tail = endedStreak > 0 ? ` Streak ended at ${endedStreak}.` : '';
    ctx.message(lost > 0
      ? `${cardLabel(next)} \u2014 missed. ${lost} on the table, gone.${tail}`
      : `${cardLabel(next)} \u2014 missed.${tail}`);

    this.beat = setTimeout(() => {
      if (this.alive) this.newHand();
    }, BEAT_MS);
  },

  /** A correct call or a push: the revealed card takes the table. */
  advance() {
    if (!this.alive) return;

    this.current = this.revealed || this.current;
    this.currentSlot.replaceChildren(this.nextSlot.firstElementChild);
    this.nextSlot.replaceChildren();
    this.revealed = null;
    this.phase = 'awaiting';
    this.refresh();
  },

  /* -------------------------------------------------------------- banking */

  bank() {
    if (!this.alive || this.phase !== 'awaiting' || this.pot <= 0) return;

    const ctx = this.ctx;
    const banked = this.pot;
    const isBest = banked > this.bestPot;

    this.bestPot = Math.max(this.bestPot, banked);
    this.pot = 0;
    this.streak = 0;
    this.phase = 'banked';

    this.potPanel.classList.add('hl__pot--banked');
    this.potEl.textContent = String(banked);
    this.setPotCaption('banked');
    this.streakEl.textContent = '0';
    this.nextPaysEl.textContent = '1';
    this.bestPotEl.textContent = String(this.bestPot);
    this.bankValue.textContent = '0';
    this.syncControls();

    ctx.addPoints(banked);
    ctx.message(isBest
      ? `Banked ${banked} \u2014 the night\u2019s biggest pot.`
      : `Banked ${banked}.`);

    this.beat = setTimeout(() => {
      if (this.alive) this.newHand();
    }, BANK_MS);
  },
};

export default game;
