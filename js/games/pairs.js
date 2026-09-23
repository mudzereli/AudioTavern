/* ---------------------------------------------------------------------------
   Pairs — memory, with a deck.

   Twelve cards face down, six pairs. Turn up two at a time; a matching pair
   stays up and scores, a miss turns back over. Clear the board and a fresh one
   is dealt straight away.

   There is no way to lose a round, only to be slow — the ten-minute clock is
   the only pressure, and the score is simply how many pairs you found.
   --------------------------------------------------------------------------- */

import { cardLabel, createDeck, renderCard } from '../deck.js';
import { shuffle } from '../rng.js';

const PAIR_COUNT = 6;
const FLIP_BACK_MS = 780;
const NEW_BOARD_MS = 820;

const game = {
  id: 'pairs',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'pairs';

    this.board = document.createElement('div');
    this.board.className = 'pairs__board';

    wrap.append(this.board);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.alive = true;
    this.newBoard(ctx);
  },

  stop() {
    this.alive = false;
    this.locked = true;
    clearTimeout(this.beat);
  },

  /* -------------------------------------------------------------- one board */

  newBoard(ctx) {
    this.locked = false;
    this.revealed = [];
    this.matched = new Set();

    // Six cards doubled. The same object appears twice, so a pair can be
    // detected by identity rather than by comparing rank and suit.
    const drawn = shuffle(ctx.rng, createDeck()).slice(0, PAIR_COUNT);
    this.cards = shuffle(ctx.rng, [...drawn, ...drawn]);

    this.board.replaceChildren();

    this.slots = this.cards.map((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pairs__card';
      button.addEventListener('click', () => this.flip(index));
      this.board.append(button);
      return button;
    });

    // Painted after this.slots exists, because paintSlot reads it.
    for (let index = 0; index < this.slots.length; index += 1) {
      this.paintSlot(index);
    }

    ctx.message('Turn up two cards.');
  },

  paintSlot(index) {
    const button = this.slots[index];
    const card = this.cards[index];
    const faceUp = this.revealed.includes(index) || this.matched.has(index);

    button.replaceChildren(renderCard(card, { faceDown: !faceUp }));
    button.classList.toggle('pairs__card--matched', this.matched.has(index));
    button.setAttribute('aria-label', faceUp ? `Card ${index + 1}: ${cardLabel(card)}` : `Card ${index + 1}: face down`);
    button.disabled = faceUp;
  },

  /* --------------------------------------------------------------- one flip */

  flip(index) {
    if (this.locked || !this.alive) return;
    if (this.revealed.includes(index) || this.matched.has(index)) return;

    const ctx = this.ctx;

    this.revealed.push(index);
    this.paintSlot(index);

    if (this.revealed.length < 2) {
      ctx.message('One more.');
      return;
    }

    const [first, second] = this.revealed;

    if (this.cards[first] === this.cards[second]) {
      this.matched.add(first);
      this.matched.add(second);
      this.revealed = [];

      this.paintSlot(first);
      this.paintSlot(second);
      ctx.addPoints(1);

      if (this.matched.size === this.cards.length) {
        this.locked = true;
        ctx.message('Board cleared.');
        this.settle(ctx, NEW_BOARD_MS);
        return;
      }

      ctx.message(`A pair. ${this.matched.size / 2} of ${PAIR_COUNT}.`);
      return;
    }

    // A miss: hold the cards up long enough to be read, then turn them back.
    this.locked = true;
    ctx.message('No match.');

    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.revealed = [];
      this.paintSlot(first);
      this.paintSlot(second);
      this.locked = false;
    }, FLIP_BACK_MS);
  },

  settle(ctx, delay) {
    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newBoard(ctx);
    }, delay);
  },
};

export default game;
