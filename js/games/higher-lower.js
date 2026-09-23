/* ---------------------------------------------------------------------------
   Higher or Lower — call the card.

  A card sits on the table. Call the next one higher or lower. Reveal it on the
  right; after a correct call or tie, advance it to the left before guessing
  again. A wrong call ends the round and deals a fresh shuffle.

   This table has two actions rather than one, so it draws its own buttons and
   the shell hides its single-action bar. Left and right arrows work too.
   --------------------------------------------------------------------------- */

import { cardLabel, createDeck, renderCard } from '../deck.js';
import { shuffle } from '../rng.js';

/** Pause after a miss, long enough to see the card that beat you. */
const BEAT_MS = 950;

const game = {
  id: 'higher-lower',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'hl';

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
    this.lowerBtn.className = 'btn btn--ghost';
    this.lowerBtn.textContent = '\u2190 Lower';
    this.lowerBtn.addEventListener('click', () => this.call('lower'));

    this.higherBtn = document.createElement('button');
    this.higherBtn.type = 'button';
    this.higherBtn.className = 'btn btn--primary';
    this.higherBtn.textContent = 'Higher \u2192';
    this.higherBtn.addEventListener('click', () => this.call('higher'));

    const calls = document.createElement('div');
    calls.className = 'hl__calls';
    calls.append(this.lowerBtn, this.higherBtn);

    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.className = 'btn btn--primary hl__next';
    this.nextBtn.textContent = 'Next card';
    this.nextBtn.hidden = true;
    this.nextBtn.addEventListener('click', () => this.advance());

    const stats = document.createElement('div');
    stats.className = 'hl__stats';

    const currentStat = document.createElement('div');
    currentStat.className = 'hl__stat';
    const currentLabel = document.createElement('span');
    currentLabel.className = 'hl__stat-label';
    currentLabel.textContent = 'Current streak';
    this.streakEl = document.createElement('strong');
    this.streakEl.className = 'hl__stat-value';
    currentStat.append(currentLabel, this.streakEl);

    const bestStat = document.createElement('div');
    bestStat.className = 'hl__stat hl__stat--best';
    const bestLabel = document.createElement('span');
    bestLabel.className = 'hl__stat-label';
    bestLabel.textContent = 'Highest streak so far';
    this.bestStreakEl = document.createElement('strong');
    this.bestStreakEl.className = 'hl__stat-value';
    bestStat.append(bestLabel, this.bestStreakEl);

    stats.append(currentStat, bestStat);

    wrap.append(pair, calls, this.nextBtn, stats);
    ctx.stage.append(wrap);

    // The two calls are the whole game, so bind them once and keep them.
    document.addEventListener('keydown', (event) => {
      if (this.locked || !this.alive) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.call('lower');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.call('higher');
      }
    });
  },

  start(ctx) {
    this.alive = true;
    this.bestStreak = 0;
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
    this.awaitingNext = false;
    this.streak = 0;
    this.deck = shuffle(ctx.rng, createDeck());
    this.current = this.draw(ctx);

    this.nextSlot.replaceChildren();
    this.paint();
    this.calls = this.lowerBtn.parentElement;
    this.calls.hidden = false;
    this.nextBtn.hidden = true;
    this.setCallsEnabled(true);

    ctx.message('Call the next card. Left arrow for lower, right for higher.');
  },

  paint() {
    this.currentSlot.replaceChildren(renderCard(this.current));
    this.streakEl.textContent = String(this.streak);
    this.bestStreakEl.textContent = String(this.bestStreak);
  },

  setCallsEnabled(enabled) {
    this.lowerBtn.disabled = !enabled;
    this.higherBtn.disabled = !enabled;
  },

  draw() {
    // Reshuffle rather than run dry, so a long run never stalls.
    if (this.deck.length < 2) this.deck = shuffle(this.ctx.rng, createDeck());
    return this.deck.pop();
  },

  /* ---------------------------------------------------------------- action */

  call(direction) {
    if (this.locked || !this.alive) return;

    const ctx = this.ctx;
    const next = this.draw();
    this.revealed = next;
    this.nextSlot.replaceChildren(renderCard(next));

    this.locked = true;
    this.setCallsEnabled(false);
    this.calls.hidden = true;

    if (next.value === this.current.value) {
      this.awaitingNext = true;
      this.nextBtn.hidden = false;
      ctx.message(`Push. Highest streak so far: ${this.bestStreak}. Advance to continue.`);
      return;
    }

    const isHigher = next.value > this.current.value;
    const isRight = direction === 'higher' ? isHigher : !isHigher;

    if (isRight) {
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      ctx.addPoints(1);
      this.streakEl.textContent = String(this.streak);
      this.bestStreakEl.textContent = String(this.bestStreak);
      this.awaitingNext = true;
      this.nextBtn.hidden = false;
      ctx.message(`Highest streak so far: ${this.bestStreak}. Advance to continue.`);
      return;
    }

    const endedStreak = this.streak;
    this.streak = 0;
    this.streakEl.textContent = '0';
    ctx.message(`${cardLabel(next)} — missed. Streak ended at ${endedStreak}; highest so far: ${this.bestStreak}.`);

    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(ctx);
    }, BEAT_MS);
  },

  advance() {
    if (!this.alive || !this.awaitingNext) return;

    this.current = this.revealed;
    this.currentSlot.replaceChildren(this.nextSlot.firstElementChild);
    this.nextSlot.replaceChildren();
    this.revealed = null;
    this.awaitingNext = false;
    this.locked = false;
    this.calls.hidden = false;
    this.nextBtn.hidden = true;
    this.setCallsEnabled(true);
    this.ctx.message('Call the next card. Left arrow for lower, right for higher.');
  },
};

export default game;
