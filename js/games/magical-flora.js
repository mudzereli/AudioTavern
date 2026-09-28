/* Magical Flora: complete distinct-kind lines across the 7x7 grove. */

import { el, plural } from '../dom.js';
import { pick, randInt, shuffle } from '../rng.js';

const COLS = 7;
const ROWS = 7;

const HAND_BASE = 14;
const HAND_STEP = 2;
const HAND_MAX = 24;

const WILDS = 1;

const PLANT_BASE = 1;
const SAME_POINT = 1;
const CROSS_POINT = 3;

const EDGE_BONUS = 2;

const BLOOM_BASE = 12;
const BLOOM_STEP = 4;

const HARVEST_BASE = 40;
const HARVEST_STEP = 20;

const STARTING_BLOOMS_MAX = 3;

const CLOCK_MS = 250;
const SETTLE_MS = 1200;
const LAST_SEASON_MS = 30_000;

const MATURE_MS = 2000;

const PLANES = [
  { id: 'verdant', name: 'Verdant' },
  { id: 'ember', name: 'Ember' },
  { id: 'tide', name: 'Tide' },
  { id: 'gloam', name: 'Gloam' },
  { id: 'aether', name: 'Aether' },
];

const WILD = 'wild';
const WILD_NAME = 'Mistflower';

const LETTERS = { verdant: 'V', ember: 'E', tide: 'T', gloam: 'G', aether: 'A', wild: '*' };

const PLANE_ORDER = [...PLANES.map((plane) => plane.id), WILD];

function planeCount(season) { return Math.min(3 + Math.floor((season - 1) / 2), PLANES.length); }

function planeName(id) { return PLANES.find((entry) => entry.id === id)?.name || WILD_NAME; }

function kindOf(plant) { return plant.wild ? WILD : plant.plane; }

function neighbours(index) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return [
    row > 0 ? index - COLS : null,
    row < ROWS - 1 ? index + COLS : null,
    col > 0 ? index - 1 : null,
    col < COLS - 1 ? index + 1 : null,
  ].filter(Number.isInteger);
}

function isEdge(index) {
  return index < COLS || index >= COLS * (ROWS - 1)
    || index % COLS === 0 || index % COLS === COLS - 1;
}

const game = {
  id: 'magical-flora',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = el('div', 'grove');
    this.wrap = wrap;

    const rail = el('div', 'grove__rail');
    const seeds = el('div', 'grove__seeds');

    this.chips = new Map();
    for (const plane of PLANES) seeds.append(this.buildChip(plane.id, plane.name));
    seeds.append(this.buildChip(WILD, WILD_NAME));

    rail.append(seeds);

    this.board = el('div', 'grove__board');
    this.board.style.setProperty('--cols', String(COLS));
    this.board.setAttribute('role', 'group');
    this.board.setAttribute('aria-label', 'The grove');

    this.plots = [];
    for (let index = 0; index < COLS * ROWS; index += 1) {
      const plot = document.createElement('button');
      plot.type = 'button';
      plot.className = 'grove__plot';
      plot.disabled = true;
      plot.addEventListener('click', () => this.plant(index));
      this.board.append(plot);
      this.plots.push({ el: plot, plant: null });
    }

    const foot = el('div', 'grove__foot');
    this.seasonEl = el('span', 'grove__season');
    this.handEl = el('span', 'grove__hand');
    this.bloomEl = el('span', 'grove__blooms');
    foot.append(this.seasonEl, this.handEl, this.bloomEl);

    const hint = el(
      'p',
      'grove__hint',
      'Each season starts with 1-3 random blooms. Pick a seed, then a lit plot. Complete a straight run of 3, 4, or 5 distinct kinds to bloom its interior. Mistflower is wild; blooms keep their plane.',
    );

    wrap.append(rail, this.board, foot, hint);
    ctx.stage.append(wrap);
  },

  buildChip(id, name) {
    const chip = el('button', 'grove__chip');
    chip.type = 'button';
    chip.dataset.plane = id;
    chip.disabled = true;
    chip.append(
      el('span', 'grove__swatch'),
      el('span', 'grove__chip-name', name),
      el('span', 'grove__chip-count', '0'),
    );
    chip.addEventListener('click', () => this.select(id));
    this.chips.set(id, { el: chip, countEl: chip.querySelector('.grove__chip-count') });
    return chip;
  },

  start(ctx) {
    this.ctx = ctx;
    this.alive = true;
    this.locked = false;
    this.settled = false;
    this.lastCall = false;
    this.season = 1;
    this.counts = null;

    clearTimeout(this.matureTimer);
    this.wrap.classList.remove('grove--lastcall', 'grove--maturing');

    this.startClock();
    this.dealSeason();
  },

  stop() {
    this.alive = false;
    this.locked = true;
    this.phase = 'stopped';

    clearInterval(this.clock);
    clearTimeout(this.matureTimer);
    this.wrap.classList.remove('grove--lastcall', 'grove--maturing');

    this.paint();
  },

  canPlay() {
    return this.alive === true && this.locked === false && this.phase === 'planting';
  },
  dealSeason() {
    this.phase = 'planting';
    this.harvestedThisSeason = false;
    this.bloomsThisSeason = 0;
    this.wrap.classList.remove('grove--maturing');

    // Shuffle the starting plane, then deal round robin for an even mix.
    const roster = shuffle(this.ctx.rng, PLANES.slice(0, planeCount(this.season)).map((plane) => plane.id));
    const size = Math.min(HAND_BASE + HAND_STEP * (this.season - 1), HAND_MAX);

    const counts = {};
    for (const plane of PLANES) counts[plane.id] = 0;
    counts[WILD] = WILDS;
    for (let dealt = 0; dealt < size; dealt += 1) {
      const plane = roster[dealt % roster.length];
      counts[plane] += 1;
    }

    this.counts = counts;
    this.handSize = size;

    for (const plot of this.plots) plot.plant = null;
    const blooms = this.seedBlooms();

    this.selected = null;
    this.advanceSelection();
    this.paint();

    this.ctx.message(`Season ${this.season}. ${blooms} random ${plural(blooms, 'bloom')} ${blooms === 1 ? 'has' : 'have'} sprouted.`);
  },

  seedBlooms() {
    const planes = PLANES.slice(0, planeCount(this.season));
    const count = randInt(this.ctx.rng, 1, Math.min(STARTING_BLOOMS_MAX, planes.length));
    const inner = [];
    for (let row = 1; row < ROWS - 1; row += 1) {
      for (let col = 1; col < COLS - 1; col += 1) inner.push(row * COLS + col);
    }

    for (const index of shuffle(this.ctx.rng, inner).slice(0, count)) {
      this.plots[index].plant = {
        plane: pick(this.ctx.rng, planes).id,
        wild: false,
        bloomed: true,
      };
    }
    return count;
  },

  select(id) {
    if (!this.canPlay()) return;
    if (this.counts[id] <= 0) return;

    this.selected = id;
    this.paintRail();
  },

  plant(index) {
    if (!this.canPlay()) return;

    const plot = this.plots[index];
    if (plot.plant) return;

    if (!this.isLegal(index)) {
      this.ctx.message('The grove grows outward — plant beside what is already growing.');
      return;
    }

    const plane = this.selected;
    if (!plane || this.counts[plane] <= 0) {
      this.ctx.message('Pick a seed from the rail first.');
      return;
    }

    const seed = { plane, wild: plane === WILD, bloomed: false };
    const mine = kindOf(seed);
    const onEdge = isEdge(index);

    let crossings = 0;
    let same = 0;
    for (const neighbour of neighbours(index)) {
      const other = this.plots[neighbour].plant;
      if (!other) continue;

      const neighbourKind = kindOf(other);
      if (neighbourKind === WILD || mine === WILD || neighbourKind !== mine) crossings += 1;
      else same += 1;
    }

    plot.plant = seed;
    this.counts[plane] -= 1;

    const points = (
      PLANT_BASE
      + crossings * CROSS_POINT
      + same * SAME_POINT
      + (onEdge ? EDGE_BONUS : 0)
    ) * this.season;
    this.ctx.addPoints(points);

    const bloomed = this.resolveBlooms(index);
    let bloomPoints = 0;
    for (const bloom of bloomed) {
      this.bloomsThisSeason += 1;
      bloomPoints += BLOOM_BASE + BLOOM_STEP * (this.bloomsThisSeason - 1);
      const flowering = this.plots[bloom].plant;
      flowering.bloomed = true;
    }
    if (bloomPoints > 0) this.ctx.addPoints(bloomPoints * this.season);

    const label = plane === WILD ? WILD_NAME : planeName(plane);
    let text = `${label} — ${points} points`;
    if (onEdge) text += `, thin soil paying ${EDGE_BONUS * this.season}`;
    if (bloomed.length === 1) {
      text += `, and a bloom at ${this.plotLocation(bloomed[0])} for ${bloomPoints * this.season} more`;
    } else if (bloomed.length > 1) {
      const locations = bloomed.map((candidate) => this.plotLocation(candidate)).join('; ');
      text += `, and ${bloomed.length} blooms at ${locations} for ${bloomPoints * this.season} more`;
    }
    this.ctx.message(`${text}.`);

    this.advanceSelection();
    this.paint();
    this.spendCheck();
  },

  /** Require adjacency once the grove has started. */
  isLegal(index) {
    if (this.plots[index].plant) return false;
    if (this.plantedCount() === 0) return true;
    return neighbours(index).some((neighbour) => this.plots[neighbour].plant);
  },
  /** A completed run blooms its interior; the new seed must be in the run. */
  resolveBlooms(index) {
    const span = planeCount(this.season);
    const size = this.plots.length;
    const centers = new Set();

    for (const step of [1, COLS]) {
      for (let offset = 0; offset < span; offset += 1) {
        const start = index - offset * step;
        const end = start + (span - 1) * step;
        if (start < 0 || end >= size) continue;
        if (step === 1 && Math.floor(start / COLS) !== Math.floor(end / COLS)) continue;

        const kinds = new Set();
        let complete = true;
        for (let position = 0; position < span; position += 1) {
          const plant = this.plots[start + position * step].plant;
          if (!plant) {
            complete = false;
            break;
          }
          kinds.add(kindOf(plant));
        }
        if (!complete || kinds.size !== span) continue;

        for (let position = 1; position < span - 1; position += 1) {
          centers.add(start + position * step);
        }
      }
    }

    return [...centers].filter((candidate) => {
      const plant = this.plots[candidate].plant;
      return plant && !plant.wild && !plant.bloomed;
    });
  },

  spendCheck() {
    if (this.remaining() > 0) return;
    this.mature();
  },
  mature() {
    this.phase = 'maturing';
    this.harvestedThisSeason = true;
    this.wrap.classList.add('grove--maturing');

    const harvest = this.seasonHarvest() * this.season;
    this.ctx.addPoints(harvest);
    this.paint();

    this.ctx.message(`The grove matures — ${harvest} harvested. Season ${this.season + 1} next.`);

    this.matureTimer = setTimeout(() => {
      if (!this.alive || this.settled) return;
      this.season += 1;
      this.dealSeason();
    }, MATURE_MS);
  },

  seasonHarvest() { return HARVEST_BASE + HARVEST_STEP * (this.season - 1); },
  startClock() {
    clearInterval(this.clock);

    this.clock = setInterval(() => {
      if (!this.alive) return;

      const remaining = this.ctx.run.remainingMs;
      const lastCall = remaining <= LAST_SEASON_MS;
      if (lastCall !== this.lastCall) {
        this.lastCall = lastCall;
        this.wrap.classList.toggle('grove--lastcall', lastCall);
        this.paintRail();
      }

      if (this.settled || remaining > SETTLE_MS) return;
      this.settled = true;
      this.settleAtBell();
    }, CLOCK_MS);
  },

  /** Settle before stop(), when the shell captures the final score. */
  settleAtBell() {
    this.locked = true;
    this.phase = 'settled';

    if (!this.harvestedThisSeason && this.counts) {
      this.harvestedThisSeason = true;

      const spent = this.handSize > 0 ? (this.handSize - this.remaining()) / this.handSize : 0;
      const partial = Math.floor(this.seasonHarvest() * this.season * spent);

      if (partial > 0) {
        this.ctx.addPoints(partial);
        this.ctx.message(`The bell — the grove is harvested early for ${partial}.`);
      } else {
        this.ctx.message('The bell — the grove has grown nothing to harvest.');
      }
    }

    this.paint();
  },

  remaining() {
    return PLANE_ORDER.reduce((total, plane) => total + this.counts[plane], 0);
  },

  plantedCount() {
    return this.plots.reduce((total, plot) => total + Number(Boolean(plot.plant)), 0);
  },

  advanceSelection() {
    if (this.selected && this.counts[this.selected] > 0) return;
    this.selected = PLANE_ORDER.find((plane) => this.counts[plane] > 0) || null;
  },

  paint() {
    this.paintRail();
    this.paintBoard();
  },

  paintRail() {
    if (!this.counts) return;

    const open = this.canPlay();

    for (const [id, chip] of this.chips) {
      const count = this.counts[id];
      chip.countEl.textContent = String(count);
      chip.el.disabled = !open || count <= 0;
      chip.el.classList.toggle('grove__chip--selected', this.selected === id);
    }

    const left = this.remaining();
    this.handEl.textContent = `${left} ${plural(left, 'seed')} left`;
    this.bloomEl.textContent = `${this.bloomsThisSeason} ${plural(this.bloomsThisSeason, 'bloom')}`;
    this.seasonEl.textContent = this.lastCall
      ? `Season ${this.season} · harvest at the bell`
      : `Season ${this.season} · ×${this.season}`;
  },

  paintBoard() {
    const open = this.canPlay();
    const bare = this.plantedCount() === 0;

    for (let index = 0; index < this.plots.length; index += 1) {
      const node = this.plots[index].el;
      const plant = this.plots[index].plant;

      if (plant) {
        // The gold flower marks a plot's state; its letter still names the plane
        // it grew from. Mistflower remains visually distinct by '*'.
        node.dataset.plane = plant.bloomed ? 'bloom' : plant.plane;
        node.textContent = LETTERS[plant.plane];
        node.disabled = true;
        node.classList.remove('grove__plot--legal');
        node.setAttribute('aria-label', this.describe(index, plant));
        continue;
      }

      node.removeAttribute('data-plane');
      node.textContent = '';
      node.disabled = !open;

      const legal = open && (bare || neighbours(index).some((side) => this.plots[side].plant));
      node.classList.toggle('grove__plot--legal', legal);
      node.setAttribute(
        'aria-label',
        legal ? 'empty plot, ready for a seed' : 'empty plot, the grove grows beside what is already planted',
      );
    }
  },

  plotLocation(index) {
    return `row ${Math.floor(index / COLS) + 1}, column ${index % COLS + 1}`;
  },

  describe(index, plant) {
    const label = plant.wild ? WILD_NAME : planeName(plant.plane);
    const state = plant.bloomed
      ? 'bloomed, and still reads as its plane'
      : plant.wild
        ? 'a stranger to every plane'
        : 'flowering';
    return `${label}, ${this.plotLocation(index)}, ${state}`;
  },
};

export default game;
