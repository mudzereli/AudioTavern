import { el, svgEl } from '../dom.js';
import { pick } from '../rng.js';

const CAST_MS = 4000;
const CAST_END_BUFFER_MS = 500;
const SET_CELEBRATION_MS = 4000;
const CONDITION_MS = 60_000;
const COMMON_CHANCE = 0.4;
const UNCOMMON_CHANCE = 0.2;
const IN_SEASON_RARE_CHANCE = 0.18;
const MATCHING_OFF_SEASON_RARE_CHANCE = 0.1;
const MISMATCHED_OFF_SEASON_RARE_CHANCE = 0.02;
const FISH_PER_SPOT = 4;
const SET_BONUS = 100;
const CONDITIONS = [
  { id: 'day-clear', time: 'Day', weather: 'Clear' },
  { id: 'day-rain', time: 'Day', weather: 'Rain' },
  { id: 'night-rain', time: 'Night', weather: 'Rain' },
  { id: 'night-clear', time: 'Night', weather: 'Clear' },
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
const SET_SIZE = SPOTS.length * FISH_PER_SPOT;
const ALL_FISH = SPOTS.flatMap((spot) => [
  spot.fish.common,
  spot.fish.uncommon,
  ...CONDITIONS.map((condition) => spot.fish.rare[condition.id]),
]);

function activeCondition(run) {
  const elapsed = Math.max(0, run.durationMs - run.remainingMs);
  return CONDITIONS[Math.floor(elapsed / CONDITION_MS) % CONDITIONS.length];
}

function fishForSpot(spot) {
  return [
    spot.fish.common,
    spot.fish.uncommon,
    ...CONDITIONS.map((condition) => ({ ...spot.fish.rare[condition.id], condition: condition.id })),
  ];
}

function strayRareWeights(condition) {
  return CONDITIONS
    .filter((item) => item.id !== condition.id)
    .map((item) => ({
      id: item.id,
      weight: item.time === condition.time || item.weather === condition.weather
        ? MATCHING_OFF_SEASON_RARE_CHANCE
        : MISMATCHED_OFF_SEASON_RARE_CHANCE,
    }));
}

function strayRareChance(species, condition) {
  const weights = strayRareWeights(condition);
  return weights.find((item) => item.id === species.condition)?.weight || 0;
}

function pickStrayRare(rng, spot, condition) {
  const weights = strayRareWeights(condition);
  const totalWeight = weights.reduce((total, item) => total + item.weight, 0);
  let roll = rng() * totalWeight;
  for (const item of weights) {
    roll -= item.weight;
    if (roll < 0) return spot.fish.rare[item.id];
  }
  return spot.fish.rare[weights[weights.length - 1].id];
}

function catchFish(rng, spot, condition, available) {
  const roll = rng();
  if (roll < COMMON_CHANCE) {
    const fish = spot.fish.common;
    return available.has(fish.id) ? fish : null;
  }
  if (roll < COMMON_CHANCE + UNCOMMON_CHANCE) {
    const fish = spot.fish.uncommon;
    return available.has(fish.id) ? fish : null;
  }
  if (roll < COMMON_CHANCE + UNCOMMON_CHANCE + IN_SEASON_RARE_CHANCE) {
    const fish = spot.fish.rare[condition.id];
    return available.has(fish.id) ? fish : null;
  }
  const fish = pickStrayRare(rng, spot, condition);
  return available.has(fish.id) ? fish : null;
}

function catchChance(species, condition) {
  if (species.rarity === 'Rare' && species.condition !== condition.id) {
    return strayRareChance(species, condition);
  }
  if (species.rarity === 'Rare') return IN_SEASON_RARE_CHANCE;
  return species.rarity === 'Common' ? COMMON_CHANCE : UNCOMMON_CHANCE;
}

// Wording for the aria-label only; the visible rows show a bare percentage.
function catchChanceLabel(species, condition) {
  const chance = formatPercent(catchChance(species, condition));
  if (species.rarity === 'Rare' && species.condition !== condition.id) {
    const match = strayRareWeights(condition).find((item) => item.id === species.condition)?.weight
      === MATCHING_OFF_SEASON_RARE_CHANCE;
    return `Rare · ${chance} ${match ? 'match' : 'off-season'}`;
  }
  return `${species.rarity} · ${chance}`;
}

function noBiteChance(spot, condition, available) {
  const normalFish = [spot.fish.common, spot.fish.uncommon, spot.fish.rare[condition.id]];
  const normalOdds = [COMMON_CHANCE, UNCOMMON_CHANCE, IN_SEASON_RARE_CHANCE];
  const normalMiss = normalFish.reduce((miss, fish, index) => (
    miss + (available.has(fish.id) ? 0 : normalOdds[index])
  ), 0);
  const weights = strayRareWeights(condition);
  const strayMiss = weights.reduce((miss, item) => (
    miss + (available.has(spot.fish.rare[item.id].id) ? 0 : item.weight)
  ), 0);
  return normalMiss + strayMiss;
}

function formatPercent(probability) {
  return `${(probability * 100).toFixed(1).replace(/\.0$/, '')}%`;
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
    this.condition = el('div', 'fishing__condition');
    this.condition.append(this.conditionLabel);

    const tallies = el('div', 'fishing__tallies');
    this.status = el('p', 'fishing__status');
    const book = el('div', 'fishing__book');
    this.bookStatus = el('p', 'fishing__book-count', 'Set 1 · 0 / 12');
    this.bookProgress = el('div', 'fishing__book-progress');
    this.bookProgress.setAttribute('role', 'progressbar');
    this.bookProgress.setAttribute('aria-label', 'Current collection set');
    this.bookProgress.setAttribute('aria-valuemin', '0');
    this.bookProgress.setAttribute('aria-valuemax', String(SET_SIZE));
    this.bookSlots = Array.from({ length: SET_SIZE }, () => {
      const slot = el('i', 'fishing__book-mark');
      this.bookProgress.append(slot);
      return slot;
    });
    book.append(this.bookStatus, this.bookProgress);
    tallies.append(this.status, book);
    header.append(this.condition, tallies);

    this.float = el('div', 'fishing__float');
    this.float.setAttribute('role', 'status');
    this.floatLabel = el('span', 'fishing__float-label', 'Choose a spot');
    this.ripple = el('span', 'fishing__ripple');
    this.ripple.setAttribute('aria-hidden', 'true');
    this.float.append(this.floatLabel, this.ripple);
    this.setWin = el('div', 'fishing__set-win');
    this.setWin.setAttribute('role', 'status');
    this.setWinTitle = el('strong', 'fishing__set-win-title');
    this.setWinPoints = el('span', 'fishing__set-win-points');
    this.setWin.append(this.setWinTitle, this.setWinPoints);
    this.setWin.hidden = true;
    this.spots = el('div', 'fishing__spots');
    this.spots.setAttribute('role', 'group');
    this.spots.setAttribute('aria-label', 'Fishing spots and catchbook entries');
    this.spotViews = [];
    this.spotButtons = SPOTS.map((spot) => {
      const button = el('button', 'fishing__spot');
      button.type = 'button';
      button.classList.add(`fishing__spot--${spot.id}`);
      const heading = el('span', 'fishing__spot-heading');
      const name = el('span', 'fishing__spot-name', spot.name);
      // Which fish are still missing is already legible from the rows below: a row is a
      // caught fish or a live one, so a second "2 / 4" above it says nothing new.
      heading.append(name);
      button.append(heading, el('span', 'fishing__clue', spot.clue));
      const pool = el('span', 'fishing__pool');
      const entries = fishForSpot(spot).map((species) => {
        const entry = el('span', 'fishing__species');
        const art = svgEl('svg', { viewBox: '0 0 64 40', 'aria-hidden': 'true', focusable: 'false' });
        art.classList.add('fishing__fish-art');
        art.append(svgEl('use', { href: `../assets/img/fishing-village-fish.svg#fish-${species.id}` }));
        const details = el('span', 'fishing__species-details');
        const name = el('span', 'fishing__fish-name', species.name);
        const odds = el('span', 'fishing__species-odds');
        // The landed mark is drawn by CSS: this element is the slot, not a readout.
        const landed = el('span', 'fishing__species-count');
        details.append(name, odds);
        entry.append(art, details, landed);
        pool.append(entry);
        return { species, entry, name, odds };
      });
      button.append(pool);
      button.addEventListener('click', () => this.cast(spot));
      this.spots.append(button);
      this.spotViews.push({ spot, button, entries });
      return button;
    });
    this.wrap.append(header, this.setWin, this.float, this.spots);
    ctx.stage.append(this.wrap);
    this.visibilityHandler = () => this.handleVisibility();
  },

  start(ctx) {
    this.ctx = ctx;
    clearTimeout(this.castTimer);
    clearTimeout(this.conditionTimer);
    clearTimeout(this.setCompleteTimer);
    this.setCompleteTimer = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.alive = true;
    this.phase = 'ready';
    this.casts = 0;
    this.bites = 0;
    this.rareCatches = 0;
    this.fishCounts = new Map(ALL_FISH.map((fish) => [fish.id, 0]));
    this.setNumber = 0;
    this.newSet();
    this.setCompleteRemaining = SET_CELEBRATION_MS;
    this.setWin.hidden = true;
    this.lastCaughtId = null;
    this.currentSpot = null;
    this.floatLabel.textContent = 'Choose a spot';
    this.float.className = 'fishing__float';
    this.paint();
    this.scheduleConditionUpdate();
  },

  stop() {
    this.alive = false;
    this.phase = 'stopped';
    clearTimeout(this.castTimer);
    clearTimeout(this.conditionTimer);
    clearTimeout(this.setCompleteTimer);
    this.castTimer = null;
    this.conditionTimer = null;
    this.setCompleteTimer = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.setWin.hidden = true;
    this.floatLabel.textContent = 'The line comes in as the day ends.';
    this.float.classList.remove('fishing__float--casting');
    this.paint();
  },

  newSet() {
    this.setNumber += 1;
    this.setFound = new Set();
    this.pools = new Map();
    for (const spot of SPOTS) {
      const remaining = fishForSpot(spot);
      const available = new Set();
      for (let count = 0; count < FISH_PER_SPOT; count += 1) {
        const fish = pick(this.ctx.rng, remaining);
        available.add(fish.id);
        remaining.splice(remaining.indexOf(fish), 1);
      }
      this.pools.set(spot.id, available);
    }
    this.activeSpecies = SPOTS.flatMap((spot) => (
      fishForSpot(spot).filter((fish) => this.pools.get(spot.id).has(fish.id))
    ));
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
    this.floatLabel.textContent = 'Line out. The float drifts...';
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

  beginSetCelebration() {
    if (!this.alive || this.phase !== 'set-complete' || document.hidden || this.ctx.run.state !== 'running') return;
    this.setCompleteStartedAt = performance.now();
    this.setCompleteTimer = setTimeout(() => {
      this.setCompleteTimer = null;
      if (!this.alive || this.phase !== 'set-complete') return;
      if (document.hidden || this.ctx.run.state !== 'running') return;
      this.phase = 'ready';
      this.setWin.hidden = true;
      this.lastCaughtId = null;
      this.newSet();
      this.floatLabel.textContent = `Set ${this.setNumber} · Choose a spot`;
      this.float.className = 'fishing__float';
      this.paint();
      this.scheduleConditionUpdate();
    }, this.setCompleteRemaining);
  },

  handleVisibility() {
    if (document.hidden) {
      if (this.phase === 'casting' && this.castTimer !== null) {
        this.castRemaining = Math.max(0, this.castRemaining - (performance.now() - this.castStartedAt));
        clearTimeout(this.castTimer);
        this.castTimer = null;
      }
      if (this.phase === 'set-complete' && this.setCompleteTimer !== null) {
        this.setCompleteRemaining = Math.max(0, this.setCompleteRemaining - (performance.now() - this.setCompleteStartedAt));
        clearTimeout(this.setCompleteTimer);
        this.setCompleteTimer = null;
      }
      clearTimeout(this.conditionTimer);
      this.conditionTimer = null;
      this.paint();
      return;
    }
    setTimeout(() => {
      if (!this.alive) return;
      if (this.phase === 'casting' && this.castTimer === null && this.ctx.run.state === 'running') this.beginCastWait();
      if (this.phase === 'set-complete' && this.setCompleteTimer === null) this.beginSetCelebration();
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
    const spot = this.currentSpot;
    const condition = activeCondition(this.ctx.run);
    const fish = catchFish(this.ctx.rng, spot, condition, this.pools.get(spot.id));
    this.phase = 'ready';
    this.casts += 1;
    this.currentSpot = null;
    if (!fish) {
      this.floatLabel.textContent = 'No bite this time.';
      this.float.className = 'fishing__float fishing__float--miss';
      this.ctx.message(this.floatLabel.textContent);
      this.paint();
      this.scheduleConditionUpdate();
      return;
    }
    const firstCatch = this.fishCounts.get(fish.id) === 0;
    const points = fish.value * (firstCatch ? 10 : 1);
    const rare = fish.rarity === 'Rare';
    this.bites += 1;
    this.fishCounts.set(fish.id, this.fishCounts.get(fish.id) + 1);
    this.setFound.add(fish.id);
    if (rare) this.rareCatches += 1;
    this.ctx.addPoints(points);
    const discovery = firstCatch ? ' · New this run' : ' · Repeat';
    let result = `${rare ? 'Rare: ' : ''}${fish.name} +${points}${discovery}`;
    if (this.setFound.size === SET_SIZE) {
      this.ctx.addPoints(SET_BONUS);
      result += ` · Collection set complete +${SET_BONUS} bonus`;
      this.phase = 'set-complete';
      this.setCompleteRemaining = SET_CELEBRATION_MS;
      this.setWinTitle.textContent = `Set ${this.setNumber} complete`;
      this.setWinPoints.textContent = `${SET_SIZE} fish collected · +${SET_BONUS} points`;
      this.setWin.hidden = false;
      this.beginSetCelebration();
    }
    this.floatLabel.textContent = result;
    this.float.className = 'fishing__float fishing__float--caught';
    if (rare) this.float.classList.add('fishing__float--rare');
    if (firstCatch) this.float.classList.add('fishing__float--discovery');
    if (this.phase === 'set-complete') this.float.classList.add('fishing__float--complete');
    this.ctx.message(result);
    this.lastCaughtId = fish.id;
    this.paint();
    this.scheduleConditionUpdate();
  },

  paint() {
    if (!this.spotButtons) return;
    this.status.textContent = `${this.bites} landed · ${this.rareCatches} rare`;
    this.bookStatus.textContent = `Set ${this.setNumber} · ${this.setFound.size} / ${SET_SIZE}`;
    this.bookProgress.setAttribute('aria-valuenow', String(this.setFound.size));
    this.bookSlots.forEach((slot, index) => (
      slot.classList.toggle('fishing__book-mark--found', this.setFound.has(this.activeSpecies[index].id))
    ));
    const condition = activeCondition(this.ctx.run);
    this.conditionLabel.textContent = `${condition.time} · ${condition.weather}`;
    this.condition.className = `fishing__condition fishing__condition--${condition.id}`;
    const canCast = this.alive && this.phase === 'ready'
      && this.ctx.run.state === 'running'
      && this.ctx.run.remainingMs > CAST_MS + CAST_END_BUFFER_MS;
    this.spots.classList.toggle('fishing__spots--casting', this.phase === 'casting');
    for (const { spot, button, entries } of this.spotViews) {
      const available = this.pools.get(spot.id);
      const noBite = `No bite ${formatPercent(noBiteChance(spot, condition, available))}`;
      const castingHere = this.phase === 'casting' && spot === this.currentSpot;
      button.classList.toggle('fishing__spot--casting', castingHere);
      button.disabled = !canCast;
      const readableFish = [];
      let foundHere = 0;
      for (const { species, entry, name, odds } of entries) {
        const isAvailable = available.has(species.id);
        const caught = this.setFound.has(species.id);
        const runCount = this.fishCounts.get(species.id) || 0;
        entry.hidden = !isAvailable;
        entry.classList.toggle('fishing__species--caught', caught);
        entry.classList.toggle('fishing__species--last-catch', isAvailable && species.id === this.lastCaughtId);
        // The run tally only ever decides whether the x10 first-catch bonus is still
        // there, so the slot shows a mark rather than a digit. The counts themselves are
        // in the spot's aria-label below.
        entry.classList.toggle('fishing__species--landed', runCount > 0);
        name.textContent = isAvailable ? species.name : '';
        // The percentage is the whole row. Rarity and the off-season note were two more
        // tokens doing the same job, and the odds already rank themselves (40 / 20 / 18 /
        // 10 / 2), so the wording lives on in the aria-label below.
        odds.textContent = isAvailable ? formatPercent(catchChance(species, condition)) : '';
        if (isAvailable) {
          if (caught) foundHere += 1;
          readableFish.push(`${species.rarity} ${species.name}, ${caught ? 'collected this set' : 'not yet collected'}, ${runCount} caught this run, ${catchChanceLabel(species, condition)} chance`);
        }
      }
      button.setAttribute('aria-label', `${spot.name}. ${spot.clue} ${noBite}. ${foundHere} of ${FISH_PER_SPOT} caught here. ${readableFish.join('; ')}. Cast here.`);
    }
  },
};

export default game;
