/* ---------------------------------------------------------------------------
  Crown & Anchor — collect your pot.

  Roll five symbol dice, optionally reroll one, then collect a symbol that
  landed. Each unclaimed symbol's pot grows, making every roll a new decision.

   The symbol buttons are the game and the shell's action bar stays hidden. The
   dice are a control too — one may be rerolled — so the caption above them
   names the reroll while it is live and retires once it is spent.
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

const SWEEP_BONUS = 10;
const START_POT = 3;
const POT_GROWTH = 2;
const DICE_COUNT = 5;
const BEAT_MS = 1000;

const REROLL_HINT = 'one reroll \u2014 tap a die';
const COLLECT_HINT = 'choose a symbol to collect its pot';

function renderSymbolDie(symbol, isHit, onReroll) {
  const die = document.createElement('button');
  die.type = 'button';
  die.className = `die die--symbol${isHit ? ' die--hit' : ''}`;
  die.disabled = !onReroll;
  die.setAttribute('aria-label', onReroll ? `${symbol.name}, reroll this die` : symbol.name);
  if (onReroll) die.addEventListener('click', onReroll);

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

    this.promptEl = document.createElement('p');
    this.promptEl.className = 'cap';
    this.promptEl.textContent = COLLECT_HINT;

    this.symbolsEl = document.createElement('div');
    this.symbolsEl.className = 'ca__symbols';
    this.potEls = [];

    this.symbolButtons = SYMBOLS.map((symbol, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ca__symbol';
      const glyph = document.createElement('span');
      glyph.className = 'ca__symbol-glyph';
      glyph.textContent = symbol.glyph;
      const pot = document.createElement('span');
      pot.className = 'ca__symbol-pot';
      button.append(glyph, pot);
      button.setAttribute('aria-label', symbol.name);
      button.title = symbol.name;
      button.addEventListener('click', () => this.call(index));
      this.symbolsEl.append(button);
      this.potEls.push(pot);
      return button;
    });

    // Above the dice, not below them: the caption has to read as belonging to
    // the dice while it advertises the reroll, then retire to naming the row
    // that is left to press.
    wrap.append(this.promptEl, this.diceEl, this.symbolsEl);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.alive = true;
    this.pots = SYMBOLS.map(() => START_POT);
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
    this.landed = roll(ctx.rng, DICE_COUNT, 6).map((face) => SYMBOLS[face - 1]);
    this.landedCounts = SYMBOLS.map((symbol) => this.landed.filter((face) => face.id === symbol.id).length);
    this.rerollsRemaining = 1;
    this.renderDice(true);
    this.updatePots();
    this.promptEl.textContent = REROLL_HINT;

    ctx.message('Collect a shown symbol, or click one die to reroll it once.');
  },

  renderDice(canReroll, selectedSymbolId = null) {
    this.diceEl.replaceChildren(...this.landed.map((symbol, index) => renderSymbolDie(
      symbol,
      symbol.id === selectedSymbolId,
      canReroll ? () => this.rerollDie(index) : null,
    )));
  },

  rerollDie(index) {
    if (this.locked || !this.alive || this.rerollsRemaining === 0) return;

    this.rerollsRemaining = 0;
    const current = SYMBOLS.indexOf(this.landed[index]);
    this.landed[index] = SYMBOLS[(current + 1 + Math.floor(this.ctx.rng() * (SYMBOLS.length - 1))) % SYMBOLS.length];
    this.landedCounts = SYMBOLS.map((symbol) => this.landed.filter((face) => face.id === symbol.id).length);
    this.renderDice(false);
    this.updatePots();
    this.promptEl.textContent = COLLECT_HINT;
    this.ctx.message('Reroll used. Choose one of the symbols shown to collect its pot.');
  },

  updatePots() {
    this.pots.forEach((pot, index) => {
      const hits = this.landedCounts?.[index] || 0;
      const points = hits * pot + (hits === DICE_COUNT ? SWEEP_BONUS : 0);
      this.potEls[index].textContent = hits ? `${points} pts` : `${pot} pot`;
      this.symbolButtons[index].setAttribute('aria-label', hits
        ? `${SYMBOLS[index].name}, ${hits} dice, collect ${points} points`
        : `${SYMBOLS[index].name}, pot ${pot} points, not rolled`);
      this.symbolButtons[index].title = hits
        ? `${SYMBOLS[index].name}: ${hits} dice, collect ${points} points`
        : `${SYMBOLS[index].name}: ${pot}-point pot, not rolled`;
      this.symbolButtons[index].disabled = this.locked || hits === 0;
    });
  },

  /* ---------------------------------------------------------------- action */

  call(index) {
    if (this.locked || !this.alive || this.landedCounts[index] === 0) return;

    const ctx = this.ctx;
    const called = SYMBOLS[index];
    const pot = this.pots[index];
    const hits = this.landedCounts[index];

    this.locked = true;
    this.renderDice(false, called.id);
    this.updatePots();
    this.promptEl.textContent = 'dice locked';

    let points = hits * pot;
    if (hits === DICE_COUNT) points += SWEEP_BONUS;
    ctx.addPoints(points);
    this.pots = this.pots.map((currentPot, potIndex) => potIndex === index ? START_POT : currentPot + POT_GROWTH);
    this.updatePots();

    if (hits === DICE_COUNT) {
      ctx.message(`All five ${called.name}s — collected ${points} points, including the full-table bonus.`);
    } else if (hits > 1) {
      ctx.message(`${hits} ${called.name}s — collected ${points} points at ${pot} per die.`);
    } else {
      ctx.message(`One ${called.name} — collected ${points} points. Unclaimed pots grow by ${POT_GROWTH}.`);
    }

    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(ctx);
    }, BEAT_MS);
  },
};

export default game;
