/* ---------------------------------------------------------------------------
   Crown & Anchor — call your symbol.

   A real game from real taverns: six symbols on the table, three symbol dice,
   and one call. Every die that lands on your symbol pays, and all three at once
   pays properly.

   The whole round is a single click, so the shell's action bar stays hidden and
   the symbol buttons are the game.
   --------------------------------------------------------------------------- */

import { roll } from '../dice.js';

const SYMBOLS = [
  { id: 'crown', glyph: '\u265B', name: 'crown' },
  { id: 'anchor', glyph: '\u2693', name: 'anchor' },
  { id: 'diamond', glyph: '\u2666', name: 'diamond' },
  { id: 'spade', glyph: '\u2660', name: 'spade' },
  { id: 'heart', glyph: '\u2665', name: 'heart' },
  { id: 'club', glyph: '\u2663', name: 'club' },
];

const MATCH_POINTS = 3;
const SWEEP_BONUS = 10;
const BEAT_MS = 1000;

function renderSymbolDie(symbol, isHit) {
  const die = document.createElement('span');
  die.className = `die die--symbol${isHit ? ' die--hit' : ''}`;
  die.setAttribute('role', 'img');
  die.setAttribute('aria-label', symbol.name);

  const glyph = document.createElement('span');
  glyph.className = 'die__glyph';
  glyph.textContent = symbol.glyph;

  die.append(glyph);
  return die;
}

const game = {
  id: 'crown-anchor',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'ca';

    this.diceEl = document.createElement('div');
    this.diceEl.className = 'ca__dice';

    const prompt = document.createElement('p');
    prompt.className = 'cap';
    prompt.textContent = 'call a symbol';

    this.symbolsEl = document.createElement('div');
    this.symbolsEl.className = 'ca__symbols';

    this.symbolButtons = SYMBOLS.map((symbol, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ca__symbol';
      button.textContent = symbol.glyph;
      button.setAttribute('aria-label', symbol.name);
      button.title = symbol.name;
      button.addEventListener('click', () => this.call(index));
      this.symbolsEl.append(button);
      return button;
    });

    wrap.append(this.diceEl, prompt, this.symbolsEl);
    ctx.stage.append(wrap);

    // 1-6 call the matching symbol.
    document.addEventListener('keydown', (event) => {
      const slot = Number(event.key);
      if (!Number.isInteger(slot) || slot < 1 || slot > SYMBOLS.length) return;
      event.preventDefault();
      this.call(slot - 1);
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
    this.diceEl.replaceChildren();
    for (const button of this.symbolButtons) button.disabled = false;

    ctx.message('Call a symbol. Every die that matches pays.');
  },

  /* ---------------------------------------------------------------- action */

  call(index) {
    if (this.locked || !this.alive) return;

    const ctx = this.ctx;
    const called = SYMBOLS[index];

    this.locked = true;
    for (const button of this.symbolButtons) button.disabled = true;

    const faces = roll(ctx.rng, 3, 6);
    const landed = faces.map((face) => SYMBOLS[face - 1]);
    const hits = landed.filter((symbol) => symbol.id === called.id).length;

    this.diceEl.replaceChildren(...landed.map((symbol) => renderSymbolDie(symbol, symbol.id === called.id)));

    let points = hits * MATCH_POINTS;
    if (hits === SYMBOLS.length) points += SWEEP_BONUS;
    if (points > 0) ctx.addPoints(points);

    if (hits === 3) {
      ctx.message(`Three ${called.name}s — ${points} points.`);
    } else if (hits === 2) {
      ctx.message(`Two ${called.name}s — ${points} points.`);
    } else if (hits === 1) {
      ctx.message(`One ${called.name} — ${points} points.`);
    } else {
      ctx.message(`No ${called.name}s.`);
    }

    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(ctx);
    }, BEAT_MS);
  },
};

export default game;
