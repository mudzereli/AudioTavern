import { el } from '../dom.js';
import { pick } from '../rng.js';

const CAST_MS = 4000;
const CAST_END_BUFFER_MS = 500;
const CONDITION_MS = 60_000;
const STRAY_CATCH_CHANCE = 0.02;
const CONDITIONS = [
  { id: 'day-clear', time: 'Day', weather: 'Clear', odds: [0.55, 0.3, 0.15] },
  { id: 'day-rain', time: 'Day', weather: 'Rain', odds: [0.5, 0.3, 0.2] },
  { id: 'night-rain', time: 'Night', weather: 'Rain', odds: [0.4, 0.3, 0.3] },
  { id: 'night-clear', time: 'Night', weather: 'Clear', odds: [0.5, 0.3, 0.2] },
];
const SPOTS = [
  {
    id: 'pier',
    name: 'Village Pier',
    clue: 'Silver flashes gather around the pilings.',
    fish: {
      common: { id: 'herring', name: 'Herring', rarity: 'Common', value: 1 },
      uncommon: { id: 'mackerel', name: 'Mackerel', rarity: 'Uncommon', value: 2 },
      rare: {
        'day-clear': { id: 'sea-bass', name: 'Sea Bass', rarity: 'Rare', value: 3 },
        'day-rain': { id: 'cod', name: 'Cod', rarity: 'Rare', value: 3 },
        'night-rain': { id: 'bluefish', name: 'Bluefish', rarity: 'Rare', value: 3 },
        'night-clear': { id: 'eel', name: 'Eel', rarity: 'Rare', value: 3 },
      },
    },
  },
  {
    id: 'reeds',
    name: 'Reedbank',
    clue: 'Small ripples stir between the reeds.',
    fish: {
      common: { id: 'roach', name: 'Roach', rarity: 'Common', value: 1 },
      uncommon: { id: 'perch', name: 'Perch', rarity: 'Uncommon', value: 2 },
      rare: {
        'day-clear': { id: 'pike', name: 'Pike', rarity: 'Rare', value: 3 },
        'day-rain': { id: 'tench', name: 'Tench', rarity: 'Rare', value: 3 },
        'night-rain': { id: 'burbot', name: 'Burbot', rarity: 'Rare', value: 3 },
        'night-clear': { id: 'walleye', name: 'Walleye', rarity: 'Rare', value: 3 },
      },
    },
  },
  {
    id: 'breakwater',
    name: 'Breakwater',
    clue: 'Gulls wheel above the deeper water.',
    fish: {
      common: { id: 'goby', name: 'Goby', rarity: 'Common', value: 1 },
      uncommon: { id: 'flounder', name: 'Flounder', rarity: 'Uncommon', value: 2 },
      rare: {
        'day-clear': { id: 'sea-trout', name: 'Sea Trout', rarity: 'Rare', value: 3 },
        'day-rain': { id: 'haddock', name: 'Haddock', rarity: 'Rare', value: 3 },
        'night-rain': { id: 'conger', name: 'Conger Eel', rarity: 'Rare', value: 3 },
        'night-clear': { id: 'pollock', name: 'Pollock', rarity: 'Rare', value: 3 },
      },
    },
  },
];
const ALL_FISH = SPOTS.flatMap((spot) => [
  spot.fish.common,
  spot.fish.uncommon,
  ...CONDITIONS.map((condition) => spot.fish.rare[condition.id]),
]);

function activeCondition(run) {
  const elapsed = Math.max(0, run.durationMs - run.remainingMs);
  return CONDITIONS[Math.floor(elapsed / CONDITION_MS) % CONDITIONS.length];
}

function catchFish(rng, spot, condition) {
  const [commonOdds, uncommonOdds] = condition.odds;
  const roll = rng();
  if (roll < STRAY_CATCH_CHANCE) {
    const strayFish = CONDITIONS
      .filter((item) => item.id !== condition.id)
      .map((item) => spot.fish.rare[item.id]);
    return pick(rng, strayFish);
  }
  const catchRoll = (roll - STRAY_CATCH_CHANCE) / (1 - STRAY_CATCH_CHANCE);
  if (catchRoll < commonOdds) return spot.fish.common;
  if (catchRoll < commonOdds + uncommonOdds) return spot.fish.uncommon;
  return spot.fish.rare[condition.id];
}

const game = {
  id: 'fishing-village',

  mount(ctx) {
    this.ctx = ctx;
    this.wrap = el('section', 'fishing');
    this.wrap.setAttribute('role', 'group');
    this.wrap.setAttribute('aria-label', 'Fishing Village shoreline');

    const header = el('div', 'fishing__header');
    this.conditionLabel = el('strong', 'fishing__condition-label');
    this.conditionOdds = el('span', 'fishing__condition-odds');
    this.condition = el('div', 'fishing__condition');
    this.condition.append(this.conditionLabel, this.conditionOdds);

    const tallies = el('div', 'fishing__tallies');
    this.status = el('p', 'fishing__status');
    this.rareStatus = el('p', 'fishing__rare-count', 'Rare: 0');
    const book = el('div', 'fishing__book');
    this.bookStatus = el('p', 'fishing__book-count', '0 / 18 found');
    this.bookProgress = el('div', 'fishing__book-progress');
    this.bookProgress.setAttribute('role', 'progressbar');
    this.bookProgress.setAttribute('aria-label', 'Catchbook species found');
    this.bookProgress.setAttribute('aria-valuemin', '0');
    this.bookProgress.setAttribute('aria-valuemax', String(ALL_FISH.length));
    this.bookSlots = Array.from({ length: ALL_FISH.length }, () => {
      const slot = el('i', 'fishing__book-mark');
      this.bookProgress.append(slot);
      return slot;
    });
    book.append(this.bookStatus, this.bookProgress);
    tallies.append(this.status, this.rareStatus, book);
    header.append(this.condition, tallies);

    this.float = el('p', 'fishing__float', 'Choose a spot');
    this.float.setAttribute('role', 'status');
    this.spots = el('div', 'fishing__spots');
    this.spots.setAttribute('role', 'group');
    this.spots.setAttribute('aria-label', 'Fishing spots and catchbook entries');
    this.spotViews = [];
    this.spotButtons = SPOTS.map((spot) => {
      const button = el('button', 'fishing__spot');
      button.type = 'button';
      button.classList.add(`fishing__spot--${spot.id}`);
      button.append(
        el('span', 'fishing__spot-name', spot.name),
        el('span', 'fishing__clue', spot.clue),
      );
      const pool = el('span', 'fishing__pool');
      const fish = [spot.fish.common, spot.fish.uncommon, ...CONDITIONS.map((item) => ({ ...spot.fish.rare[item.id], condition: item.id }))];
      const entries = fish.map((species) => {
        const entry = el('span', 'fishing__species');
        const slot = el('span', 'fishing__slot');
        slot.setAttribute('aria-hidden', 'true');
        const details = el('span', 'fishing__species-details');
        const name = el('span', 'fishing__fish-name', species.name);
        const odds = el('span', 'fishing__species-odds');
        const count = el('span', 'fishing__species-count', '0');
        details.append(name, odds);
        entry.append(slot, details, count);
        pool.append(entry);
        return { species, entry, slot, odds, count };
      });
      button.append(pool);
      button.addEventListener('click', () => this.cast(spot));
      this.spots.append(button);
      this.spotViews.push({ spot, button, entries });
      return button;
    });
    this.wrap.append(header, this.float, this.spots);
    ctx.stage.append(this.wrap);
    this.visibilityHandler = () => this.handleVisibility();
  },

  start(ctx) {
    this.ctx = ctx;
    clearTimeout(this.castTimer);
    clearTimeout(this.conditionTimer);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.alive = true;
    this.phase = 'ready';
    this.casts = 0;
    this.rareCatches = 0;
    this.fishCounts = new Map(ALL_FISH.map((fish) => [fish.id, 0]));
    this.found = 0;
    this.lastCaughtId = null;
    this.currentSpot = null;
    this.float.textContent = 'Choose a spot';
    this.float.className = 'fishing__float';
    this.paint();
    this.scheduleConditionUpdate();
  },

  stop() {
    this.alive = false;
    this.phase = 'stopped';
    clearTimeout(this.castTimer);
    clearTimeout(this.conditionTimer);
    this.castTimer = null;
    this.conditionTimer = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.float.textContent = 'The line comes in as the day ends.';
    this.float.classList.remove('fishing__float--casting');
    this.paint();
  },

  scheduleConditionUpdate() {
    clearTimeout(this.conditionTimer);
    if (!this.alive || document.hidden || this.ctx.run.state !== 'running') return;
    const { durationMs, remainingMs } = this.ctx.run;
    const elapsed = durationMs - remainingMs;
    const untilCondition = CONDITION_MS - (elapsed % CONDITION_MS);
    const untilCastCutoff = remainingMs - CAST_MS - CAST_END_BUFFER_MS;
    const delay = untilCastCutoff > 0 ? Math.min(untilCondition, untilCastCutoff) : untilCondition;
    this.conditionTimer = setTimeout(() => {
      this.conditionTimer = null;
      this.paint();
      this.scheduleConditionUpdate();
    }, Math.max(50, delay));
  },

  cast(spot) {
    if (!this.alive || this.phase !== 'ready' || this.ctx.run.state !== 'running') return;
    if (this.ctx.run.remainingMs <= CAST_MS + CAST_END_BUFFER_MS) return;
    this.phase = 'casting';
    this.currentSpot = spot;
    this.castRemaining = CAST_MS;
    this.float.className = 'fishing__float fishing__float--casting';
    this.float.textContent = 'Casting...';
    this.ctx.message('Line out.');
    this.paint();
    this.beginCastWait();
  },

  beginCastWait() {
    this.castStartedAt = performance.now();
    this.castTimer = setTimeout(() => {
      this.castTimer = null;
      this.finishCast();
    }, this.castRemaining);
  },

  handleVisibility() {
    if (document.hidden) {
      if (this.phase === 'casting' && this.castTimer !== null) {
        this.castRemaining = Math.max(0, this.castRemaining - (performance.now() - this.castStartedAt));
        clearTimeout(this.castTimer);
        this.castTimer = null;
      }
      clearTimeout(this.conditionTimer);
      this.conditionTimer = null;
      this.paint();
      return;
    }
    setTimeout(() => {
      if (!this.alive) return;
      if (this.phase === 'casting' && this.castTimer === null && this.ctx.run.state === 'running') this.beginCastWait();
      this.paint();
      this.scheduleConditionUpdate();
    }, 0);
  },

  finishCast() {
    if (!this.alive || this.phase !== 'casting') return;
    if (document.hidden || this.ctx.run.state !== 'running') {
      this.castRemaining = 0;
      return;
    }
    const fish = catchFish(this.ctx.rng, this.currentSpot, activeCondition(this.ctx.run));
    const firstCatch = this.fishCounts.get(fish.id) === 0;
    const points = fish.value * (firstCatch ? 10 : 1);
    const rare = fish.rarity === 'Rare';
    this.phase = 'ready';
    this.casts += 1;
    this.fishCounts.set(fish.id, this.fishCounts.get(fish.id) + 1);
    if (firstCatch) this.found += 1;
    if (rare) this.rareCatches += 1;
    this.ctx.addPoints(points);
    this.float.textContent = `${rare ? 'Rare: ' : ''}${fish.name} +${points}${firstCatch ? ' · New' : ''}`;
    this.float.className = 'fishing__float fishing__float--caught';
    if (rare) this.float.classList.add('fishing__float--rare');
    if (firstCatch) this.float.classList.add('fishing__float--discovery');
    this.ctx.message(this.float.textContent);
    this.lastCaughtId = fish.id;
    this.currentSpot = null;
    this.paint();
    this.scheduleConditionUpdate();
  },

  paint() {
    if (!this.spotButtons) return;
    this.status.textContent = `Fish caught: ${this.casts}`;
    this.rareStatus.textContent = `Rare: ${this.rareCatches}`;
    this.bookStatus.textContent = `${this.found} / ${ALL_FISH.length} found`;
    this.bookProgress.setAttribute('aria-valuenow', String(this.found));
    this.bookSlots.forEach((slot, index) => slot.classList.toggle('fishing__book-mark--found', index < this.found));
    const condition = activeCondition(this.ctx.run);
    this.conditionLabel.textContent = `${condition.time} · ${condition.weather}`;
    this.condition.className = `fishing__condition fishing__condition--${condition.id}`;
    this.conditionOdds.textContent = `${condition.odds.map((odds) => Math.round(odds * 100)).join('/')}% mix · ${Math.round(STRAY_CATCH_CHANCE * 100)}% stray`;
    const canCast = this.alive && this.phase === 'ready'
      && this.ctx.run.state === 'running'
      && this.ctx.run.remainingMs > CAST_MS + CAST_END_BUFFER_MS;
    this.spots.classList.toggle('fishing__spots--casting', this.phase === 'casting');
    for (const { spot, button, entries } of this.spotViews) {
      const castingHere = this.phase === 'casting' && spot === this.currentSpot;
      button.classList.toggle('fishing__spot--casting', castingHere);
      button.disabled = !canCast;
      const readableFish = [];
      for (const { species, entry, slot, odds, count } of entries) {
        const caught = this.fishCounts.get(species.id) || 0;
        const available = species.rarity !== 'Rare' || species.condition === condition.id;
        const rarityIndex = species.rarity === 'Common' ? 0 : species.rarity === 'Uncommon' ? 1 : 2;
        entry.classList.toggle('fishing__species--caught', caught > 0);
        entry.classList.toggle('fishing__species--last-catch', species.id === this.lastCaughtId);
        entry.classList.toggle('fishing__species--inactive', !available);
        entry.classList.toggle('fishing__species--active-rare', species.rarity === 'Rare' && available);
        slot.textContent = '';
        count.textContent = String(caught);
        odds.textContent = available
          ? `${species.rarity} · ${Math.round(condition.odds[rarityIndex] * 100)}%`
          : `Rare · ${CONDITIONS.find((item) => item.id === species.condition).time} ${CONDITIONS.find((item) => item.id === species.condition).weather}`;
        readableFish.push(`${species.rarity} ${species.name}, ${caught} caught, ${available ? `${Math.round(condition.odds[rarityIndex] * 100)} percent chance` : `available during ${species.condition.replace('-', ' ')}`}`);
      }
      button.setAttribute('aria-label', `${spot.name}. ${spot.clue} Cast here. Catchbook: ${readableFish.join('; ')}.`);
    }
  },
};

export default game;
