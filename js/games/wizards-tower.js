import { el, plural } from '../dom.js';
import { pick, randInt, shuffle } from '../rng.js';

const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;
const DECOY_PIPES = [
  NORTH | SOUTH,
  NORTH | EAST,
  EAST | SOUTH,
  SOUTH | WEST,
  WEST | NORTH,
  EAST | WEST,
];
const SIDES = [
  { dr: -1, dc: 0, bit: NORTH, opposite: SOUTH, name: 'north' },
  { dr: 0, dc: 1, bit: EAST, opposite: WEST, name: 'east' },
  { dr: 1, dc: 0, bit: SOUTH, opposite: NORTH, name: 'south' },
  { dr: 0, dc: -1, bit: WEST, opposite: EAST, name: 'west' },
];
const DECOY_BITS = [NORTH, EAST, SOUTH, WEST];

function hasBranchCell(path, size) {
  const route = new Set(path);
  for (let index = 0; index < size * size; index += 1) {
    if (route.has(index)) continue;
    const row = Math.floor(index / size), col = index % size;
    let contacts = 0;
    for (const side of SIDES) {
      const nextRow = row + side.dr, nextCol = col + side.dc;
      if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue;
      if (route.has(nextRow * size + nextCol)) contacts += 1;
    }
    if (contacts === 1) return true;
  }
  return false;
}

function makePath(rng, size) {
  const target = size * size - 1;
  const minLength = size * 2 + 1;
  const maxLength = size * 3 - 1;
  const path = [0], used = new Set(path);
  let budget = 12000;

  function extend(index) {
    if (--budget < 0) return false;
    if (index === target) return path.length >= minLength && hasBranchCell(path, size);
    if (path.length >= maxLength) return false;
    const row = Math.floor(index / size), col = index % size;
    const next = [];
    for (const side of SIDES) {
      const nextRow = row + side.dr, nextCol = col + side.dc;
      if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue;
      const candidate = nextRow * size + nextCol;
      if (!used.has(candidate)) next.push(candidate);
    }
    for (const candidate of shuffle(rng, next)) {
      used.add(candidate);
      path.push(candidate);
      if (extend(candidate)) return true;
      path.pop();
      used.delete(candidate);
    }
    return false;
  }

  if (extend(0)) return path;
  return size === 4
    ? [0, 1, 2, 3, 7, 6, 10, 14, 15]
    : [0, 1, 2, 3, 4, 9, 8, 13, 18, 23, 24];
}

function makeDecoys(rng, size, path) {
  const route = new Set(path), visited = new Set(route);
  const tiles = Array(size * size);
  for (let start = 0; start < tiles.length; start += 1) {
    if (visited.has(start)) continue;
    const region = [start], contacts = new Set();
    visited.add(start);
    for (let cursor = 0; cursor < region.length; cursor += 1) {
      const index = region[cursor];
      const row = Math.floor(index / size), col = index % size;
      for (const side of SIDES) {
        const nextRow = row + side.dr, nextCol = col + side.dc;
        if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue;
        const next = nextRow * size + nextCol;
        if (route.has(next)) contacts.add(next);
        else if (!visited.has(next)) {
          visited.add(next);
          region.push(next);
        }
      }
    }
    let branch = null;
    for (const index of region) {
      const row = Math.floor(index / size), col = index % size;
      let routeNeighbors = 0;
      for (const side of SIDES) {
        const nextRow = row + side.dr, nextCol = col + side.dc;
        if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue;
        if (route.has(nextRow * size + nextCol)) routeNeighbors += 1;
      }
      if (routeNeighbors === 1) { branch = index; break; }
    }
    for (const index of region) {
      const pipes = contacts.size <= 1 || index === branch;
      const masks = pipes ? DECOY_PIPES : DECOY_BITS;
      tiles[index] = { base: pick(rng, masks), turns: randInt(rng, 0, 3), decoy: true };
    }
  }
  return tiles;
}

function direction(from, to, size) {
  const delta = to - from;
  if (delta === -size) return NORTH;
  if (delta === size) return SOUTH;
  return delta === 1 ? EAST : WEST;
}

function rotate(mask, turns) {
  for (let count = 0; count < turns; count += 1) mask = (mask << 1 & 15) | (mask >> 3);
  return mask;
}

function connectionLabel(mask) {
  return SIDES.filter((side) => mask & side.bit).map((side) => side.name).join(' and ') || 'none';
}

const game = {
  id: 'wizards-tower',

  mount(ctx) {
    this.ctx = ctx;
    this.wrap = el('section', 'wt');
    this.wrap.setAttribute('role', 'group');
    this.wrap.setAttribute('aria-label', "Wizard's Tower rune circuit");

    this.status = el('p', 'wt__status');
    this.board = el('div', 'wt__board');
    this.board.setAttribute('role', 'group');
    this.board.setAttribute('aria-label', 'Rotate rune tiles to connect the tower to the altar');
    this.cells = [];
    this.hint = el('p', 'wt__hint', 'Rotate each rune clockwise to carry starlight from the tower to the altar.');
    this.wrap.append(this.status, this.board, this.hint);
    ctx.stage.append(this.wrap);
  },

  start(ctx) {
    this.ctx = ctx;
    this.alive = true;
    this.locked = false;
    this.rites = 0;
    clearTimeout(this.nextTimer);
    this.dealPuzzle();
  },

  stop() {
    this.alive = false;
    this.locked = true;
    this.phase = 'stopped';
    clearTimeout(this.nextTimer);
    this.paint();
  },

  canPlay() {
    return this.alive && !this.locked && this.phase === 'puzzle';
  },

  dealPuzzle() {
    this.phase = 'puzzle';
    this.size = this.rites < 4 ? 4 : 5;
    this.path = makePath(this.ctx.rng, this.size);
    this.tower = this.path[0];
    this.altar = this.path[this.path.length - 1];
    this.tiles = makeDecoys(this.ctx.rng, this.size, this.path);

    for (let step = 0; step < this.path.length; step += 1) {
      const index = this.path[step];
      let base = 0;
      if (step > 0) base |= direction(index, this.path[step - 1], this.size);
      if (step < this.path.length - 1) base |= direction(index, this.path[step + 1], this.size);
      this.tiles[index] = { base, turns: 0, decoy: false };
    }

    const scrambleCount = Math.min(2 + Math.floor(this.rites / 2), this.path.length - 1);
    const scrambled = shuffle(this.ctx.rng, this.path.slice(0, -1)).slice(0, scrambleCount);
    for (const index of scrambled) {
      const tile = this.tiles[index];
      let turns = randInt(this.ctx.rng, 1, 3);
      if (rotate(tile.base, turns) === tile.base) turns = turns === 1 ? 3 : 1;
      tile.turns = turns;
    }

    this.board.style.setProperty('--wt-size', String(this.size));
    this.cells = [];
    this.board.replaceChildren();
    for (let index = 0; index < this.tiles.length; index += 1) {
      const button = el('button', 'wt__tile');
      button.type = 'button';
      const rune = el('span', 'wt__rune');
      for (const side of SIDES) {
        if (this.tiles[index].base & side.bit) rune.append(el('i', `wt__port wt__port--${side.name}`));
      }
      rune.append(el('i', 'wt__core'));
      button.append(rune);
      button.addEventListener('click', () => this.turn(index));
      this.board.append(button);
      this.cells.push(button);
    }
    this.ctx.message(`Rite ${this.rites + 1}. Turn the runes to link the tower and altar.`);
    this.paint();
  },

  connected() {
    const reached = new Set([this.tower]);
    const queue = [this.tower];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const row = Math.floor(index / this.size), col = index % this.size;
      const mask = rotate(this.tiles[index].base, this.tiles[index].turns);
      for (const side of SIDES) {
        if (!(mask & side.bit)) continue;
        const nextRow = row + side.dr, nextCol = col + side.dc;
        if (nextRow < 0 || nextRow >= this.size || nextCol < 0 || nextCol >= this.size) continue;
        const next = nextRow * this.size + nextCol;
        const other = rotate(this.tiles[next].base, this.tiles[next].turns);
        if (!(other & side.opposite) || reached.has(next)) continue;
        reached.add(next);
        queue.push(next);
      }
    }
    return reached;
  },

  turn(index) {
    if (!this.canPlay()) return;
    this.tiles[index].turns = (this.tiles[index].turns + 1) % 4;
    const reached = this.connected();
    if (reached.has(this.altar)) {
      this.phase = 'complete';
      this.rites += 1;
      this.ctx.addPoints(1);
      this.ctx.message(`Circuit complete. ${this.rites} ${plural(this.rites, 'rite')} completed.`);
      this.paint(reached);
      this.nextTimer = setTimeout(() => {
        if (this.alive) this.dealPuzzle();
      }, 650);
      return;
    }
    this.paint(reached);
  },

  paint(reached = this.connected()) {
    if (!this.tiles) return;
    for (let index = 0; index < this.tiles.length; index += 1) {
      const tile = this.tiles[index], button = this.cells[index];
      const mask = rotate(tile.base, tile.turns);
      const place = index === this.tower ? 'Tower source, ' : index === this.altar ? 'Ritual altar, ' : '';
      button.disabled = !this.canPlay();
      button.classList.toggle('wt__tile--connected', reached.has(index));
      button.classList.toggle('wt__tile--source', index === this.tower);
      button.classList.toggle('wt__tile--altar', index === this.altar);
      button.classList.toggle('wt__tile--decoy', tile.decoy);
      button.classList.toggle('wt__tile--solved', this.phase === 'complete');
      button.setAttribute('aria-label', `${place}${tile.decoy ? 'decoy rune' : 'rune'}, connections ${connectionLabel(mask)}${this.canPlay() ? ', click to rotate clockwise' : ''}`);
      button.style.setProperty('--wt-turn', `${tile.turns * 90}deg`);
    }
    this.status.textContent = `Rite ${this.rites + 1} · ${this.size} x ${this.size}`;
  },
};

export default game;
