/* ---------------------------------------------------------------------------
  The Gift Cart — pack the crate for the road home.

   Villagers bring one parcel at a time, always more than the crate holds, so the
   game is choosing what goes and turning a parcel until it fits.
   --------------------------------------------------------------------------- */

import { el, plural, svgEl, svgPath } from '../dom.js';
import { pick, randInt, shuffle } from '../rng.js';

const ROWS = 3;
const COLS_MAX = 4;
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

/** Parcels, by how many squares they take. Cells are written from 0,0. */
const SHAPES = [
  { id: 'single', cells: [[0, 0]] },
  { id: 'domino', cells: [[0, 0], [1, 0]] },
  { id: 'bar', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'corner', cells: [[0, 0], [0, 1], [1, 1]] },
  { id: 'square', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
];

/** What a parcel of each size is worth. Bigger pays more per square. */
const VALUES = { 1: [1, 2], 2: [3, 5], 3: [6, 8], 4: [9, 12] };

/** Parcel art and colour: a gift is a name, a tint and a few strokes. */
const KINDS = [
  { id: 'loaf', name: 'Loaf', tint: '#c98a4b', paths: ['M3 12.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5V15H3z', 'M7.4 10l2 2.4M11.6 9.4l2 2.4'] },
  { id: 'jug', name: 'Jug', tint: '#6d94a8', paths: ['M7 3.5h6v3l1.2 2.2V15a2 2 0 0 1-2 2H7.8a2 2 0 0 1-2-2V8.7L7 6.5z', 'M14.4 8.6c2.1.3 3.1 1.8 3.1 3.4s-1 3.1-3.1 3.4'] },
  { id: 'jar', name: 'Jar', tint: '#7fa05f', paths: ['M6.2 6.5h7.6V15a2 2 0 0 1-2 2H8.2a2 2 0 0 1-2-2z', 'M5 3.5h10v3H5z'] },
  { id: 'ribbon', name: 'Ribbon', tint: '#c2708a', paths: ['M10 9.4C8.4 6.6 4.2 6.2 3.6 8.4c-.6 2.2 4.2 3.4 6.4 1', 'M10 9.4c1.6-2.8 5.8-3.2 6.4-1 .6 2.2-4.2 3.4-6.4 1', 'M9.2 10.4L7 17.5M10.8 10.4l2.2 7.1'] },
  { id: 'lantern', name: 'Lantern', tint: '#d98f3a', paths: ['M7.2 7.4h5.6v8H7.2z', 'M8.2 7.4c0-3.2 3.6-3.2 3.6 0', 'M6.2 15.4h7.6v2.2H6.2z'] },
  { id: 'cheese', name: 'Cheese', tint: '#d6c268', paths: ['M3.4 15.4l6.8-8.9 6.4 2.6v6.3z', 'M8.6 12.4h.1M12.4 12.9h.1M10.4 10.2h.1'] },
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

const SHAPE_DATA = SHAPES.map(({ id, cells }) => {
  const turns = orientations(cells);
  return { id, size: cells.length, turns, anchors: turns.map(anchorOf) };
});

/** Where the art and value go: a full box's middle, an L's elbow. */
function faceSpot(parcel) {
  if (parcel.cells.length === parcel.w * parcel.h) return middleOf(parcel.cells);
  const [x, y] = anchorOf(parcel.cells);
  return { x: x + 0.5, y: y + 0.5 };
}

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

/** Trips 1-2 keep to singles and dominoes; the heavy shapes arrive later. */
function sizeWeights(trip) {
  if (trip <= 2) return { 1: 5, 2: 5, 3: 0, 4: 0 };
  if (trip <= 5) return { 1: 3, 2: 4, 3: 3, 4: 0 };
  return { 1: 2, 2: 3, 3: 3, 4: 2 };
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
      shape: pick(rng, SHAPE_DATA.filter((item) => item.size === size)),
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
   * A parcel is drawn as the squares it took, never as a block over its footprint:
   * only its outside is inked, so an L reads as an L and its empty square as floor.
   * A packed parcel cannot be taken back, so it is a picture and not a control.
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
      node.append(tile);
    });

    // The art and the value sit on the middle of the shape.
    const spot = faceSpot(parcel);
    const face = el('span', 'gift__face');
    face.setAttribute('aria-hidden', 'true');
    face.style.left = `${(spot.x / parcel.w) * 100}%`;
    face.style.top = `${(spot.y / parcel.h) * 100}%`;
    face.append(this.buildArt(parcel.gift), el('span', 'gift__parcel-value', String(parcel.gift.value)));
    node.append(face);
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
    node.append(this.buildShapePreview(gift.shape.turns[gift.turn]), text);

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
    for (const d of gift.kind.paths) art.append(svgPath(d, 1.5));
    return art;
  },
};

export default game;
