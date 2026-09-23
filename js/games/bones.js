/* ---------------------------------------------------------------------------
   Bones — shut the box.

   One round: roll two dice, then shut tiles whose numbers add up to the roll.
   Shut them all and the round is a clean sweep. Get a roll you cannot make and
   the round ends where it stands.

   The whole game is one action, so the shell's single button carries it: it
   reads "Roll" while you are rolling and "Shut" once your tiles add up.
   --------------------------------------------------------------------------- */

import { renderDice, roll, subsetsSummingTo, sum } from '../dice.js';

const TILES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Pause between rounds, long enough to read what happened. */
const BEAT_MS = 1100;

const game = {
  id: 'bones',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'bones';

    const grid = document.createElement('div');
    grid.className = 'tiles';

    this.tiles = new Map();
    for (const value of TILES) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.textContent = String(value);
      tile.disabled = true;
      tile.setAttribute('aria-pressed', 'false');
      tile.setAttribute('aria-label', `Tile ${value}`);
      tile.addEventListener('click', () => this.toggleTile(value));
      grid.append(tile);
      this.tiles.set(value, tile);
    }

    const rollRow = document.createElement('div');
    rollRow.className = 'bones__roll';
    this.diceEl = document.createElement('span');
    this.diceEl.className = 'dice';
    this.totalEl = document.createElement('span');
    this.totalEl.className = 'bones__total';
    rollRow.append(this.diceEl, this.totalEl);

    const record = document.createElement('div');
    record.className = 'bones__record';
    const recordLabel = document.createElement('span');
    recordLabel.className = 'bones__record-label';
    recordLabel.textContent = 'Most boxes shut in one round';
    this.recordEl = document.createElement('strong');
    this.recordEl.className = 'bones__record-value';
    record.append(recordLabel, this.recordEl);

    wrap.append(grid, rollRow, ctx.actionBar, record);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.alive = true;
    this.bestRoundShut = 0;
    this.recordEl.textContent = '0';
    this.newRound(ctx);
  },

  stop() {
    this.alive = false;
    clearTimeout(this.beat);
  },

  /* ------------------------------------------------------------- one round */

  newRound(ctx) {
    this.open = new Set(TILES);
    this.picked = new Set();
    this.shut = 0;
    this.total = 0;
    this.phase = 'ready'; // 'ready' | 'shutting' | 'over'

    this.diceEl.replaceChildren();
    this.totalEl.replaceChildren();
    this.paint();

    ctx.message('Roll the bones.');
    ctx.setActionLabel('Roll');
    ctx.setActionEnabled(true);
  },

  paint() {
    for (const [value, tile] of this.tiles) {
      const isOpen = this.open.has(value);
      tile.classList.toggle('tile--shut', !isOpen);
      tile.disabled = !isOpen || this.phase !== 'shutting';
      tile.setAttribute('aria-pressed', String(isOpen && this.picked.has(value)));
    }
  },

  /* ---------------------------------------------------------------- action */

  act(ctx) {
    if (this.phase === 'ready') this.doRoll(ctx);
    else if (this.phase === 'shutting' && this.pickedTotal() === this.total) this.commit(ctx);
  },

  doRoll(ctx) {
    const dice = roll(ctx.rng, 2, 6);
    this.total = sum(dice);

    this.diceEl.replaceChildren(renderDice(dice));
    this.totalEl.replaceChildren(document.createTextNode('total '));
    const strong = document.createElement('strong');
    strong.textContent = String(this.total);
    this.totalEl.append(strong);

    const playable = subsetsSummingTo([...this.open], this.total).length > 0;

    if (!playable) {
      // Nothing on the table can make this roll. That is the round.
      this.phase = 'over';
      this.paint();
      ctx.setActionEnabled(false);
      ctx.setActionLabel('Roll');
      ctx.message(`Rolled ${this.total} — nothing left to shut.`);
      this.endRound(ctx);
      return;
    }

    this.phase = 'shutting';
    this.picked.clear();
    this.paint();
    ctx.setActionLabel('Shut');
    ctx.setActionEnabled(false);
    ctx.message(`Rolled ${this.total}. Pick tiles that add up to it.`);
  },

  toggleTile(value) {
    if (this.phase !== 'shutting' || !this.open.has(value)) return;

    const ctx = this.ctx;

    if (this.picked.has(value)) {
      this.picked.delete(value);
    } else {
      const next = this.pickedTotal() + value;
      if (next > this.total) {
        ctx.message(`${next} is over ${this.total}.`);
        return;
      }
      this.picked.add(value);
    }

    this.paint();

    const picked = this.pickedTotal();
    ctx.setActionEnabled(picked === this.total);
    ctx.message(picked === this.total ? `${this.total} exactly.` : `Picked ${picked} of ${this.total}.`);
  },

  pickedTotal() {
    let total = 0;
    for (const value of this.picked) total += value;
    return total;
  },

  commit(ctx) {
    const size = this.picked.size;
    for (const value of this.picked) this.open.delete(value);
    this.shut += size;
    this.bestRoundShut = Math.max(this.bestRoundShut, this.shut);
    this.recordEl.textContent = String(this.bestRoundShut);
    this.picked.clear();

    if (this.open.size === 0) {
      this.phase = 'over';
      this.paint();
      ctx.setActionEnabled(false);
      ctx.setActionLabel('Roll');
      ctx.message(`Box shut with ${size}. Clean sweep.`);
      this.endRound(ctx);
      return;
    }

    this.phase = 'ready';
    this.paint();
    ctx.setActionLabel('Roll again');
    ctx.setActionEnabled(true);
    ctx.message(`Shut ${size}. ${this.open.size} left on the table.`);
  },

  endRound(ctx) {
    ctx.addPoints(this.shut);
    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(ctx);
    }, BEAT_MS);
  },
};

export default game;
