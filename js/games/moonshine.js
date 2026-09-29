/* ---------------------------------------------------------------------------
   Moonshine — one night at a backyard still.

   The score is what the still makes: one point a bottle, counted as it comes
   off the kettle. Money is the budget — earned by selling, spent on upgrades,
   never scored — so the night is a race between making bottles and affording
   the kit that makes more of them.

  Six chains, one lever each, each bought in order. The Still is always open;
  two of the other five are out each night, changing which strategy is available.

  The shell's button sells one bottle by hand at the Runners rate.
   In the opening the hand is the only real channel; from the middle of the night
   the customers do it, and the hand is what clears a shed they cannot keep up
   with.
   --------------------------------------------------------------------------- */

import { el, plural, svgEl, svgPath } from '../dom.js';
import { shuffle } from '../rng.js';

/** How often the still and the buyers are settled. */
const TICK_MS = 200;

/** How long stock must wait before Aging Casks pay their premium. */
const CASK_AGE_SECONDS = 30;

/* The still: a copper pot, a neck curling down to a spout, a drip, and a fire. */
const ART = [
  'M14 26 h22 v16 a8 8 0 0 1 -8 8 h-6 a8 8 0 0 1 -8 -8 z',
  'M36 30 h8 a6 6 0 0 1 0 12 h-3 M41 44 v10',
  'M14 58 l5 -8 5 8',
];

/* The six chains — one per lever. `base` is what the chain is worth at level 0; a step's
   `value` is what the chain is worth once that step is bought, never an increment. */
const CHAINS = [
  {
    id: 'still',
    label: 'The Still',
    base: 0.2,
    steps: [
      { name: 'Better Fire', cost: 10, value: 0.25 },
      { name: 'Copper Coil', cost: 25, value: 1 / 3 },
      { name: 'Large Still', cost: 60, value: 0.5 },
      { name: 'Double Still', cost: 150, value: 1 },
      { name: 'Industrial Still', cost: 400, value: 2 },
    ],
  },
  {
    id: 'buyers',
    label: 'Customers',
    // A neighbour takes the odd bottle from the first second, so the till runs without the
    // player. The ladder tops at 1.4 b/s on purpose: with the hand at 0.4 b/s the shelf is
    // still filling in the last minute, which is the only thing keeping the shed chain worth
    // buying. Never let this top out above the still's 2 b/s.
    base: 0.1,
    steps: [
      { name: 'Regular Customers', cost: 20, value: 0.25 },
      { name: 'Bar Connection', cost: 50, value: 0.6 },
      { name: 'Delivery Wagon', cost: 120, value: 1 },
      { name: 'Delivery Truck', cost: 350, value: 1.4 },
    ],
  },
  {
    id: 'mash',
    label: 'The Mash',
    // Doubled with the base price, because the money curve is the pace of the whole night:
    // at $2 a bottle and up, the shop is affordable inside ten minutes. Halving these halve
    // the pace.
    base: 2,
    steps: [
      { name: 'Better Mash', cost: 30, value: 4 },
      { name: 'Quality Ingredients', cost: 100, value: 8 },
      { name: 'Secret Recipe', cost: 300, value: 16 },
      { name: 'Premium Moonshine', cost: 750, value: 30 },
      { name: 'Black Label', cost: 1500, value: 50 },
    ],
  },
  {
    id: 'shed',
    label: 'The Shed',
    base: 5,
    steps: [
      { name: 'Extra Crate', cost: 15, value: 10 },
      { name: 'Storage Shed', cost: 50, value: 25 },
      { name: 'Barn', cost: 175, value: 75 },
      { name: 'Warehouse', cost: 500, value: 200 },
    ],
  },
  {
    id: 'runners',
    label: 'Runners',
    base: 0.4,
    steps: [
      { name: 'Quick Step', cost: 15, value: 0.45 },
      { name: 'Night Route', cost: 45, value: 0.5 },
      { name: 'Handcart', cost: 125, value: 0.55 },
      { name: 'Fast Crew', cost: 300, value: 0.6 },
    ],
  },
  {
    id: 'casks',
    label: 'Aging Casks',
    base: 1,
    steps: [
      { name: 'Charred Oak', cost: 20, value: 1.5 },
      { name: 'Cool Cellar', cost: 60, value: 2 },
      { name: 'Deep Cellar', cost: 175, value: 2.5 },
      { name: 'Hidden Stock', cost: 500, value: 3 },
      { name: 'Master Cooper', cost: 1200, value: 4 },
    ],
  },
];

function money(amount) {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** A number trimmed to what it needs: 0.2, 0.33, 1.1, 4. */
function compact(value) {
  return String(Number(value.toFixed(2)));
}

/** What a chain is worth at a level: 0 is the plain base, n is n steps bought. */
function levelValue(chain, level) {
  return level <= 0 ? chain.base : chain.steps[level - 1].value;
}

/** Everything the still does, derived from the four levels. */
function statsFrom(levels) {
  const value = (id) => levelValue(CHAINS.find((chain) => chain.id === id), levels[id] || 0);
  return {
    rate: value('still'), // bottles a second the kettle turns out
    sell: value('buyers'), // bottles a second the buyers take off you
    worth: value('mash'), // dollars a bottle
    room: value('shed'), // bottles that can wait
    hand: value('runners'), // bottles a second the player can sell
    agedWorth: Math.round(value('mash') * value('casks')),
  };
}

/** The same stats with one chain bought up to `level`. */
function statsWith(levels, id, level) {
  return statsFrom({ ...levels, [id]: level });
}

/** What the step changes, in the chain's own unit — the change is the row. */
function effectOf(chain, before, after) {
  if (chain.id === 'mash') return `$${money(before.worth)} → $${money(after.worth)} a bottle`;
  if (chain.id === 'shed') return `${before.room} → ${after.room} bottles`;
  if (chain.id === 'buyers') return `${compact(before.sell)} → ${compact(after.sell)} a second`;
  if (chain.id === 'runners') return `${compact(before.hand)} → ${compact(after.hand)} a second`;
  if (chain.id === 'casks') return `$${money(before.agedWorth)} → $${money(after.agedWorth)} after ${CASK_AGE_SECONDS}s`;
  return `${compact(before.rate)} → ${compact(after.rate)} a second`;
}

const game = {
  id: 'moonshine',

  mount(ctx) {
    this.ctx = ctx;
    this.wrap = el('section', 'moonshine');
    this.wrap.setAttribute('role', 'group');
    this.wrap.setAttribute('aria-label', 'The backwoods still');

    /* The still and the shed ------------------------------------------------ */

    const still = el('div', 'moonshine__still');
    const art = svgEl('svg', { viewBox: '0 0 64 64', 'aria-hidden': 'true', focusable: 'false' });
    art.classList.add('moonshine__art');
    for (const d of ART) art.append(svgPath(d, 2));

    const shed = el('div', 'moonshine__shed');
    const cashHead = el('div', 'moonshine__shed-head');
    this.cashValue = el('strong', 'moonshine__cash', '$0');
    cashHead.append(el('span', 'moonshine__cap', 'In hand'), this.cashValue);
    const shedHead = el('div', 'moonshine__shed-head');
    this.shedLabel = el('span', 'moonshine__shed-count', '0 / 5');
    shedHead.append(el('span', 'moonshine__cap', 'Waiting in the shed'), this.shedLabel);
    const bar = el('div', 'moonshine__shed-bar');
    this.shedFill = el('i', 'moonshine__shed-fill');
    bar.append(this.shedFill);
    this.clog = el('p', 'moonshine__clog', 'Shed full — the still is stalling');
    this.clog.hidden = true;
    shed.append(cashHead, shedHead, bar, this.clog);
    still.append(art, shed);

    /* The rates ------------------------------------------------------------- */

    const rates = el('div', 'moonshine__rates');
    const cell = (label) => {
      const box = el('div', 'moonshine__rate');
      const value = el('strong', 'moonshine__rate-value');
      box.append(el('span', 'moonshine__cap', label), value);
      rates.append(box);
      return value;
    };
    this.stillValue = cell('Bottles a second');
    this.buyersValue = cell('Buyers a second');
    this.mashValue = cell('A bottle');
    this.handValue = cell('Hand a second');

    /* The shop -------------------------------------------------------------- */

    const shop = el('div', 'moonshine__shop');
    this.rows = CHAINS.map((chain) => {
      const button = el('button', 'moonshine__step');
      button.type = 'button';
      const label = el('span', 'moonshine__chain', chain.label);
      const pips = el('span', 'moonshine__pips');
      const marks = chain.steps.map(() => {
        const pip = el('i', 'moonshine__pip');
        pips.append(pip);
        return pip;
      });
      const name = el('span', 'moonshine__step-name');
      const cost = el('span', 'moonshine__step-cost');
      const effectEl = el('span', 'moonshine__step-effect');
      button.append(label, pips, name, cost, effectEl);
      button.addEventListener('click', () => this.buy(chain));
      shop.append(button);
      return { chain, button, name, cost, effectEl, marks };
    });

    this.ledger = el('p', 'moonshine__ledger');
    this.wrap.append(still, rates, shop, this.ledger, ctx.actionBar);
    ctx.stage.append(this.wrap);

    this.newNight();
    this.paint();
  },

  start(ctx) {
    this.ctx = ctx;
    this.alive = true;
    this.newNight();
    this.last = performance.now();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    const unavailable = CHAINS.filter((chain) => this.unavailable.has(chain.id))
      .map((chain) => chain.label).join(' and ');
    ctx.message(`${unavailable} are out tonight. Spend what comes in.`);
    this.paint();
  },

  stop() {
    this.alive = false;
    clearInterval(this.timer);
    this.timer = null;
    this.paint();
    this.ctx.message(`The night ends with ${this.ctx.run.score} ${plural(this.ctx.run.score, 'bottle')} made.`);
  },

  /** A fresh night: an empty shed, a plain still and an empty purse. */
  newNight() {
    this.bottles = 0;
    this.brewAcc = 0;
    this.sellAcc = 0;
    this.cash = 0;
    this.sold = 0;
    this.takings = 0;
    this.spent = 0;
    this.handReadyAt = 0;
    this.levels = Object.fromEntries(CHAINS.map((chain) => [chain.id, 0]));
    this.stock = [];
    this.unavailable = new Set(shuffle(this.ctx.rng, CHAINS.filter((chain) => chain.id !== 'still'))
      .slice(0, 2).map((chain) => chain.id));
  },

  /* ------------------------------------------------------------------- the clock */

  tick() {
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    // Nothing accrues off the clock: a finished night or an idle board stays where it is.
    if (!this.alive || this.ctx.run.state !== 'running') return;

    const stats = statsFrom(this.levels);
    // The night runs on the wall clock, hidden tab or not. A background interval is throttled
    // to about a second — a minute under intensive throttling — but dt is measured rather than
    // counted, so the still makes exactly what it would have made in the foreground and one
    // tick pays out the whole gap. The shed is what keeps a walk away honest: leave it long
    // enough and the kettle fills up and stalls like any other time.
    for (const batch of this.stock) batch.age += dt;
    this.brewAcc += stats.rate * dt;
    let made = 0;
    while (this.brewAcc >= 1) {
      if (this.bottles >= stats.room) {
        this.brewAcc = 1; // the kettle holds one bottle's worth and no more
        break;
      }
      this.brewAcc -= 1;
      this.bottles += 1;
      made += 1;
    }
    if (made > 0) this.stock.push({ count: made, age: 0 });
    // A bottle scores the moment it is made, whether or not anybody ever buys it. Batched
    // into one call a tick, because every addPoints is a localStorage write in the shell.
    if (made > 0) this.ctx.addPoints(made);

    this.sellAcc += stats.sell * dt;
    let earned = 0;
    while (this.sellAcc >= 1 && this.bottles > 0) {
      this.sellAcc -= 1;
      earned += this.takeBottle(stats);
    }
    if (this.bottles <= 0) this.sellAcc = 0; // nobody waits at an empty shed
    if (earned > 0) {
      this.cash += earned;
      this.takings += earned;
    }
    this.paint();
  },

  /* ------------------------------------------------------------------- the till */

  buy(chain) {
    if (!this.alive || this.ctx.run.state !== 'running') return;
    if (this.unavailable.has(chain.id)) return;
    const level = this.levels[chain.id];
    const step = chain.steps[level];
    if (!step || this.cash < step.cost) return;
    this.levels[chain.id] = level + 1;
    this.cash -= step.cost;
    this.spent += step.cost;
    this.ctx.message(`${step.name} bought for $${money(step.cost)}.`);
    this.paint();
  },

  act() {
    if (!this.alive || this.ctx.run.state !== 'running') return;
    if (performance.now() < this.handReadyAt) {
      this.ctx.message('Still walking the last one out.');
      return;
    }
    if (this.bottles <= 0) {
      this.ctx.message('Nothing in the shed yet.');
      return;
    }
    const stats = statsFrom(this.levels);
    const worth = this.takeBottle(stats);
    this.handReadyAt = performance.now() + 1000 / stats.hand;
    this.cash += worth;
    this.takings += worth;
    this.ctx.message(`Sold a bottle at the door for $${money(worth)}.`);
    this.paint();
  },

  takeBottle(stats) {
    const batch = this.stock[0];
    if (!batch) return 0;
    batch.count -= 1;
    this.bottles -= 1;
    this.sold += 1;
    if (batch.count === 0) this.stock.shift();
    return batch.age >= CASK_AGE_SECONDS ? stats.agedWorth : stats.worth;
  },

  paint() {
    if (!this.rows) return;
    const run = this.ctx.run;
    const stats = statsFrom(this.levels);

    this.stillValue.textContent = compact(stats.rate);
    this.buyersValue.textContent = compact(stats.sell);
    this.mashValue.textContent = `$${money(stats.worth)}`;
    this.handValue.textContent = compact(stats.hand);
    this.cashValue.textContent = `$${money(this.cash)}`;
    this.shedLabel.textContent = `${this.bottles} / ${stats.room}`;
    this.shedFill.style.transform = `scaleX(${Math.min(1, this.bottles / stats.room)})`;
    this.clog.hidden = this.bottles < stats.room;
    this.ledger.textContent = `${this.sold} ${plural(this.sold, 'bottle')} sold · $${money(this.takings)} taken · $${money(this.spent)} spent`;

    const live = this.alive && run.state === 'running';
    // The hand-sale button stays live for the whole night: an empty shed answers with a
    // message rather than a dead button that flickers as bottles come and go.
    this.ctx.setActionEnabled(live);
    for (const { chain, button, name, cost, effectEl, marks } of this.rows) {
      const level = this.levels[chain.id];
      if (this.unavailable.has(chain.id)) {
        button.classList.add('moonshine__step--closed');
        button.classList.remove('moonshine__step--ready');
        name.textContent = 'Out tonight';
        cost.textContent = '';
        effectEl.textContent = 'This chain is unavailable for the night.';
        button.disabled = true;
        continue;
      }
      button.classList.remove('moonshine__step--closed');
      const step = chain.steps[level];
      marks.forEach((pip, index) => pip.classList.toggle('moonshine__pip--on', index < level));
      if (!step) {
        name.textContent = 'Mastered';
        cost.textContent = '';
        effectEl.textContent = `${chain.label} — nothing left to buy`;
        button.disabled = true;
        continue;
      }
      const before = stats;
      const after = statsWith(this.levels, chain.id, level + 1);
      const effect = effectOf(chain, before, after);
      name.textContent = step.name;
      cost.textContent = `$${money(step.cost)}`;
      effectEl.textContent = effect;
      button.disabled = !live || this.cash < step.cost;
      button.classList.toggle('moonshine__step--ready', live && this.cash >= step.cost);
    }
  },
};

export default game;
