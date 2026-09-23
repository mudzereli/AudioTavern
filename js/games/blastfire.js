/* ---------------------------------------------------------------------------
   Blastfire — cross the bog.

   The ground is a grid of patches and some of them are holding gas. Every patch
   you open tells you how many of its neighbours are pockets, so the way across
   can be worked out rather than guessed at. One wrong step and the round goes
   up.

   Scoring is progress, not survival: every patch opened is a point, and crossing
   the whole bog pays a bonus. The first patch you touch is always safe, so a
   round can never end on the opening move.
   --------------------------------------------------------------------------- */

import { shuffle } from '../rng.js';

const COLS = 6;
const ROWS = 6;
const POCKETS = 6;
const CLEAR_BONUS = 10;
const BEAT_MS = 1200;

const GAS_GLYPH = '\u2739';

/** The indices touching `index`, diagonals included. */
function neighbours(index) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const found = [];

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;

      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;

      found.push(r * COLS + c);
    }
  }

  return found;
}

const game = {
  id: 'blastfire',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'bog';

    this.board = document.createElement('div');
    this.board.className = 'bog__board';
    this.board.style.setProperty('--cols', String(COLS));

    this.tiles = [];
    for (let index = 0; index < COLS * ROWS; index += 1) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'bog__tile';
      tile.addEventListener('click', () => this.probe(index));
      this.board.append(tile);
      this.tiles.push(tile);
    }

    wrap.append(this.board);
    ctx.stage.append(wrap);
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
    this.awaitingFirstProbe = true;
    this.gas = new Set();
    this.counts = new Array(COLS * ROWS).fill(0);
    this.revealed = new Set();

    for (const tile of this.tiles) {
      tile.className = 'bog__tile';
      tile.textContent = '';
      tile.disabled = false;
      tile.removeAttribute('data-count');
      tile.setAttribute('aria-label', 'unprobed patch');
    }

    ctx.message('Probe the bog. Numbers count the pockets alongside.');
  },

  /**
   * Scatter the pockets only once the player has committed to a first patch,
   * and keep that patch and its neighbours clear. That guarantees an opening to
   * work from instead of a one-in-six chance of losing before you have read
   * anything.
   */
  placePockets(safeIndex) {
    const banned = new Set([safeIndex, ...neighbours(safeIndex)]);
    const candidates = [];
    for (let index = 0; index < COLS * ROWS; index += 1) {
      if (!banned.has(index)) candidates.push(index);
    }

    for (const index of shuffle(this.ctx.rng, candidates).slice(0, POCKETS)) {
      this.gas.add(index);
    }

    for (let index = 0; index < COLS * ROWS; index += 1) {
      this.counts[index] = neighbours(index).filter((n) => this.gas.has(n)).length;
    }
  },

  /* --------------------------------------------------------------- one step */

  probe(index) {
    if (this.locked || !this.alive) return;
    if (this.revealed.has(index)) return;

    const ctx = this.ctx;

    if (this.awaitingFirstProbe) {
      this.placePockets(index);
      this.awaitingFirstProbe = false;
    }

    if (this.gas.has(index)) {
      this.explode(ctx, index);
      return;
    }

    const opened = this.openFrom(index);
    ctx.addPoints(opened.length);

    const safeTotal = COLS * ROWS - POCKETS;
    if (this.revealed.size >= safeTotal) {
      this.locked = true;
      ctx.addPoints(CLEAR_BONUS);
      ctx.message(`Bog crossed. ${CLEAR_BONUS} bonus points.`);
      this.settle(ctx);
      return;
    }

    ctx.message(`${this.revealed.size} of ${safeTotal} patches open.`);
  },

  /** Open a patch, and keep going while the patches around it are clear. */
  openFrom(start) {
    const opened = [];
    const queue = [start];
    const queued = new Set([start]);

    while (queue.length > 0) {
      const index = queue.shift();
      if (this.revealed.has(index) || this.gas.has(index)) continue;

      this.revealed.add(index);
      this.paintOpen(index);
      opened.push(index);

      if (this.counts[index] !== 0) continue;

      for (const neighbour of neighbours(index)) {
        if (queued.has(neighbour) || this.revealed.has(neighbour) || this.gas.has(neighbour)) continue;
        queued.add(neighbour);
        queue.push(neighbour);
      }
    }

    return opened;
  },

  paintOpen(index) {
    const tile = this.tiles[index];
    const count = this.counts[index];

    tile.disabled = true;
    tile.classList.add('bog__tile--open');

    if (count > 0) {
      tile.textContent = String(count);
      tile.dataset.count = String(count);
      tile.setAttribute('aria-label', `${count} pockets alongside`);
    } else {
      tile.setAttribute('aria-label', 'clear patch');
    }
  },

  explode(ctx, index) {
    this.locked = true;

    const hit = this.tiles[index];
    hit.textContent = GAS_GLYPH;
    hit.disabled = true;
    hit.classList.add('bog__tile--gas');
    hit.setAttribute('aria-label', 'gas pocket — the round ends here');

    // Show where the rest of them were, so the board can be read back.
    for (const pocket of this.gas) {
      if (pocket === index) continue;
      const tile = this.tiles[pocket];
      tile.textContent = GAS_GLYPH;
      tile.disabled = true;
      tile.classList.add('bog__tile--gas-seen');
      tile.setAttribute('aria-label', 'gas pocket');
    }

    ctx.message(`Blastfire. ${this.revealed.size} patches open.`);
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
