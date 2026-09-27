/* ---------------------------------------------------------------------------
   Magical Flora — grow across planes.

   The grove is a 7x7 bed of plots and the planes keep sending seeds through it.
   Plant a seed beside something already growing: a neighbour of the same plane
   pays 1, a neighbour of another plane pays 3, because the grove pays for
   difference. Ring a plot with four plants of at least three different planes
   and it blooms into a wild flower — a stranger to every plane, a wildcard that
   feeds every crossing after it, keeping only the letter of the plane it grew
   from.

   Nothing here fails. The pressure is scarcity: forty-nine plots against a hand
   of fourteen to twenty-four seeds, so the grove can never be filled and every
   seed is a decision about which frontier to extend. When the hand runs out the
   grove matures and the next season pays more; if the bell arrives mid-season,
   the grove is harvested early for the share of the hand that went in.

   The player picks a seed from the rail and clicks a plot, so this table owns
   its controls and the shell hides its single-action bar. The settle at the bell
   runs on a clock poll rather than in stop(), because the shell captures the
   score as the run ends and points added after that never reach the summary.
   --------------------------------------------------------------------------- */

import { el, plural } from '../dom.js';
import { shuffle } from '../rng.js';

const COLS = 7;
const ROWS = 7;

/** Seeds dealt in a season, and how the hand grows as the grove matures. The
    cap keeps the hand shorter than the bed, so the grove can never be filled. */
const HAND_BASE = 14;
const HAND_STEP = 2;
const HAND_MAX = 24;

/** One Mistflower and one compost a season. Both are meant to be spent well. */
const WILDS = 1;
const COMPOST = 1;

/** Points. The same plane is worth a little, another plane is worth three. */
const PLANT_BASE = 1;
const SAME_POINT = 1;
const CROSS_POINT = 3;

/** The soil runs thin at the border, and pays for it. */
const EDGE_BONUS = 2;

/** A ring of four plants of at least three planes blooms, and each bloom in a
    season pays a little more than the last. */
const BLOOM_MIN_PLANES = 3;
const BLOOM_BASE = 12;
const BLOOM_STEP = 4;

/** The harvest when a hand runs out, deeper as the seasons go on. */
const HARVEST_BASE = 40;
const HARVEST_STEP = 20;

/** Blooms carried into the next season, at most this many. */
const HERITAGE_MAX = 3;

/** The bell: how often it is checked, and how early the grove is harvested. */
const CLOCK_MS = 250;
const SETTLE_MS = 1200;
const LAST_SEASON_MS = 30_000;

/** The pause while a matured grove is cleared for the next season. */
const MATURE_MS = 2000;

/** The planes, in the order they arrive as the grove matures. */
const PLANES = [
  { id: 'verdant', name: 'Verdant' },
  { id: 'ember', name: 'Ember' },
  { id: 'tide', name: 'Tide' },
  { id: 'gloam', name: 'Gloam' },
  { id: 'aether', name: 'Aether' },
];

/** A Mistflower, and anything that has bloomed. Read as a stranger to all. */
const WILD = 'wild';
const WILD_NAME = 'Mistflower';

/** One letter a plot, so the bed can be read back without relying on colour. */
const LETTERS = { verdant: 'V', ember: 'E', tide: 'T', gloam: 'G', aether: 'A', wild: '*' };

const PLANE_ORDER = [...PLANES.map((plane) => plane.id), WILD];

/** How many planes are sending seed this season. */
function planeCount(season) {
  return Math.min(3 + Math.floor((season - 1) / 2), PLANES.length);
}

function planeName(id) {
  const plane = PLANES.find((entry) => entry.id === id);
  return plane ? plane.name : WILD_NAME;
}

/** The plane a plant reads as. A bloom, like a Mistflower, is a stranger. */
function readingOf(plant) {
  return plant.wild || plant.bloomed ? WILD : plant.plane;
}

/** The orthogonal plots around one, edges and corners left out. */
function neighbours(index) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const found = [];

  if (row > 0) found.push(index - COLS);
  if (row < ROWS - 1) found.push(index + COLS);
  if (col > 0) found.push(index - 1);
  if (col < COLS - 1) found.push(index + 1);

  return found;
}

/** The outer ring of the bed — the plots that can never be ringed themselves. */
function isEdge(index) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1;
}

const game = {
  id: 'magical-flora',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = el('div', 'grove');
    this.wrap = wrap;

    /* The rail: what is left in the hand, and the one compost. */

    const rail = el('div', 'grove__rail');
    const seeds = el('div', 'grove__seeds');

    this.chips = new Map();
    for (const plane of PLANES) seeds.append(this.buildChip(plane.id, plane.name));
    seeds.append(this.buildChip(WILD, WILD_NAME));

    const tools = el('div', 'grove__tools');
    this.compostButton = el('button', 'grove__compost');
    this.compostButton.type = 'button';
    this.compostCountEl = el('span', 'grove__compost-count', '0');
    this.compostButton.append(document.createTextNode('Compost'), this.compostCountEl);
    this.compostButton.addEventListener('click', () => this.compost());
    tools.append(this.compostButton);

    rail.append(seeds, tools);

    /* The grove itself. */

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
      'Pick a seed, then a lit plot. A same-plane neighbour pays 1, another plane pays 3. Ring a plot with four plants of three planes, or with four blooms, and it blooms — it turns into the wild flower and reads as a stranger to every plane from then on, keeping its letter so you can still see what it was. Thin soil on the border pays 2, but only the inner 5×5 can ever be ringed.',
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

  /* ------------------------------------------------------------- lifecycle */

  start(ctx) {
    this.ctx = ctx;
    this.alive = true;
    this.locked = false;
    this.settled = false;
    this.lastCall = false;
    this.season = 1;
    this.bloomsLastSeason = 0;
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

  /* ------------------------------------------------------------- a season */

  dealSeason() {
    this.phase = 'planting';
    this.harvestedThisSeason = false;
    this.bloomsThisSeason = 0;
    this.compostLeft = COMPOST;
    this.wrap.classList.remove('grove--maturing');

    // Deal round robin so the mix stays even, from a shuffled order so it is not
    // always the first planes that carry the odd seed.
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
    const heritage = this.season > 1
      ? this.placeHeritage(Math.min(this.bloomsLastSeason, HERITAGE_MAX))
      : 0;

    this.selected = null;
    this.advanceSelection();
    this.paint();

    this.ctx.message(heritage > 0
      ? `Season ${this.season}. ${heritage} ${plural(heritage, 'bloom')} came through from last season — the grove is already growing.`
      : `Season ${this.season}. Plant a seed anywhere in the grove.`);
  },

  /**
   * Blooms from last season seed the new bed. They sit away from the edges so
   * they can be ringed again, and they are kept apart from each other so a
   * single anchor never counts for two.
   */
  placeHeritage(count) {
    if (count <= 0) return 0;

    const inner = [];
    for (let row = 1; row < ROWS - 1; row += 1) {
      for (let col = 1; col < COLS - 1; col += 1) inner.push(row * COLS + col);
    }

    const pool = shuffle(this.ctx.rng, inner);
    const chosen = [];

    for (const index of pool) {
      if (chosen.length >= count) break;
      if (chosen.some((taken) => neighbours(taken).includes(index))) continue;
      chosen.push(index);
    }

    // If the gaps ran out, the rest goes wherever it fits.
    for (const index of pool) {
      if (chosen.length >= count) break;
      if (!chosen.includes(index)) chosen.push(index);
    }

    for (const index of chosen) {
      this.plots[index].plant = { plane: WILD, wild: true, bloomed: true };
    }

    return chosen.length;
  },

  /* -------------------------------------------------------------- planting */

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
    const mine = readingOf(seed);
    const onEdge = isEdge(index);

    let crossings = 0;
    let same = 0;
    for (const neighbour of neighbours(index)) {
      const other = this.plots[neighbour].plant;
      if (!other) continue;

      const reading = readingOf(other);
      if (reading === WILD || mine === WILD || reading !== mine) crossings += 1;
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

    const bloomed = this.resolveBlooms();
    let bloomPoints = 0;
    for (const bloom of bloomed) {
      this.bloomsThisSeason += 1;
      bloomPoints += BLOOM_BASE + BLOOM_STEP * (this.bloomsThisSeason - 1);
      this.plots[bloom].plant.bloomed = true;
    }
    if (bloomPoints > 0) this.ctx.addPoints(bloomPoints * this.season);

    const label = plane === WILD ? WILD_NAME : planeName(plane);
    let text = `${label} — ${points} points`;
    if (onEdge) text += `, thin soil paying ${EDGE_BONUS * this.season}`;
    if (bloomed.length === 1) text += `, and a bloom for ${bloomPoints * this.season} more`;
    else if (bloomed.length > 1) text += `, and ${bloomed.length} blooms for ${bloomPoints * this.season} more`;
    this.ctx.message(`${text}.`);

    this.advanceSelection();
    this.paint();
    this.spendCheck();
  },

  /** An empty plot, joined to the grove — or anywhere, if nothing has grown. */
  isLegal(index) {
    if (this.plots[index].plant) return false;
    if (this.plantedCount() === 0) return true;
    return neighbours(index).some((neighbour) => this.plots[neighbour].plant);
  },

  /**
   * Any planted plot whose four orthogonal neighbours are all planted, across at
   * least three planes, blooms. Four blooms around it ring it as well: strangers
   * have no planes to tell apart, so they saturate instead of falling short of
   * the count. An edge plot has fewer than four sides and so can never be
   * ringed. Blooms are read off the bed as it was before this pass, so two plots
   * can bloom together.
   */
  resolveBlooms() {
    const bloomed = [];

    for (let index = 0; index < this.plots.length; index += 1) {
      const plot = this.plots[index];
      if (!plot.plant || plot.plant.bloomed) continue;

      const sides = neighbours(index);
      if (sides.length < 4) continue;

      const around = sides.map((side) => this.plots[side].plant);
      if (around.some((other) => !other)) continue;

      const planes = new Set(around.map((other) => readingOf(other)));
      const crowded = around.every((other) => other.bloomed);
      if (planes.size >= BLOOM_MIN_PLANES || crowded) bloomed.push(index);
    }

    return bloomed;
  },

  compost() {
    if (!this.canPlay()) return;
    if (this.compostLeft <= 0) return;

    const plane = this.selected;
    if (!plane || this.counts[plane] <= 0) return;

    this.compostLeft -= 1;
    this.counts[plane] -= 1;

    const label = plane === WILD ? WILD_NAME : planeName(plane);
    this.advanceSelection();
    this.paint();
    this.ctx.message(`Composted a ${label} seed. ${this.remaining()} left in the hand.`);

    this.spendCheck();
  },

  /* ------------------------------------------------------ maturing and the bell */

  spendCheck() {
    if (this.remaining() > 0) return;
    this.mature();
  },

  mature() {
    this.phase = 'maturing';
    this.harvestedThisSeason = true;
    this.bloomsLastSeason = this.bloomsThisSeason;
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

  seasonHarvest() {
    return HARVEST_BASE + HARVEST_STEP * (this.season - 1);
  },

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

  /**
   * The bell takes the season's harvest early, for the share of the hand that
   * went in. It has to happen here rather than in stop(), because the shell
   * captures the final score as the run ends. It is guarded so a season that
   * already matured is never paid twice.
   */
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

  /* -------------------------------------------------------------- painting */

  remaining() {
    let total = 0;
    for (const plane of PLANE_ORDER) total += this.counts[plane];
    return total;
  },

  plantedCount() {
    let total = 0;
    for (const plot of this.plots) if (plot.plant) total += 1;
    return total;
  },

  /** Whatever is selected has run out, so the next seed in the rail takes over. */
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

    this.compostCountEl.textContent = String(this.compostLeft);
    this.compostButton.disabled = !open || this.compostLeft <= 0;

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
        // A bloom turns into the flower it became: the wild colour and the round
        // silhouette, with no ring around it. The letter stays the plane it grew
        // from, so what the plot was and what it now reads as are still both on
        // screen — colour and shape carry the wild reading, the letter carries
        // the plane.
        node.dataset.plane = plant.bloomed ? WILD : plant.plane;
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

  describe(index, plant) {
    const row = Math.floor(index / COLS) + 1;
    const column = (index % COLS) + 1;
    const label = plant.wild ? WILD_NAME : planeName(plant.plane);
    const state = plant.bloomed
      ? 'bloomed, and now reads as a stranger to every plane'
      : plant.wild
        ? 'a stranger to every plane'
        : 'flowering';
    return `${label}, row ${row} column ${column}, ${state}`;
  },
};

export default game;
