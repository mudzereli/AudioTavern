/* ---------------------------------------------------------------------------
  The Gift Cart — pack the crate for the road home.

   Villagers bring one parcel at a time, always more than the crate holds, so the
   game is choosing what goes and turning a parcel until it fits.
   --------------------------------------------------------------------------- */

import { el, plural, svgEl } from '../dom.js';
import { pick, randInt, shuffle } from '../rng.js';

const ROWS = 3;
const COLS_MAX = 6;
const HAND_SIZE = 3;
const SETTLE_MS = 1200;
const CLOCK_MS = 200;
/** How long a delivered crate sits on the board before the next trip deals. */
const DELIVER_MS = 1100;

/** Half a crate gap: two squares of one parcel meet in the middle of it. */
const BLEED = 'calc(var(--gift-gap, 5px) / -2)';

/** The four sides: the class suffix, the offset, and the margin that closes it. */
const SIDES = [
  ['top', 0, -1, 'marginTop'], ['right', 1, 0, 'marginRight'],
  ['bottom', 0, 1, 'marginBottom'], ['left', -1, 0, 'marginLeft'],
];

/**
 * Parcels, by how many squares they take. Cells are written from 0,0, and `from` is the
 * first trip the shape can be dealt: one kind of parcel at a time joins the line, so the
 * crate keeps offering something new to work out.
 */
const SHAPES = [
  { id: 'single', cells: [[0, 0]] },
  { id: 'domino', cells: [[0, 0], [1, 0]] },
  { id: 'bar', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'corner', cells: [[0, 0], [0, 1], [1, 1]] },
  { id: 'square', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { id: 'tee', cells: [[0, 0], [1, 0], [2, 0], [1, 1]], from: 7 },
  { id: 'ell', cells: [[0, 0], [0, 1], [0, 2], [1, 2]], from: 9 },
  { id: 'snake', cells: [[1, 0], [2, 0], [0, 1], [1, 1]], from: 11 },
  { id: 'plus', cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], from: 13 },
  { id: 'u', cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]], from: 15 },
];

/** What a parcel of each size is worth. Bigger pays more per square. */
const VALUES = { 1: [1, 2], 2: [3, 5], 3: [6, 8], 4: [9, 12], 5: [12, 15] };

/** Parcel art and colour: folk-art silhouettes in one warm, coordinated palette. */
const KINDS = [
  { id: 'loaf', name: 'Loaf', tint: '#c47a43', shape: 'M2.5 12.6c0-3.8 3.2-6.9 7.5-6.9s7.5 3.1 7.5 6.9v2.8h-15z', detail: 'M6 9.1l1.6 2.1m3.4-3.1 1.6 2.1', shine: 'M4.2 13.8h3.2' },
  { id: 'jug', name: 'Jug', tint: '#4f817d', shape: 'M7 2.6h6v3.1l1.5 2.1v7.1a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2V7.8L7 5.7z', detail: 'M14.5 8.3c2 .2 3 1.5 3 3s-1 2.7-3 3.1M7.5 6.5h5', shine: 'M7.8 9v4.5' },
  { id: 'jar', name: 'Jar', tint: '#718253', shape: 'M5.2 6h9.6v8.9a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2zM4.2 3.4h11.6v2.5H4.2z', detail: 'M7.2 9h5.6v3.2H7.2z', shine: 'M5.7 7.3h1.1' },
  { id: 'ribbon', name: 'Ribbon', tint: '#a85d60', shape: 'M10 8.8C7.8 5.3 3.1 5.3 3.1 7.9c0 2.4 3.8 3.3 6.3 2.3L7.2 16.8l2.5-1.3 2.6 1.3-1.6-6.6c2.5 1 6.2.1 6.2-2.3 0-2.6-4.7-2.6-6.9.9z', detail: 'M9.7 9.5 6.1 7.6m4.3 1.9L14 7.6', shine: 'M4.3 8.1c.6-.7 1.6-.9 2.5-.5' },
  { id: 'lantern', name: 'Lantern', tint: '#d49a42', shape: 'M8 6.7h4v1.4h1.7v6.3h-7.4V8.1H8zM6 14.5h8v2H6zM8.6 6.5c0-2 2.8-2 2.8 0', detail: 'M8.1 9.2v4m3.8-4v4m-3.8-2h3.8', shine: 'M7.4 9.2v3.4' },
  { id: 'cheese', name: 'Cheese', tint: '#ccb65e', shape: 'M3 15.5 9.9 5.2 17 8.3v7.2z', detail: 'M8 12a.55.55 0 1 0 1.1 0a.55.55 0 1 0-1.1 0M12 13a.55.55 0 1 0 1.1 0a.55.55 0 1 0-1.1 0', shine: 'M4.8 14.4 7 11.2' },
];

/** A quarter turn clockwise, shifted back so its box starts at 0,0. */
function rotated(cells) {
  const maxY = Math.max(...cells.map(([, y]) => y));
  const turned = cells.map(([x, y]) => [maxY - y, x]);
  const minX = Math.min(...turned.map(([x]) => x));
  const minY = Math.min(...turned.map(([, y]) => y));
  return turned.map(([x, y]) => [x - minX, y - minY]);
}

/** One cell list per turn a player can tell apart; a square returns just one. */
function orientations(cells) {
  const out = [];
  const seen = new Set();
  let current = cells;
  for (let step = 0; step < 4; step += 1) {
    const key = current.map(([x, y]) => `${x}:${y}`).join(' ');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(current);
    }
    current = rotated(current);
  }
  return out;
}

/** Is this square one the shape took? */
const holder = (cells) => {
  const taken = new Set(cells.map((cell) => cell.join(':')));
  return (x, y) => taken.has(`${x}:${y}`);
};

/** The width and height a shape covers, in squares. */
function spanOf(cells) {
  const wide = (pick) => Math.max(...cells.map(pick)) + 1;
  return { w: wide(([x]) => x), h: wide(([, y]) => y) };
}

/** The middle of a shape, in squares, as a point between them. */
function middleOf(cells) {
  const along = (pick) => cells.reduce((sum, cell) => sum + pick(cell) + 0.5, 0) / cells.length;
  return { x: along(([x]) => x), y: along(([, y]) => y) };
}

/** The square a tap takes: the one with the shape on the most sides, never a box corner. */
function anchorOf(cells) {
  const held = holder(cells);
  const middle = middleOf(cells);
  const sides = (x, y) => (held(x, y - 1) ? 1 : 0) + (held(x + 1, y) ? 1 : 0)
    + (held(x, y + 1) ? 1 : 0) + (held(x - 1, y) ? 1 : 0);
  let best = null;
  for (const [x, y] of cells) {
    const count = sides(x, y);
    const drift = Math.abs(x + 0.5 - middle.x) + Math.abs(y + 0.5 - middle.y);
    if (!best || count > best.count || (count === best.count && drift < best.drift)) {
      best = { count, drift, x, y };
    }
  }
  return [best.x, best.y];
}

const SHAPE_DATA = SHAPES.map(({ id, cells, from }) => {
  const turns = orientations(cells);
  return { id, from: from || 1, size: cells.length, turns, anchors: turns.map(anchorOf) };
});

/** Walk a shape's box, handing the visitor each square and the shape's own test. */
function eachSquare(cells, visit) {
  const span = spanOf(cells);
  const held = holder(cells);
  for (let index = 0; index < span.w * span.h; index += 1) {
    visit(index % span.w, Math.floor(index / span.w), held);
  }
  return span;
}

/** Draw a parcel size out of the trip's mix. */
function weightedSize(rng, weights) {
  let roll = rng() * Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  for (const [size, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll < 0) return Number(size);
  }
  return 1;
}

/**
 * Trips 1-2 keep to singles and dominoes; the heavy shapes arrive later. Five-square
 * parcels join the mix on trip 13. Singles thin out as the run goes on, and that is the
 * difficulty dial: a single is the only parcel that fits any hole, so a line with fewer
 * of them is one that can leave you holding three parcels that do not fit and setting off
 * early.
 */
function sizeWeights(trip) {
  if (trip <= 2) return { 1: 4, 2: 6, 3: 0, 4: 0 };
  if (trip <= 5) return { 1: 2, 2: 4, 3: 3, 4: 0 };
  return trip < 13
    ? { 1: 1, 2: 3, 3: 3, 4: 3 }
    : { 1: 1, 2: 3, 3: 3, 4: 3, 5: 2 };
}

/**
 * The shapes of one size this trip may deal. If every shape of that size is still gated,
 * the whole size is offered rather than nothing: pick() on an empty list returns
 * undefined, and the next paint throws reaching into it.
 */
function shapePool(size, trip) {
  const ofSize = SHAPE_DATA.filter((item) => item.size === size);
  const open = ofSize.filter((item) => item.from <= trip);
  return open.length > 0 ? open : ofSize;
}

/** A line as long as the crate has squares, so it always overfills the crate. */
function dealParcels(rng, squares, trip) {
  const weights = sizeWeights(trip);
  const kinds = shuffle(rng, KINDS);
  const line = [];
  for (let index = 0; index < squares; index += 1) {
    const size = weightedSize(rng, weights);
    const [low, high] = VALUES[size];
    line.push({
      id: `${trip}-${index}`, kind: kinds[index % kinds.length], turn: 0, size,
      shape: pick(rng, shapePool(size, trip)),
      value: randInt(rng, low, high),
    });
  }
  return line;
}

const game = {
  id: 'gift-cart',

  mount(ctx) {
    this.ctx = ctx;
    this.phase = 'idle';

    const wrap = el('section', 'gift');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'The gift cart');
    this.wrap = wrap;

    this.tripEl = el('p', 'gift__trip', 'Trip 1');
    this.countEl = el('p', 'gift__count');
    const head = el('div', 'gift__head');
    head.append(this.tripEl, this.countEl);

    // Every square the widest crate can hold is built once; a narrower crate hides
    // the squares past its last column rather than rebuilding them.
    this.crate = el('div', 'gift__crate');
    this.cells = Array.from({ length: ROWS * COLS_MAX }, (unused, index) => {
      const col = index % COLS_MAX;
      const row = (index - col) / COLS_MAX;
      const cell = el('button', 'gift__cell');
      cell.type = 'button';
      cell.style.gridColumn = `${col + 1}`;
      cell.style.gridRow = `${row + 1}`;
      cell.setAttribute('aria-label', `Square ${col + 1} down, ${row + 1} across`);
      cell.addEventListener('click', () => this.place(col, row));
      this.crate.append(cell);
      return { node: cell, col };
    });
    this.parcelNodes = [];
    this.lineEl = el('p', 'gift__line-label', 'Waiting');
    this.handEl = el('div', 'gift__hand');
    const line = el('div', 'gift__line');
    line.append(this.lineEl, this.handEl);

    const hint = el('p', 'gift__hint', 'Pick a parcel, then a square: the parcel takes the square you tap, so turn it to make it fit. Once packed, it stays packed.');

    // The departure belongs to the table, and goes last: the one big button ends the board.
    wrap.append(head, this.crate, line, hint, ctx.actionBar);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.ctx = ctx;
    clearTimeout(this.beat);
    clearInterval(this.clock);
    Object.assign(this, { alive: true, settled: false, locked: true, trip: 0 });
    this.nextTrip();
    this.startClock();
  },

  stop() {
    clearTimeout(this.beat);
    clearInterval(this.clock);
    Object.assign(this, { alive: false, locked: true, phase: 'done', beat: null, clock: null });
    this.ctx.setActionEnabled(false);
    this.paint();
  },

  /** The shell's one button is the departure. */
  act() {
    if (this.canAct()) this.deliver();
  },

  canAct() {
    return this.alive && !this.locked && !this.settled && this.phase === 'packing';
  },

  nextTrip() {
    this.trip += 1;
    this.cols = Math.min(COLS_MAX, 1 + Math.ceil(this.trip / 2));
    this.squares = ROWS * this.cols;
    Object.assign(this, { placed: [], selected: null, hand: [], phase: 'packing', locked: false });
    this.line = dealParcels(this.ctx.rng, this.squares, this.trip);
    this.refillHand();

    this.crate.style.setProperty('--cols', String(this.cols));
    this.crate.style.aspectRatio = `${this.cols} / ${ROWS}`;
    this.tripEl.textContent = `Trip ${this.trip} · ${this.cols} × ${ROWS}`;
    this.ctx.setActionEnabled(true);
    this.ctx.message('Pack what fits, then set off for home.');
    this.paint();
  },

  /** Top the line up from behind, three ahead until the queue runs dry. */
  refillHand() {
    while (this.hand.length < HAND_SIZE && this.line.length > 0) this.hand.push(this.line.shift());
  },

  /** Squares a parcel covers are what counts as taken, not its whole box. */
  fits(col, row, cells) {
    const taken = this.placed.flatMap((parcel) => parcel.cells.map(([px, py]) => (
      `${parcel.col + px}:${parcel.row + py}`
    )));
    return cells.every(([dx, dy]) => {
      const x = col + dx;
      const y = row + dy;
      return x >= 0 && y >= 0 && x < this.cols && y < ROWS && !taken.includes(`${x}:${y}`);
    });
  },

  place(col, row) {
    if (!this.canAct()) return;
    if (!this.selected) {
      this.ctx.message('Pick a parcel from the line first.');
      return;
    }
    const gift = this.selected;
    const cells = gift.shape.turns[gift.turn];
    const anchor = gift.shape.anchors[gift.turn];
    // The tap names a square of the parcel, so the box starts at that square's offset.
    const at = { col: col - anchor[0], row: row - anchor[1] };
    if (!this.fits(at.col, at.row, cells)) {
      // A tap on a square that is already packed is much the likeliest refusal, and
      // the parcel is packed for good — so say that rather than blaming the shape.
      this.ctx.message(this.fits(col, row, [[0, 0]])
        ? 'That parcel will not fit there.'
        : 'That square is already packed.');
      return;
    }

    const span = spanOf(cells);
    this.placed.push({ gift, ...at, w: span.w, h: span.h, cells });
    this.hand.splice(this.hand.indexOf(gift), 1);
    this.selected = null;
    this.refillHand();
    this.paint();

    // The line only empties on a crate filled to its last square.
    if (this.line.length === 0 && this.hand.length === 0) this.deliver();
  },

  /** A parcel in the line: select it, or turn it if it is already selected. */
  pickHand(gift) {
    if (!this.canAct()) return;
    if (this.selected !== gift) {
      this.selected = gift;
      this.ctx.message(`${gift.kind.name} — ${plural(gift.size, 'square')}, ${gift.value} points. Tap a square to lay it down.`);
      this.paint();
      return;
    }
    const turns = gift.shape.turns.length;
    gift.turn = (gift.turn + 1) % turns;
    this.ctx.message(turns === 1
      ? `The ${gift.kind.name.toLowerCase()} is square — turning it changes nothing.`
      : `Turned the ${gift.kind.name.toLowerCase()}.`);
    this.paint();
  },

  deliver() {
    clearTimeout(this.beat);
    Object.assign(this, { phase: 'delivered', locked: true, beat: null });
    this.ctx.setActionEnabled(false);
    const gifts = this.placed.length;
    const value = this.placed.reduce((total, parcel) => total + parcel.gift.value, 0);
    const packed = this.placed.reduce((total, parcel) => total + parcel.gift.size, 0);
    const full = this.squares > 0 && packed === this.squares;
    const paid = full ? value * 2 : value;
    this.ctx.addPoints(paid);
    if (gifts === 0) this.ctx.message('The crate goes home empty.');
    else if (full) {
      this.ctx.message(`All ${this.squares} squares packed — ${gifts} ${plural(gifts, 'parcel')} worth ${value}, paid twice for ${paid}.`);
    } else this.ctx.message(`${gifts} ${plural(gifts, 'parcel')} delivered for ${paid} points.`);
    this.paint();
    if (this.settled) return;
    this.beat = setTimeout(() => {
      this.beat = null;
      if (this.alive && !this.settled) this.nextTrip();
    }, DELIVER_MS);
  },

  startClock() {
    clearInterval(this.clock);
    this.clock = setInterval(() => {
      if (!this.alive || this.settled || this.ctx.run.remainingMs > SETTLE_MS) return;
      this.settled = true;
      this.settleAtBell();
    }, CLOCK_MS);
  },

  /**
   * The trip in progress is delivered before the clock stops: the shell captures the
   * final score as the run ends, and anything added after that is never counted.
   */
  settleAtBell() {
    clearTimeout(this.beat);
    this.beat = null;
    if (this.phase === 'packing') this.deliver();
    else {
      this.ctx.message('The cart comes home as the day ends.');
      this.paint();
    }
  },

  paint() {
    this.parcelNodes.forEach((node) => node.remove());
    this.parcelNodes = this.placed.map((parcel) => (
      this.crate.appendChild(this.buildParcel(parcel))
    ));
    const live = this.canAct();
    const aim = live && Boolean(this.selected);
    for (const { node, col } of this.cells) {
      const outside = col >= (this.cols || 1);
      node.classList.toggle('gift__cell--out', outside);
      node.classList.toggle('gift__cell--aim', aim);
      node.disabled = outside || !live;
    }
    this.handEl.replaceChildren(...this.hand.map((gift) => this.buildHandGift(gift)));
    const packed = this.placed.reduce((total, parcel) => total + parcel.gift.size, 0);
    const value = this.placed.reduce((total, parcel) => total + parcel.gift.value, 0);
    const full = this.squares > 0 && packed === this.squares;
    this.wrap.classList.toggle('gift--full', full);
    this.countEl.textContent = `${packed} of ${this.squares || 0} squares`;
    this.lineEl.textContent = this.phase === 'packing'
      ? `${this.hand.length} waiting · ${this.line.length ? `${this.line.length} behind` : 'nothing behind'}`
      : 'on the road';
    this.ctx.setActionLabel(value > 0 ? `Set off · ${full ? value * 2 : value}` : 'Set off');
  },

  /**
   * A parcel is drawn as the squares it took, one gift icon each and only its outside
   * inked, so an L reads as an L and its empty square as floor. It is a picture and not
   * a control: the points are on the chip in the line and the crate's worth is on the
   * button, where they can still be acted on.
   */
  buildParcel(parcel) {
    const node = el('div', 'gift__parcel');
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', `${parcel.gift.kind.name}, ${plural(parcel.gift.size, 'square')} (${parcel.gift.shape.id}), ${parcel.gift.value} points`);
    node.style.gridColumn = `${parcel.col + 1} / span ${parcel.w}`;
    node.style.gridRow = `${parcel.row + 1} / span ${parcel.h}`;
    node.style.setProperty('--tint', parcel.gift.kind.tint);
    node.style.setProperty('--shape-w', String(parcel.w));
    node.style.setProperty('--shape-h', String(parcel.h));

    eachSquare(parcel.cells, (x, y, held) => {
      // A square the parcel did not take stays blank so the tiles keep their places.
      if (!held(x, y)) {
        node.append(el('span', 'gift__hole'));
        return;
      }
      const tile = el('span', 'gift__tile');
      // A side the parcel does not carry on across is inked; a side it does is closed
      // up instead, half a crate gap each way, so two tiles meet on the crate's line
      // rather than each swelling to swallow the gap.
      for (const [name, dx, dy, margin] of SIDES) {
        const shared = held(x + dx, y + dy);
        tile.classList.toggle(`gift__tile--${name}`, !shared);
        if (shared) tile.style[margin] = BLEED;
      }
      tile.append(this.buildArt(parcel.gift));
      node.append(tile);
    });
    return node;
  },

  buildHandGift(gift) {
    const node = el('button', 'gift__chip');
    node.type = 'button';
    node.style.setProperty('--tint', gift.kind.tint);
    node.classList.toggle('gift__chip--on', this.selected === gift);
    node.disabled = !this.canAct();

    const text = el('span', 'gift__chip-text');
    text.append(
      el('span', 'gift__chip-kind', gift.kind.name),
      // The footprint above already shows how many squares it takes, so the chip
      // only has to say what it is worth.
      el('span', 'gift__chip-meta', `${gift.value} pts`),
    );
    const art = this.buildArt(gift);
    art.classList.add('gift__art--chip');
    node.append(art, this.buildShapePreview(gift.shape.turns[gift.turn]), text);

    const label = `${gift.kind.name}, ${plural(gift.size, 'square')} (${gift.shape.id}), ${gift.value} points`;
    node.setAttribute('aria-label', this.selected === gift ? `${label} — tap again to turn it` : label);
    node.addEventListener('click', () => this.pickHand(gift));
    return node;
  },

  /** The footprint at its current turn: size and shape, ahead of the chip's words. */
  buildShapePreview(cells) {
    const preview = el('span', 'gift__shape');
    preview.setAttribute('aria-hidden', 'true');
    const span = eachSquare(cells, (x, y, held) => {
      preview.append(el('i', `gift__shape-cell${held(x, y) ? ' gift__shape-cell--on' : ''}`));
    });
    preview.style.setProperty('--shape-w', String(span.w));
    preview.style.setProperty('--shape-h', String(span.h));
    return preview;
  },

  buildArt(gift) {
    const art = svgEl('svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' });
    art.classList.add('gift__art');
    art.append(
      svgEl('path', { d: gift.kind.shape, class: 'gift__art-shape' }),
      svgEl('path', { d: gift.kind.detail, class: 'gift__art-detail' }),
      svgEl('path', { d: gift.kind.shine, class: 'gift__art-shine' }),
    );
    return art;
  },
};

export default game;
