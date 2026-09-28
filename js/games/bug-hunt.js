/* Bug Hunt: read the creature's intent, act once, and survive. */

import { el, plural, svgEl, svgPath } from '../dom.js';

const COLS = 4;
const ROWS = 4;
const ROOMS = ['Cab', 'Mess', 'Galley', 'Stores', 'Hold', 'Spine', 'Berth', 'Vault', 'Cargo', 'Conduit', 'Junction', 'Engine', 'Cradle', 'Sumps', 'Bilge', 'Nest'];
const SPINE = 5;
const NEST = 15;
const MIN_START_GAP = 4;
const DIRECTIONS = [
  { id: 'n', dr: -1, dc: 0 }, { id: 'e', dr: 0, dc: 1 },
  { id: 's', dr: 1, dc: 0 }, { id: 'w', dr: 0, dc: -1 },
];

const DIAGONALS = ['ne', 'se', 'sw', 'nw'];
const SLIPS = DIRECTIONS.flatMap((direction, index) => [
  direction,
  {
    id: DIAGONALS[index],
    dr: direction.dr + DIRECTIONS[(index + 1) % DIRECTIONS.length].dr,
    dc: direction.dc + DIRECTIONS[(index + 1) % DIRECTIONS.length].dc,
  },
]);
const DEATH_MS = 1800;
const AMMO_START = 4;
const AMMO_CAP = 8;
const AMMO_PER_KILL = 2;
const SEALS_PER_SECTOR = 2;
const SEAL_TURNS = 2;
const KILL_SCORE = 1;
const STRAINS = ['Skitter', 'Crawler', 'Carapace'];
const ARMOUR_CAP = 3;
const PLATE_FROM_SECTOR = 2;
const PLATE_CHANCE = 0.35;
const BOSS_EVERY = 3;
const BOSS_ARMOUR_BASE = 4;
const BOSS_ARMOUR_STEP = 2;
const BOSS_ARMOUR_MAX = 6;
const BOSS_PHASE_SPLIT = 0.5;
const SECTOR_MS = 2200;

function rowOf(index) { return Math.floor(index / COLS); }
function colOf(index) { return index % COLS; }
function stepIn(index, direction) {
  const row = rowOf(index) + direction.dr, col = colOf(index) + direction.dc;
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  return row * COLS + col;
}
function doorsOf(index) {
  return DIRECTIONS.flatMap((direction) => {
    const next = stepIn(index, direction);
    return next === null ? [] : [{ id: direction.id, index: next }];
  });
}
function slipsFrom(index) {
  return SLIPS.map((slip) => stepIn(index, slip)).filter((next) => next !== null);
}

function doorKey(first, second) { return first < second ? `${first}:${second}` : `${second}:${first}`; }

function distance(first, second) { return Math.abs(rowOf(first) - rowOf(second)) + Math.abs(colOf(first) - colOf(second)); }

function inLine(first, second) { return rowOf(first) === rowOf(second) || colOf(first) === colOf(second); }

function createBug(creature) {
  const boss = creature.kind === 'boss';
  const shell = Math.max(1, Math.min(creature.armour, 4));
  const width = 7.5 + shell * 1.3;
  const depth = 9 + shell * 0.9;
  const rows = boss ? [14, 20, 26, 32] : [16, 22, 28];
  const legs = rows.flatMap((row) => [1, -1].map((side) =>
    `M ${24 + side * 6} ${row} L ${24 + side * 15} ${row - 4} L ${24 + side * 21} ${row + 3}`,
  )).join(' ');
  const plates = Array.from({ length: shell }, (_, index) => {
    const spread = 4 + (index + 1) * 1.5;
    const y = 22 + (index + 1) * 3;
    return `M ${24 - spread} ${y} Q 24 ${y + 4.5} ${24 + spread} ${y}`;
  }).join(' ');
  const svg = svgEl('svg', { viewBox: '0 0 48 48', 'aria-hidden': 'true' });
  svg.classList.add('hunt__bug');
  svg.append(
    svgPath(legs, 1.5),
    svgPath('M 21.5 7.5 Q 16 5.5 14 9.5 M 26.5 7.5 Q 32 5.5 34 9.5', 1.3),
    svgEl('ellipse', { cx: 24, cy: 30, rx: width, ry: depth, fill: 'currentColor', 'fill-opacity': 0.16, stroke: 'currentColor', 'stroke-width': 1.6 }),
    svgEl('ellipse', { cx: 24, cy: 19, rx: 7.5, ry: 7, fill: 'currentColor', 'fill-opacity': 0.16, stroke: 'currentColor', 'stroke-width': 1.6 }),
    svgEl('circle', { cx: 24, cy: 10, r: 4.6, fill: 'currentColor', 'fill-opacity': 0.3, stroke: 'currentColor', 'stroke-width': 1.5 }),
    svgPath(plates, 1.1),
    svgEl('circle', { cx: 22, cy: 9.4, r: 1.05, fill: 'currentColor' }),
    svgEl('circle', { cx: 26, cy: 9.4, r: 1.05, fill: 'currentColor' }),
    svgPath('M 21.5 6.6 L 19.4 3 M 26.5 6.6 L 28.6 3', 1.5),
  );
  if (boss) svg.append(svgPath('M 20.4 8.6 L 15.6 5 M 27.6 8.6 L 32.4 5', 1.6));
  return svg;
}

function facing(from, to) { return Math.atan2(colOf(to) - colOf(from), rowOf(from) - rowOf(to)) * 180 / Math.PI; }

const game = {
  id: 'bug-hunt',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = el('div', 'hunt');
    this.wrap = wrap;

    const readout = el('div', 'hunt__readout');
    this.chips = {};
    for (const [key, label] of [['sector', 'Sector'], ['ammo', 'Ammo'], ['seals', 'Seals']]) {
      const box = el('div', 'hunt__chip'), value = el('strong', 'hunt__chip-value', '—');
      box.append(el('span', 'hunt__chip-label', label), value); readout.append(box);
      this.chips[key] = { box, value };
    }

    const board = el('div', 'hunt__board');
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', 'The station');

    this.cells = [];
    for (let index = 0; index < COLS * ROWS; index += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'hunt__cell';
      cell.disabled = true;
      cell.addEventListener('click', () => this.clickCell(index));
      board.append(cell);
      this.cells.push({ el: cell });
    }

    this.orderEl = el('p', 'hunt__order', '');

    this.fireButton = this.buildAction('Fire', 'fire', 'btn btn--primary hunt__action');
    this.sealButton = this.buildAction('Seal', 'seal', 'btn btn--ghost hunt__action');
    this.holdButton = el('button', 'btn btn--ghost hunt__action', 'Hold');
    this.holdButton.type = 'button';
    this.holdButton.addEventListener('click', () => this.hold());

    const bar = el('div', 'hunt__bar');
    bar.append(this.fireButton, this.sealButton, this.holdButton);

    const hint = el('p', 'hunt__hint', 'Fire down your row or column. Slip rather than trade blows: reaching you ends the sector. An unplated final shot kills it before it attacks; a plated target wastes the round.');

    wrap.append(readout, board, this.orderEl, bar, hint);
    ctx.stage.append(wrap);
  },

  buildAction(label, mode, className) {
    const button = el('button', className, label); button.type = 'button'; button.disabled = true;
    button.addEventListener('click', () => this.arm(mode));
    return button;
  },

  start(ctx) {
    this.ctx = ctx;
    this.alive = true; this.locked = false;
    this.sector = 1; this.bossIndex = 0; this.kills = 0;
    this.ammo = AMMO_START; this.armed = false;

    clearTimeout(this.settle);
    this.dealSector();
  },

  stop() {
    this.alive = false;
    this.locked = true;
    this.phase = 'stopped';
    clearTimeout(this.settle);
    this.paint();
  },

  canAct() { return this.alive === true && this.locked === false && this.phase === 'hunting'; },

  dealSector() {
    this.phase = 'hunting';
    this.isBossSector = this.sector % BOSS_EVERY === 0;

    const armour = this.isBossSector ? Math.min(BOSS_ARMOUR_BASE + BOSS_ARMOUR_STEP * this.bossIndex, BOSS_ARMOUR_MAX)
      : Math.min(1 + Math.floor((this.sector - 1) / 2), ARMOUR_CAP);

    this.hunter = {
      kind: this.isBossSector ? 'boss' : 'strain', label: this.isBossSector ? 'Matriarch' : STRAINS[armour - 1],
      at: NEST, armour, maxArmour: armour, dead: false, plated: false, path: [],
    };
    if (this.isBossSector) this.bossIndex += 1;

    // Start both rooms randomly, at least MIN_START_GAP apart.
    const start = this.pickStartRooms();
    this.player = start.player;
    this.hunter.at = start.hunter;

    this.died = false;
    this.ammo = AMMO_CAP;
    this.sealsLeft = SEALS_PER_SECTOR;
    this.sealed = new Map();
    this.armed = false;
    this.chooseIntents();
    this.paint();

    this.ctx.message(this.isBossSector
      ? `Sector ${this.sector}. A matriarch unfolds in ${ROOMS[this.hunter.at]} — ${armour} plates.`
      : `Sector ${this.sector}. Something is moving in ${ROOMS[this.hunter.at]}.`);
  },

  pickStartRooms() {
    const rooms = [...Array(COLS * ROWS).keys()];

    for (let attempt = 0; attempt < 64; attempt += 1) {
      const player = rooms[Math.floor(this.ctx.rng() * rooms.length)];
      const hunter = rooms[Math.floor(this.ctx.rng() * rooms.length)];
      if (player !== hunter && distance(player, hunter) >= MIN_START_GAP) {
        return { player, hunter };
      }
    }

    return { player: SPINE, hunter: NEST };
  },
  stamina() { return this.hunter.armour / this.hunter.maxArmour; },
  stepToward(from, to) {
    if (from === to) return null;

    const queue = [[from, null]];
    const visited = new Set([from]);

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const [current, first] = queue[cursor];
      for (const door of doorsOf(current)) {
        if (visited.has(door.index) || this.isBlocked(current, door.index)) continue;
        const step = first ?? door.index;
        if (door.index === to) return step;
        visited.add(door.index);
        queue.push([door.index, step]);
      }
    }

    return null;
  },
  planStep(creature) {
    const next = this.stepToward(creature.at, this.player);
    return next === null ? [] : [next];
  },
  isBlocked(first, second) { return this.sealed.has(doorKey(first, second)); },
  chooseIntents() {
    const creature = this.hunter;
    const beside = doorsOf(creature.at).some((door) => door.index === this.player);

    if (creature.kind === 'boss') {
      // The matriarch plates only above half armour, never while beside you.
      creature.plated = beside
        ? false
        : this.stamina() > BOSS_PHASE_SPLIT && this.ctx.rng() < 0.5;
    } else {
      // Approaching creatures are unplated, leaving a firing window.
      creature.plated = beside
        ? false
        : this.sector >= PLATE_FROM_SECTOR && this.ctx.rng() < PLATE_CHANCE;
    }
    creature.path = this.planStep(creature);
    this.describeTurn();
  },
  intentCopy() {
    const creature = this.hunter;

    const destination = creature.path[creature.path.length - 1];
    if (destination === undefined) return creature.plated ? 'plated, holding' : 'holding';

    if (destination === this.player) {
      return creature.plated ? 'plated, and closing on you' : creature.armour === 1
        ? 'closing on you — the last plate, a shot kills it free'
        : 'closing on you — a shot lands, and it will reach you';
    }

    return `${creature.plated ? 'plated, ' : ''}into ${ROOMS[destination]}`;
  },
  describeTurn() { this.orderEl.textContent = `Next — ${this.hunter.label}: ${this.intentCopy()}.`; },
  arm(mode) {
    if (!this.canAct()) return;
    this.armed = this.armed === mode ? false : mode; this.paint();
  },
  hold() {
    if (!this.canAct()) return;
    this.ctx.message('You hold still and listen.'); this.finishTurn();
  },
  clickCell(index) {
    if (!this.canAct()) return;

    const door = doorsOf(this.player).some((entry) => entry.index === index);
    const reach = slipsFrom(this.player).includes(index);
    const inThere = !this.hunter.dead && this.hunter.at === index;
    const lane = inLine(this.player, index);

    if (this.armed === 'seal') return door ? this.seal(index) : this.ctx.message('There is no door that way — seals go on the four sides.');
    if (this.armed === 'fire') return !inThere || !lane
      ? this.ctx.message(inThere ? 'It is out of your line. Get a lane on it.' : 'Nothing to shoot in there.')
      : this.fire();
    if (inThere) {
      if (!lane) return this.ctx.message('It is out of your line — move along the row or the column.');
      this.armed = 'fire';
      this.ctx.message(`${this.hunter.label} in your line. Fire when you mean it.`);
      this.paint();
      return;
    }
    return reach ? this.move(index) : this.ctx.message('One compartment at a time — sides or corners.');
  },

  move(index) {
    if (this.isBlocked(this.player, index)) return this.ctx.message('You barred that door yourself.');
    this.player = index;
    this.ctx.message(`You move to ${ROOMS[index]}.`);
    this.finishTurn();
  },

  seal(index) {
    if (this.sealsLeft <= 0) return this.ctx.message('No seals left this sector.');

    const key = doorKey(this.player, index);
    if (this.sealed.has(key)) return this.ctx.message('That door is already barred.');

    this.sealsLeft -= 1;
    this.sealed.set(key, SEAL_TURNS);
    this.ctx.message(`You put the door between you and ${ROOMS[index]}.`);
    this.finishTurn();
  },

  fire() {
    if (this.ammo <= 0) {
      this.ctx.message('No rounds left. Slip until the next sector.');
      return;
    }

    const creature = this.hunter;
    this.ammo -= 1;

    if (creature.plated) {
      this.ctx.message(`The plating turns the round aside — one wasted, ${plural(this.ammo, 'round')} left.`);
      this.finishTurn();
      return;
    }

    creature.armour -= 1;
    if (creature.armour <= 0) this.kill();
    else this.ctx.message(`${creature.label} hit — ${creature.armour} of ${creature.maxArmour} plates left.`);
    this.finishTurn();
  },

  finishTurn() {
    if (!this.alive || this.phase !== 'hunting') return;

    this.armed = false;
    this.phase = 'resolving';

    if (!this.hunter.dead) this.resolveCreature(this.hunter);

    this.tickSeals();

    if (this.died) return this.taken(this.hunter);
    if (this.hunter.dead) return this.clearSector();

    this.phase = 'hunting';
    this.chooseIntents();
    this.paint();
  },

  resolveCreature(creature) {
    for (const step of creature.path) {
      if (this.isBlocked(creature.at, step)) return this.ctx.message(`It throws itself at the barred door to ${ROOMS[step]}.`);
      creature.at = step;
      if (creature.at === this.player) break;
    }

    if (creature.at === this.player) this.died = true;
  },

  taken(creature) {
    this.phase = 'taken';
    this.ctx.message(`${creature.label} takes you. Sector ${this.sector} is lost — the kills you confirmed are kept, and something else is already moving.`);
    this.paint();

    this.settle = setTimeout(() => {
      if (!this.alive) return;
      this.sector += 1;
      this.dealSector();
    }, DEATH_MS);
  },

  tickSeals() {
    for (const [key, turns] of [...this.sealed]) {
      turns <= 1 ? this.sealed.delete(key) : this.sealed.set(key, turns - 1);
    }
  },

  /** Only confirmed kills score. */
  kill() {
    const creature = this.hunter;
    creature.dead = true;
    this.ammo = Math.min(AMMO_CAP, this.ammo + AMMO_PER_KILL);

    this.kills += 1;
    this.ctx.addPoints(KILL_SCORE);

    this.ctx.message(`${creature.label} confirmed — ${plural(this.kills, 'kill')}.`);
  },

  clearSector() {
    this.phase = 'clearing';
    this.ctx.message(this.isBossSector ? 'The matriarch is dead.' : 'Sector clear. You strip rounds off the body.');
    this.ammo = AMMO_CAP;
    this.paint();

    this.settle = setTimeout(() => {
      if (!this.alive) return;
      this.sector += 1;
      this.dealSector();
    }, SECTOR_MS);
  },

  paint() {
    this.paintReadout(); this.paintBoard(); this.paintActions();
    if (this.phase === 'hunting') this.describeTurn();
  },

  paintReadout() {
    this.chips.sector.value.textContent = this.isBossSector ? `${this.sector} · boss` : String(this.sector);
    this.chips.sector.box.classList.toggle('hunt__chip--boss', Boolean(this.isBossSector));
    this.chips.ammo.value.textContent = `${this.ammo}/${AMMO_CAP}`;
    this.chips.seals.value.textContent = String(this.sealsLeft);
  },

  paintBoard() {
    const open = this.canAct();
    const threatened = this.hunter.path[this.hunter.path.length - 1];
    const linedUp = !this.hunter.dead && inLine(this.player, this.hunter.at);
    const doors = new Set(doorsOf(this.player).map(({ index }) => index));
    const reachable = new Set(slipsFrom(this.player));

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index].el;
      const door = doors.has(index);
      const reach = reachable.has(index);
      const inThere = !this.hunter.dead && this.hunter.at === index;
      const lane = inLine(this.player, index);

      cell.className = 'hunt__cell'; cell.replaceChildren(el('span', 'hunt__room', ROOMS[index]));
      if (index === this.player) cell.classList.add('hunt__cell--here');
      if (index === threatened) cell.classList.add('hunt__cell--threat');
      if (open && reach && !this.armed) cell.classList.add('hunt__cell--reachable');
      if (open && this.armed === 'seal' && door) cell.classList.add('hunt__cell--door');
      if (open && linedUp && lane && index !== this.player) cell.classList.add('hunt__cell--lane');
      if (open && this.armed === 'fire' && linedUp && lane && inThere) cell.classList.add('hunt__cell--target');

      for (const direction of DIRECTIONS) {
        const other = stepIn(index, direction);
        if (other !== null && this.isBlocked(index, other)) cell.append(el('span', `hunt__seal hunt__seal--${direction.id}`));
      }

      if (inThere) {
        cell.classList.add('hunt__cell--creature');
        const figure = el('span', 'hunt__figure');
        const bug = createBug(this.hunter);
        if (this.hunter.plated) bug.classList.add('hunt__bug--plated');
        figure.style.transform = `rotate(${facing(this.hunter.at, this.player)}deg)`;
        figure.append(bug); cell.append(figure);
        const plates = el('span', 'hunt__plates', `${this.hunter.armour}/${this.hunter.maxArmour}`);
        if (this.hunter.plated) plates.classList.add('hunt__plates--plated'); cell.append(plates);
      }
      if (index === this.player) cell.append(el('span', 'hunt__mark hunt__mark--you', 'You'));
      cell.disabled = !open;
      cell.setAttribute('aria-label', this.describeCell(index, inThere, reach, index === threatened));
    }
  },

  describeCell(index, inThere, reach, threatened) {
    return [
      ROOMS[index],
      inThere && `${this.hunter.label}, ${this.hunter.armour} of ${this.hunter.maxArmour} plates${this.hunter.plated ? ', plated' : ''}`,
      index === this.player ? 'you are here' : reach && 'one move away',
      threatened && 'it means to be here next',
    ].filter(Boolean).join('. ');
  },

  paintActions() {
    const open = this.canAct();
    const linedUp = !this.hunter.dead && inLine(this.player, this.hunter.at);

    this.fireButton.disabled = !open || this.ammo <= 0 || !linedUp;
    this.sealButton.disabled = !open || this.sealsLeft <= 0; this.holdButton.disabled = !open;
    this.fireButton.classList.toggle('hunt__action--armed', this.armed === 'fire');
    this.sealButton.classList.toggle('hunt__action--armed', this.armed === 'seal');
  },
};

export default game;
