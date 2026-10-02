/* ---------------------------------------------------------------------------
   Moonshine — one night at a backyard still.

   The score is what the still makes: one point a bottle, counted as it comes
   off the kettle. Money is the budget — earned by selling, spent on upgrades,
   never scored — so the night is a race between making bottles and affording
   the kit that makes more of them.

  Eight chains, one lever each, each bought in order. The Still, Batch Size and
  Order Size are always open; two of the other five are out each night.

  The shell's button sells one bottle by hand at the Runners rate.
   In the opening the hand is the only real channel; from the middle of the night
   the customers do it, and the hand is what clears a shed they cannot keep up
   with.
   --------------------------------------------------------------------------- */

import { el, plural, svgEl, svgPath } from '../dom.js';
import { shuffle } from '../rng.js';

/* The still: a copper pot, a neck curling down to a spout, a drip, and a fire. */
const ART = [
  'M14 26 h22 v16 a8 8 0 0 1 -8 8 h-6 a8 8 0 0 1 -8 -8 z',
  'M36 30 h8 a6 6 0 0 1 0 12 h-3 M41 44 v10',
  'M14 58 l5 -8 5 8',
];

/* Starting values and global rules to tune for a new night. */
const TUNING = {
  tickMs: 200,
  caskBonusFillPercent: 75,
  unavailableChainsPerNight: 2,
  initialCycleSeconds: 5,
  initialBatchSize: 1,
  initialCustomerOrderSeconds: 10,
  initialCustomerOrderSize: 0,
  initialHandSaleSeconds: 2,
  initialBottleValue: 1,
  initialShedCapacity: 10,
  initialAgingMultiplier: 1,
  cycleStepDecrements: [1, 2, 3, 4],
  batchSizeStepPercentages: [200, 300, 400, 500],
  customerOrderSizeIncrements: [1, 2, 3, 4],
  customerIntervalStepPercentages: [80, 60, 50, 40],
  bottleValueStepPercentages: [200, 400, 800, 1500, 2500],
  shedCapacityStepPercentages: [200, 500, 1500, 4000],
  handSaleStepPercentages: [83, 67, 50, 33],
  agingMultiplierStepPercentages: [200, 300, 400, 500, 600],
};

function scaledSteps(base, steps, percentages, direction) {
  const values = [];
  let previous = base;
  for (const percentage of percentages) {
    const value = Math.round(base * percentage / 100);
    const improves = direction === 'up' ? value > previous : value > 0 && value < previous;
    if (!improves) continue;
    values.push(value);
    previous = value;
  }
  return steps.slice(0, values.length).map((step, index) => ({ ...step, value: values[index] }));
}

function decrementedSteps(base, steps, decrements, minimum = 1) {
  const values = decrements.map((decrement) => base - decrement)
    .filter((value) => value >= minimum && value < base);
  return steps.slice(0, values.length).map((step, index) => ({ ...step, value: values[index] }));
}

function addedSteps(base, steps, increments) {
  return steps.slice(0, increments.length).map((step, index) => ({
    ...step,
    value: base + increments[index],
  }));
}

/* Upgrade costs and values. A step's value is the new value after purchase. */
const CHAINS = [
  {
    id: 'still',
    label: 'The Still',
    // Seconds per production cycle; Batch Size sets bottles made by each cycle.
    base: TUNING.initialCycleSeconds,
    steps: decrementedSteps(TUNING.initialCycleSeconds, [
      { name: 'Better Fire', cost: 10 },
      { name: 'Copper Coil', cost: 25 },
      { name: 'Large Still', cost: 60 },
      { name: 'Double Still', cost: 150 },
      { name: 'Industrial Still', cost: 400 },
    ], TUNING.cycleStepDecrements),
  },
  {
    id: 'batch-size',
    label: 'Batch Size',
    base: TUNING.initialBatchSize,
    steps: scaledSteps(TUNING.initialBatchSize, [
      { name: 'Double Batch', cost: 20 },
      { name: 'Three-Bottle Batch', cost: 75 },
      { name: 'Four-Bottle Batch', cost: 200 },
      { name: 'Five-Bottle Batch', cost: 500 },
    ], TUNING.batchSizeStepPercentages, 'up'),
  },
  {
    id: 'order-size',
    label: 'Order Size',
    base: TUNING.initialCustomerOrderSize,
    steps: addedSteps(TUNING.initialCustomerOrderSize, [
      { name: 'First Customer Order', cost: 25 },
      { name: 'Two-Bottle Order', cost: 100 },
      { name: 'Three-Bottle Order', cost: 200 },
      { name: 'Four-Bottle Order', cost: 350 },
    ], TUNING.customerOrderSizeIncrements),
  },
  {
    id: 'buyers',
    label: 'Customers',
    // Customers top out at four bottles every 4s; hand sales reach one bottle
    // every 1s, for a combined peak of 2 bottles/s below the Still's 5.
    base: TUNING.initialCustomerOrderSeconds,
    steps: scaledSteps(TUNING.initialCustomerOrderSeconds, [
      { name: 'Regular Customers', cost: 20 },
      { name: 'Bar Connection', cost: 50 },
      { name: 'Delivery Wagon', cost: 120 },
      { name: 'Delivery Truck', cost: 350 },
    ], TUNING.customerIntervalStepPercentages, 'down'),
  },
  {
    id: 'mash',
    label: 'The Mash',
    // Doubled with the base price, because the money curve is the pace of the whole night:
    // at $2 a bottle and up, the shop is affordable inside ten minutes. Halving these halve
    // the pace.
    base: TUNING.initialBottleValue,
    steps: scaledSteps(TUNING.initialBottleValue, [
      { name: 'Better Mash', cost: 30 },
      { name: 'Quality Ingredients', cost: 100 },
      { name: 'Secret Recipe', cost: 300 },
      { name: 'Premium Moonshine', cost: 750 },
      { name: 'Black Label', cost: 1500 },
    ], TUNING.bottleValueStepPercentages, 'up'),
  },
  {
    id: 'shed',
    label: 'The Shed',
    base: TUNING.initialShedCapacity,
    steps: scaledSteps(TUNING.initialShedCapacity, [
      { name: 'Extra Crate', cost: 15 },
      { name: 'Storage Shed', cost: 50 },
      { name: 'Barn', cost: 175 },
      { name: 'Warehouse', cost: 500 },
    ], TUNING.shedCapacityStepPercentages, 'up'),
  },
  {
    id: 'runners',
    label: 'Runners',
    base: TUNING.initialHandSaleSeconds,
    steps: scaledSteps(TUNING.initialHandSaleSeconds, [
      { name: 'Quick Step', cost: 15 },
      { name: 'Night Route', cost: 45 },
      { name: 'Handcart', cost: 125 },
      { name: 'Fast Crew', cost: 300 },
    ], TUNING.handSaleStepPercentages, 'down'),
  },
  {
    id: 'casks',
    label: 'Aging Casks',
    base: TUNING.initialAgingMultiplier,
    steps: scaledSteps(TUNING.initialAgingMultiplier, [
      { name: 'Charred Oak', cost: 20 },
      { name: 'Cool Cellar', cost: 60 },
      { name: 'Deep Cellar', cost: 175 },
      { name: 'Hidden Stock', cost: 500 },
      { name: 'Master Cooper', cost: 1200 },
    ], TUNING.agingMultiplierStepPercentages, 'up'),
  },
];

const { tickMs: TICK_MS } = TUNING;

function money(amount) {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** What a chain is worth at a level: 0 is the plain base, n is n steps bought. */
function levelValue(chain, level) {
  return level <= 0 ? chain.base : chain.steps[level - 1].value;
}

/** Everything the still does, derived from the four levels. */
function statsFrom(levels) {
  const value = (id) => levelValue(CHAINS.find((chain) => chain.id === id), levels[id] || 0);
  const cycleSeconds = value('still');
  const batchSize = value('batch-size');
  const customerSeconds = value('buyers');
  const handSeconds = value('runners');
  const orderSize = value('order-size');
  return {
    cycleSeconds,
    cycleRate: 1 / cycleSeconds,
    batchSize,
    customerSeconds,
    customerRate: 1 / customerSeconds,
    worth: value('mash'), // dollars a bottle
    room: value('shed'), // bottles that can wait
    handSeconds,
    orderSize,
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
  if (chain.id === 'batch-size') return `${before.batchSize} → ${after.batchSize} bottles per batch`;
  if (chain.id === 'order-size') {
    return `${before.orderSize} → ${after.orderSize} per customer order · ${before.orderSize + 1} → ${after.orderSize + 1} by hand`;
  }
  if (chain.id === 'buyers') return `${before.customerSeconds} → ${after.customerSeconds} seconds per customer order`;
  if (chain.id === 'runners') return `${before.handSeconds} → ${after.handSeconds} seconds per hand sale`;
  if (chain.id === 'casks') {
    return `$${money(before.agedWorth)} → $${money(after.agedWorth)} when the shed is over ${TUNING.caskBonusFillPercent}% full`;
  }
  return `${before.cycleSeconds} → ${after.cycleSeconds} seconds per production cycle`;
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
    this.stillValue = cell('Seconds per cycle');
    this.buyersValue = cell('Seconds per customer order');
    this.mashValue = cell('A bottle');
    this.handValue = cell('Seconds per hand sale');

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
    clearTimeout(this.handCooldownTimer);
    this.handCooldownTimer = null;
    this.paint();
    this.ctx.message(`The night ends with ${this.ctx.run.score} ${plural(this.ctx.run.score, 'bottle')} made.`);
  },

  /** A fresh night: an empty shed, a plain still and an empty purse. */
  newNight() {
    clearTimeout(this.handCooldownTimer);
    this.handCooldownTimer = null;
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
    const optionalChains = CHAINS.filter((chain) => !['still', 'batch-size', 'order-size'].includes(chain.id));
    this.unavailable = new Set(shuffle(this.ctx.rng, optionalChains)
      .slice(0, TUNING.unavailableChainsPerNight).map((chain) => chain.id));
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
    this.brewAcc += stats.cycleRate * dt;
    let made = 0;
    while (this.brewAcc >= 1) {
      if (this.bottles >= stats.room) {
        this.brewAcc = 1; // one completed cycle waits for room in the shed
        break;
      }
      this.brewAcc -= 1;
      const produced = Math.min(stats.batchSize, stats.room - this.bottles);
      this.bottles += produced;
      made += produced;
      this.stock.push({ count: produced });
    }
    // A bottle scores the moment it is made, whether or not anybody ever buys it. Batched
    // into one call a tick, because every addPoints is a localStorage write in the shell.
    if (made > 0) this.ctx.addPoints(made);

    this.sellAcc += stats.customerRate * dt;
    let earned = 0;
    while (this.sellAcc >= 1 && this.bottles > 0) {
      this.sellAcc -= 1;
      earned += this.sellBatch(stats, stats.orderSize).earned;
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
    const sale = this.sellBatch(stats, 1 + stats.orderSize);
    const cooldown = stats.handSeconds * 1000;
    this.handReadyAt = performance.now() + cooldown;
    clearTimeout(this.handCooldownTimer);
    this.handCooldownTimer = setTimeout(() => {
      this.handCooldownTimer = null;
      this.paint();
    }, cooldown);
    this.cash += sale.earned;
    this.takings += sale.earned;
    this.ctx.message(`Sold ${sale.count} ${plural(sale.count, 'bottle')} by hand for $${money(sale.earned)}.`);
    this.paint();
  },

  sellBatch(stats, orderSize) {
    let count = 0;
    let earned = 0;
    while (count < orderSize && this.bottles > 0) {
      earned += this.takeBottle(stats);
      count += 1;
    }
    return { count, earned };
  },

  takeBottle(stats) {
    const batch = this.stock[0];
    if (!batch) return 0;
    const caskBonusActive = this.bottles / stats.room > TUNING.caskBonusFillPercent / 100;
    batch.count -= 1;
    this.bottles -= 1;
    this.sold += 1;
    if (batch.count === 0) this.stock.shift();
    return caskBonusActive ? stats.agedWorth : stats.worth;
  },

  paint() {
    if (!this.rows) return;
    const run = this.ctx.run;
    const stats = statsFrom(this.levels);

    this.stillValue.textContent = String(stats.cycleSeconds);
    this.buyersValue.textContent = String(stats.customerSeconds);
    this.mashValue.textContent = `$${money(stats.worth)}`;
    this.handValue.textContent = String(stats.handSeconds);
    this.cashValue.textContent = `$${money(this.cash)}`;
    this.shedLabel.textContent = `${this.bottles} / ${stats.room}`;
    this.shedFill.style.transform = `scaleX(${Math.min(1, this.bottles / stats.room)})`;
    this.clog.hidden = this.bottles < stats.room;
    this.ledger.textContent = `${this.sold} ${plural(this.sold, 'bottle')} sold · $${money(this.takings)} taken · $${money(this.spent)} spent`;

    const live = this.alive && run.state === 'running';
    // Keep empty-stock feedback clickable, but disable the hand-sale during its cooldown.
    this.ctx.setActionEnabled(live && performance.now() >= this.handReadyAt);
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
