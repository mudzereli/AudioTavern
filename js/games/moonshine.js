/* Moonshine: production scores bottles; selling funds upgrades.

   Seeded production, sales, and price routes vary each run.


*/

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
  tickMs: 200, caskBonusFillPercent: 75,
  initialCycleSeconds: 5, initialBatchSize: 1,
  initialCustomerOrderSeconds: 10, initialCustomerOrderSize: 0,
  initialHandSaleSeconds: 4, initialHandSaleSize: 1,
  initialBottleValue: 1, initialShedCapacity: 10, initialAgingMultiplier: 1,
  cycleStepPercentages: [80, 60, 40, 25, 12], batchSizeStepPercentages: [200, 400, 600, 800],
  customerOrderSizeIncrements: [1, 2, 3, 4], customerIntervalStepPercentages: [80, 60, 50, 40],
  bottleValueStepPercentages: [200, 300, 400, 600, 800], shedCapacityStepPercentages: [200, 350, 550, 750],
  handSaleStepPercentages: [83, 67, 50, 33], handSaleSizeIncrements: [1, 2, 3, 4],
  agingMultiplierStepPercentages: [200, 400, 600, 800, 1000],
};

function scaledSteps(base, steps, percentages, direction, precision = 0) {
  const values = [];
  let previous = base;
  for (const percentage of percentages) {
    const scaled = base * percentage / 100;
    const value = precision ? Number(scaled.toFixed(precision)) : Math.round(scaled);
    const improves = direction === 'up' ? value > previous : value > 0 && value < previous;
    if (!improves) continue;
    values.push(value);
    previous = value;
  }
  return steps.slice(0, values.length).map((step, index) => ({ ...step, value: values[index] }));
}

function addedSteps(base, steps, increments) {
  return steps.slice(0, increments.length).map((step, index) => ({
    ...step,
    value: base + increments[index],
  }));
}

/* Prices are tuned for a ten-minute run; a step's value is the new value after purchase. */
const CHAINS = [
  {
    id: 'still', label: 'The Still',
    // Seconds per production cycle; Batch Size sets bottles made by each cycle.
    base: TUNING.initialCycleSeconds,
    steps: scaledSteps(TUNING.initialCycleSeconds, [
      { name: 'Better Fire', cost: 2 },
      { name: 'Copper Coil', cost: 5 },
      { name: 'Large Still', cost: 12 },
      { name: 'Double Still', cost: 30 },
      { name: 'Industrial Still', cost: 400 },
    ], TUNING.cycleStepPercentages, 'down', 2),
  },
  {
    id: 'batch-size', label: 'Batch Size',
    base: TUNING.initialBatchSize,
    steps: scaledSteps(TUNING.initialBatchSize, [
      { name: 'Double Batch', cost: 4 },
      { name: 'Three-Bottle Batch', cost: 15 },
      { name: 'Four-Bottle Batch', cost: 40 },
      { name: 'Five-Bottle Batch', cost: 100 },
    ], TUNING.batchSizeStepPercentages, 'up'),
  },
  {
    id: 'order-size', label: 'Order Size',
    base: TUNING.initialCustomerOrderSize,
    steps: addedSteps(TUNING.initialCustomerOrderSize, [
      { name: 'First Customer Order', cost: 3 },
      { name: 'Two-Bottle Order', cost: 20 },
      { name: 'Three-Bottle Order', cost: 40 },
      { name: 'Four-Bottle Order', cost: 70 },
    ], TUNING.customerOrderSizeIncrements),
  },
  {
    id: 'buyers', label: 'Customers',
    // The automated route tops out at four bottles every 4s; manual upgrades are a separate build.
    base: TUNING.initialCustomerOrderSeconds,
    steps: scaledSteps(TUNING.initialCustomerOrderSeconds, [
      { name: 'Regular Customers', cost: 4 },
      { name: 'Bar Connection', cost: 10 },
      { name: 'Delivery Wagon', cost: 24 },
      { name: 'Delivery Truck', cost: 70 },
    ], TUNING.customerIntervalStepPercentages, 'down'),
  },
  {
    id: 'mash', label: 'The Mash',
    base: TUNING.initialBottleValue,
    steps: scaledSteps(TUNING.initialBottleValue, [
      { name: 'Better Mash', cost: 20 },
      { name: 'Quality Ingredients', cost: 40 },
      { name: 'Secret Recipe', cost: 60 },
      { name: 'Premium Moonshine', cost: 80 },
      { name: 'Black Label', cost: 100 },
    ], TUNING.bottleValueStepPercentages, 'up'),
  },
  {
    id: 'shed', label: 'The Shed',
    base: TUNING.initialShedCapacity,
    steps: scaledSteps(TUNING.initialShedCapacity, [
      { name: 'Extra Crate', cost: 2 },
      { name: 'Storage Shed', cost: 5 },
      { name: 'Barn', cost: 9 },
      { name: 'Warehouse', cost: 14 },
    ], TUNING.shedCapacityStepPercentages, 'up'),
  },
  {
    id: 'runners', label: 'Runners',
    base: TUNING.initialHandSaleSeconds,
    steps: scaledSteps(TUNING.initialHandSaleSeconds, [
      { name: 'Quick Step', cost: 3 },
      { name: 'Night Route', cost: 9 },
      { name: 'Handcart', cost: 25 },
      { name: 'Fast Crew', cost: 60 },
    ], TUNING.handSaleStepPercentages, 'down'),
  },
  {
    id: 'hand-load', label: 'Hand Load',
    base: TUNING.initialHandSaleSize,
    steps: addedSteps(TUNING.initialHandSaleSize, [
      { name: 'Double Hand Load', cost: 4 },
      { name: 'Three-Bottle Hand Load', cost: 15 },
      { name: 'Four-Bottle Hand Load', cost: 40 },
      { name: 'Five-Bottle Hand Load', cost: 100 },
    ], TUNING.handSaleSizeIncrements),
  },
  {
    id: 'casks', label: 'Aging Casks',
    base: TUNING.initialAgingMultiplier,
    steps: scaledSteps(TUNING.initialAgingMultiplier, [
      { name: 'Charred Oak', cost: 2 },
      { name: 'Cool Cellar', cost: 6 },
      { name: 'Deep Cellar', cost: 18 },
      { name: 'Hidden Stock', cost: 50 },
      { name: 'Master Cooper', cost: 120 },
    ], TUNING.agingMultiplierStepPercentages, 'up'),
  },
];

const SALES_ROUTES = [
  { id: 'hand-sales', chains: ['runners', 'hand-load'], label: 'faster, larger hand sales' },
  { id: 'customers', chains: ['buyers', 'order-size'], label: 'customer orders' },
];

const { tickMs: TICK_MS } = TUNING;

function money(amount) {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function levelValue(chain, level) {
  return level <= 0 ? chain.base : chain.steps[level - 1].value;
}

/** Everything the still does, derived from the upgrade levels. */
function statsFrom(levels) {
  const value = (id) => levelValue(CHAINS.find((chain) => chain.id === id), levels[id] || 0);
  const cycleSeconds = value('still');
  const batchSize = value('batch-size');
  const customerSeconds = value('buyers');
  const handSeconds = value('runners');
  const handSaleSize = value('hand-load');
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
    handSaleSize,
    orderSize,
    agedWorth: Math.round(value('mash') * value('casks')),
  };
}

function statsWith(levels, id, level) {
  return statsFrom({ ...levels, [id]: level });
}

function effectOf(chain, before, after) {
  if (chain.id === 'mash') return `$${money(before.worth)} → $${money(after.worth)} a bottle`;
  if (chain.id === 'shed') {
    if (after.agedWorth <= after.worth) return `${before.room} → ${after.room} bottles`;
    const bonusStart = (room) => Math.floor(room * TUNING.caskBonusFillPercent / 100) + 1;
    return `${before.room} → ${after.room} bottles · cask bonus starts at ${bonusStart(before.room)} → ${bonusStart(after.room)} bottles`;
  }
  if (chain.id === 'batch-size') {
    return `${before.batchSize} → ${after.batchSize} bottles per batch · ${after.batchSize} every ${after.cycleSeconds}s`;
  }
  if (chain.id === 'order-size') {
    return `${before.orderSize} → ${after.orderSize} ${plural(after.orderSize, 'bottle')} per order · every ${after.customerSeconds}s`;
  }
  if (chain.id === 'buyers') {
    return `${before.customerSeconds} → ${after.customerSeconds}s per order · ${after.orderSize} every ${after.customerSeconds}s`;
  }
  if (chain.id === 'runners') {
    return `${before.handSeconds} → ${after.handSeconds}s per press · ${after.handSaleSize} every ${after.handSeconds}s`;
  }
  if (chain.id === 'hand-load') {
    return `${before.handSaleSize} → ${after.handSaleSize} bottles per press · ${after.handSaleSize} every ${after.handSeconds}s`;
  }
  if (chain.id === 'casks') {
    return `$${money(before.agedWorth)} → $${money(after.agedWorth)} when the shed is over ${TUNING.caskBonusFillPercent}% full`;
  }
  return `${before.cycleSeconds} → ${after.cycleSeconds}s per cycle · ${after.batchSize} every ${after.cycleSeconds}s`;
}

const game = {
  id: 'moonshine',

  mount(ctx) {
    this.ctx = ctx;
    this.wrap = el('section', 'moonshine');
    this.wrap.setAttribute('role', 'group');
    this.wrap.setAttribute('aria-label', 'The backwoods still');

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

    const rates = el('div', 'moonshine__rates');
    const cell = (label) => {
      const box = el('div', 'moonshine__rate');
      const value = el('strong', 'moonshine__rate-value');
      box.append(el('span', 'moonshine__cap', label), value);
      rates.append(box);
      return value;
    };
    this.stillValue = cell('Brew / cycle');
    this.buyersValue = cell('Order / visit');
    this.mashValue = cell('Bottle value');
    this.handValue = cell('Hand sale');

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
    const production = this.routes.production === 'still' ? 'faster cycles' : 'larger batches';
    const price = this.routes.price === 'mash' ? 'higher bottle prices' : 'cask aging';
    ctx.message(`Tonight's paths: ${production}, ${this.routes.sales}, ${price}.`);
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
    const production = shuffle(this.ctx.rng, ['still', 'batch-size'])[0];
    const sales = shuffle(this.ctx.rng, SALES_ROUTES.slice())[0];
    const price = shuffle(this.ctx.rng, ['mash', 'casks'])[0];
    const available = new Set(['shed', production, price, ...sales.chains]);
    this.routes = { production, sales: sales.label, price };
    this.unavailable = new Set(CHAINS.filter((chain) => !available.has(chain.id)).map((chain) => chain.id));
  },

  tick() {
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    // Nothing accrues off the clock: a finished night or an idle board stays where it is.
    if (!this.alive || this.ctx.run.state !== 'running') return;

    const stats = statsFrom(this.levels);
    // Wall-clock elapsed time covers background throttling; a full shed still stalls production.
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
    // Score on production and batch writes so each tick hits localStorage once.
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

  buy(chain) {
    if (!this.alive || this.ctx.run.state !== 'running') return;
    if (this.unavailable.has(chain.id)) return;
    const level = this.levels[chain.id];
    const step = chain.steps[level];
    if (!step || this.cash < step.cost) return;
    if (chain.id === 'buyers' && this.levels['order-size'] === 0) {
      this.ctx.message('Unlock the first customer order before improving customer visits.');
      return;
    }
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
    const sale = this.sellBatch(stats, stats.handSaleSize);
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

    this.stillValue.textContent = `${stats.batchSize}/${stats.cycleSeconds}s`;
    this.buyersValue.textContent = `${stats.orderSize}/${stats.customerSeconds}s`;
    this.mashValue.textContent = `$${money(stats.worth)}`;
    this.handValue.textContent = `${stats.handSaleSize}/${stats.handSeconds}s`;
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
        button.hidden = true;
        button.classList.remove('moonshine__step--ready');
        button.disabled = true;
        continue;
      }
      button.hidden = false;
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
      const needsOrderUnlock = chain.id === 'buyers' && this.levels['order-size'] === 0;
      if (needsOrderUnlock) effectEl.textContent = 'Unlock the first customer order to improve visits.';
      button.disabled = !live || this.cash < step.cost || needsOrderUnlock;
      button.classList.toggle('moonshine__step--ready', live && this.cash >= step.cost);
    }
  },
};

export default game;
