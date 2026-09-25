/* ---------------------------------------------------------------------------
   Bug Hunt — read it, then act.

   The station is dead and something is aboard. Every turn shows you two facts:
   the compartment it means to be standing in when the turn resolves, and
   whether it is plated. You answer with one action — fire, move, or hold — and
   then it moves.

   The whole game is one trade. The gun fires down a line — anything in your row
   or your column — so a creature crossing your lane can be hit without standing
   inside its reach, and finding a lane with an exit behind it is the whole
   puzzle. A corner buys the longest lane and the fewest ways out — on the edges
   the lane runs further but the options close.

   You walk the corridors and the service hatches; it only walks the corridors. A
   step across a corner puts a compartment between you for the whole of its turn,
   which is the answer to being cornered that does not give up the lane.

   When it is already on top of you the other answer is a door: two seals a
   sector bar a door for two turns, for you as much as for it, and the seal it
   walks into throws its whole turn away.

   Nothing absorbs a hit. If it reaches you the sector is over — the kills you
   have already confirmed are kept, and the next sector opens with both of you in
   new compartments, far apart.

   The score is the body count. Hits, clean fights, cleared sectors and even the
   matriarch are worth nothing on their own, so every decision comes down to one
   question: does this bring me closer to finishing the thing in front of me?

   This table draws its own actions, so the shell hides its single-action bar.
   Nothing is awarded at the bell: every kill is scored the moment it lands.
   --------------------------------------------------------------------------- */

import { el, plural, svgEl, svgPath } from '../dom.js';

const COLS = 4;
const ROWS = 4;

/** The compartments, in reading order — the array doubles as the station map. */
const ROOMS = [
  'Cab', 'Mess', 'Galley', 'Stores',
  'Hold', 'Spine', 'Berth', 'Vault',
  'Cargo', 'Conduit', 'Junction', 'Engine',
  'Cradle', 'Sumps', 'Bilge', 'Nest',
];
const SPINE = 5;
const NEST = 15;

/** How far apart a hunt opens, of a possible six on this grid. */
const MIN_START_GAP = 4;

/** The four ways it can come at you: it only knows the corridors. */
const DIRECTIONS = [
  { id: 'n', dr: -1, dc: 0 },
  { id: 'e', dr: 0, dc: 1 },
  { id: 's', dr: 1, dc: 0 },
  { id: 'w', dr: 0, dc: -1 },
];

/** The eight ways you can go. The diagonals are service hatches: it has to walk
    the corridors, so a step across a corner gains you a room. The edges are the
    cost, because a corner has no diagonal leading away. */
const SLIPS = [
  { id: 'n', dr: -1, dc: 0 },
  { id: 'ne', dr: -1, dc: 1 },
  { id: 'e', dr: 0, dc: 1 },
  { id: 'se', dr: 1, dc: 1 },
  { id: 's', dr: 1, dc: 0 },
  { id: 'sw', dr: 1, dc: -1 },
  { id: 'w', dr: 0, dc: -1 },
  { id: 'nw', dr: -1, dc: -1 },
];

/** One bite and the hunt is over: the sector is lost, what you earned is not. */
const DEATH_MS = 1800;

/** Rounds. Scavenged from a body, topped up at the start of every sector. */
const AMMO_START = 4;
const AMMO_CAP = 8;
const AMMO_PER_KILL = 2;

/** Seals. Two a sector, two turns, and a barred door bars you as well. */
const SEALS_PER_SECTOR = 2;
const SEAL_TURNS = 2;

/** The score. One creature, one kill, and nothing else is counted at all. */
const KILL_SCORE = 1;

/** The strains. Three plates is the ceiling for anything that is not a boss:
    with a reach of one room, a longer fight is only a longer mistake. */
const STRAINS = ['Skitter', 'Crawler', 'Carapace'];
const ARMOUR_CAP = 3;
const PLATE_FROM_SECTOR = 2;
const PLATE_CHANCE = 0.35;

/** A matriarch every third sector: plated while she has the armour for it, then
    open and relentless, with every shot landing. Her plates stop at six, because
    there is no ammo to find inside a boss sector and more plates than a belt
    holds is a fight that cannot be finished. */
const BOSS_EVERY = 3;
const BOSS_ARMOUR_BASE = 4;
const BOSS_ARMOUR_STEP = 2;
const BOSS_ARMOUR_MAX = 6;
const BOSS_PHASE_SPLIT = 0.5;

/** The pause while a lost sector is replaced. */
const SECTOR_MS = 2200;

function rowOf(index) {
  return Math.floor(index / COLS);
}

function colOf(index) {
  return index % COLS;
}

/** The compartment one step away in a direction, or null off the edge. */
function stepIn(index, direction) {
  const row = rowOf(index) + direction.dr;
  const col = colOf(index) + direction.dc;
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  return row * COLS + col;
}

/** Every doorway out of a compartment, with the direction it faces. */
function doorsOf(index) {
  const doors = [];
  for (const direction of DIRECTIONS) {
    const next = stepIn(index, direction);
    if (next !== null) doors.push({ id: direction.id, index: next });
  }
  return doors;
}

/** Every compartment the player can step to, diagonals included. */
function slipsFrom(index) {
  const found = [];
  for (const slip of SLIPS) {
    const next = stepIn(index, slip);
    if (next !== null) found.push(next);
  }
  return found;
}

/** A door belongs to the pair of compartments it joins, in either direction. */
function doorKey(first, second) {
  return first < second ? `${first}:${second}` : `${second}:${first}`;
}

function distance(first, second) {
  return Math.abs(rowOf(first) - rowOf(second)) + Math.abs(colOf(first) - colOf(second));
}

/** True when two compartments share a row or a column — a clear line of fire. */
function inLine(first, second) {
  return rowOf(first) === rowOf(second) || colOf(first) === colOf(second);
}

/**
 * The creature, drawn rather than spelled out: one shell plate for every point
 * of armour it has left, six legs — eight on a matriarch — antennae and
 * mandibles. The plates are why it is a drawing at all: what is left of its
 * armour should be countable from across the board.
 */
function createBug(creature) {
  const boss = creature.kind === 'boss';
  const shell = Math.max(1, Math.min(creature.armour, 4));
  const width = 7.5 + shell * 1.3;
  const depth = 9 + shell * 0.9;

  const svg = svgEl('svg', { viewBox: '0 0 48 48' });
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('hunt__bug');

  // Legs first, so the body sits over the joints.
  const rows = boss ? [14, 20, 26, 32] : [16, 22, 28];
  for (const row of rows) {
    for (const side of [1, -1]) {
      const joint = 24 + side * 6;
      const knee = 24 + side * 15;
      const foot = 24 + side * 21;
      svg.append(svgPath(`M ${joint} ${row} L ${knee} ${row - 4} L ${foot} ${row + 3}`, 1.5));
    }
  }

  svg.append(svgPath('M 21.5 7.5 Q 16 5.5 14 9.5', 1.3));
  svg.append(svgPath('M 26.5 7.5 Q 32 5.5 34 9.5', 1.3));

  // Abdomen, thorax, head: the shell widens with the armour it is carrying.
  svg.append(svgEl('ellipse', {
    cx: 24, cy: 30, rx: width, ry: depth,
    fill: 'currentColor', 'fill-opacity': 0.16,
    stroke: 'currentColor', 'stroke-width': 1.6,
  }));
  svg.append(svgEl('ellipse', {
    cx: 24, cy: 19, rx: 7.5, ry: 7,
    fill: 'currentColor', 'fill-opacity': 0.16,
    stroke: 'currentColor', 'stroke-width': 1.6,
  }));
  svg.append(svgEl('circle', {
    cx: 24, cy: 10, r: 4.6,
    fill: 'currentColor', 'fill-opacity': 0.3,
    stroke: 'currentColor', 'stroke-width': 1.5,
  }));

  // One plate per point of armour, arcing across the back.
  for (let plate = 1; plate <= shell; plate += 1) {
    const spread = 4 + plate * 1.5;
    const y = 22 + plate * 3;
    svg.append(svgPath(`M ${24 - spread} ${y} Q 24 ${y + 4.5} ${24 + spread} ${y}`, 1.1));
  }

  svg.append(svgEl('circle', { cx: 22, cy: 9.4, r: 1.05, fill: 'currentColor' }));
  svg.append(svgEl('circle', { cx: 26, cy: 9.4, r: 1.05, fill: 'currentColor' }));
  svg.append(svgPath('M 21.5 6.6 L 19.4 3', 1.5));
  svg.append(svgPath('M 26.5 6.6 L 28.6 3', 1.5));

  // A matriarch carries a second, longer pair.
  if (boss) {
    svg.append(svgPath('M 20.4 8.6 L 15.6 5', 1.6));
    svg.append(svgPath('M 27.6 8.6 L 32.4 5', 1.6));
  }

  return svg;
}

/** Which way a creature looks, in degrees, so it always faces the player. */
function facing(from, to) {
  const dr = rowOf(to) - rowOf(from);
  const dc = colOf(to) - colOf(from);
  return (Math.atan2(dc, -dr) * 180) / Math.PI;
}

const game = {
  id: 'bug-hunt',

  /* ------------------------------------------------------------------ mount */

  mount(ctx) {
    this.ctx = ctx;

    const wrap = el('div', 'hunt');
    this.wrap = wrap;

    const readout = el('div', 'hunt__readout');
    this.chips = {};
    for (const [key, label] of [
      ['sector', 'Sector'],
      ['hunter', 'Hunter'],
      ['ammo', 'Ammo'],
      ['seals', 'Seals'],
      ['kills', 'Kills'],
    ]) {
      const box = el('div', 'hunt__chip');
      const value = el('strong', 'hunt__chip-value', '—');
      box.append(el('span', 'hunt__chip-label', label), value);
      readout.append(box);
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

    const hint = el(
      'p',
      'hunt__hint',
      'The gun fires down your row or your column, so get a lane rather than standing in its reach. If it reaches you the sector is over, so slip rather than trade. The shot that empties its plates kills it before it lands, and a plated one only wastes the round.',
    );

    wrap.append(readout, board, this.orderEl, bar, hint);
    ctx.stage.append(wrap);
  },

  buildAction(label, mode, className) {
    const button = el('button', className, label);
    button.type = 'button';
    button.disabled = true;
    button.addEventListener('click', () => this.arm(mode));
    return button;
  },

  /* -------------------------------------------------------------- lifecycle */

  start(ctx) {
    this.ctx = ctx;
    this.alive = true;
    this.locked = false;

    this.sector = 1;
    this.bossIndex = 0;
    this.kills = 0;
    this.ammo = AMMO_START;
    this.armed = false;

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

  canAct() {
    return this.alive === true && this.locked === false && this.phase === 'hunting';
  },

  /* --------------------------------------------------------------- a sector */

  dealSector() {
    this.phase = 'hunting';
    this.isBossSector = this.sector % BOSS_EVERY === 0;

    const armour = this.isBossSector
      ? Math.min(BOSS_ARMOUR_BASE + BOSS_ARMOUR_STEP * this.bossIndex, BOSS_ARMOUR_MAX)
      : Math.min(1 + Math.floor((this.sector - 1) / 2), ARMOUR_CAP);

    this.hunter = {
      kind: this.isBossSector ? 'boss' : 'strain',
      label: this.isBossSector ? 'Matriarch' : STRAINS[armour - 1],
      at: NEST,
      armour,
      maxArmour: armour,
      dead: false,
      plated: false,
      path: [],
    };
    if (this.isBossSector) this.bossIndex += 1;

    // Both rooms drawn at random, never closer than MIN_START_GAP, so no sector
    // opens with it at your door and none opens the same way twice.
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

  /** Two rooms far enough apart to open a hunt in, drawn from the run's rng. */
  pickStartRooms() {
    const rooms = [];
    for (let index = 0; index < COLS * ROWS; index += 1) rooms.push(index);

    for (let attempt = 0; attempt < 64; attempt += 1) {
      const player = rooms[Math.floor(this.ctx.rng() * rooms.length)];
      const hunter = rooms[Math.floor(this.ctx.rng() * rooms.length)];
      if (player !== hunter && distance(player, hunter) >= MIN_START_GAP) {
        return { player, hunter };
      }
    }

    // Sixteen rooms can always satisfy that, so this is only belt and braces.
    return { player: SPINE, hunter: NEST };
  },

  /* ------------------------------------------------------------- telegraphs */

  stamina() {
    return this.hunter.armour / this.hunter.maxArmour;
  },

  /** The next compartment along the shortest route that is not barred. */
  stepToward(from, to) {
    if (from === to) return null;

    const queue = [from];
    const previous = new Map([[from, null]]);

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      for (const door of doorsOf(current)) {
        if (previous.has(door.index) || this.isBlocked(current, door.index)) continue;
        previous.set(door.index, current);
        queue.push(door.index);
      }
    }

    if (!previous.has(to)) return null;

    let step = to;
    while (previous.get(step) !== from) step = previous.get(step);
    return step;
  },

  /** Where it will be standing when the turn resolves. */
  planStep(creature) {
    const next = this.stepToward(creature.at, this.player);
    return next === null ? [] : [next];
  },

  /** A barred door is barred both ways, for the player as much as for it. */
  isBlocked(first, second) {
    return this.sealed.has(doorKey(first, second));
  },

  chooseIntents() {
    const creature = this.hunter;
    const beside = doorsOf(creature.at).some((door) => door.index === this.player);

    if (creature.kind === 'boss') {
      // Above half her armour she hides behind plating; below it she stops
      // hiding and comes, and every shot lands. She is never plated while beside
      // you — the same window the strains get, and now a fatal one to deny.
      creature.plated = beside
        ? false
        : this.stamina() > BOSS_PHASE_SPLIT && this.ctx.rng() < 0.5;
      creature.path = this.planStep(creature);
      this.describeTurn();
      return;
    }

    // A creature that is coming for you is never plated: the turn it commits is
    // always a firing window, which is what makes a death your own mis-tempo.
    creature.plated = beside
      ? false
      : this.sector >= PLATE_FROM_SECTOR && this.ctx.rng() < PLATE_CHANCE;
    creature.path = this.planStep(creature);

    this.describeTurn();
  },

  /** Where it means to be, and what that means for you. */
  intentCopy() {
    const creature = this.hunter;

    const destination = creature.path[creature.path.length - 1];
    if (destination === undefined) return creature.plated ? 'plated, holding' : 'holding';

    if (destination === this.player) {
      if (creature.plated) return 'plated, and closing on you';
      return creature.armour === 1
        ? 'closing on you — the last plate, a shot kills it free'
        : 'closing on you — a shot lands, and it will reach you';
    }

    return `${creature.plated ? 'plated, ' : ''}into ${ROOMS[destination]}`;
  },

  describeTurn() {
    this.orderEl.textContent = `Next — ${this.hunter.label}: ${this.intentCopy()}.`;
  },

  /* ------------------------------------------------------------ player turns */

  arm(mode) {
    if (!this.canAct()) return;
    this.armed = this.armed === mode ? false : mode;
    this.paint();
  },

  hold() {
    if (!this.canAct()) return;
    this.ctx.message('You hold still and listen.');
    this.finishTurn();
  },

  clickCell(index) {
    if (!this.canAct()) return;

    const door = doorsOf(this.player).some((entry) => entry.index === index);
    const reach = slipsFrom(this.player).includes(index);
    const inThere = !this.hunter.dead && this.hunter.at === index;
    const lane = inLine(this.player, index);

    if (this.armed === 'seal') {
      if (!door) {
        this.ctx.message('There is no door that way — seals go on the four sides.');
        return;
      }
      this.seal(index);
      return;
    }

    if (this.armed === 'fire') {
      if (!inThere) {
        this.ctx.message('Nothing to shoot in there.');
        return;
      }
      if (!lane) {
        this.ctx.message('It is out of your line. Get a lane on it.');
        return;
      }
      this.fire();
      return;
    }

    // Unarmed: it in your lane arms the gun, a neighbouring compartment is a
    // step, and anything else is neither.
    if (inThere) {
      if (!lane) {
        this.ctx.message('It is out of your line — move along the row or the column.');
        return;
      }
      this.armed = 'fire';
      this.ctx.message(`${this.hunter.label} in your line. Fire when you mean it.`);
      this.paint();
      return;
    }

    if (!reach) {
      this.ctx.message('One compartment at a time — sides or corners.');
      return;
    }

    this.move(index);
  },

  move(index) {
    if (this.isBlocked(this.player, index)) {
      this.ctx.message('You barred that door yourself.');
      return;
    }

    this.player = index;
    this.ctx.message(`You move to ${ROOMS[index]}.`);
    this.finishTurn();
  },

  /**
   * The defensive read: bar the door it means to come through and its whole turn
   * is thrown away, without giving up the lane you are holding.
   */
  seal(index) {
    if (this.sealsLeft <= 0) {
      this.ctx.message('No seals left this sector.');
      return;
    }

    const key = doorKey(this.player, index);
    if (this.sealed.has(key)) {
      this.ctx.message('That door is already barred.');
      return;
    }

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

    if (creature.armour <= 0) {
      this.kill();
      this.finishTurn();
      return;
    }

    this.ctx.message(`${creature.label} hit — ${creature.armour} of ${creature.maxArmour} plates left.`);
    this.finishTurn();
  },

  /* -------------------------------------------------------------- resolution */

  finishTurn() {
    if (!this.alive || this.phase !== 'hunting') return;

    this.armed = false;
    this.phase = 'resolving';

    if (!this.hunter.dead) this.resolveCreature(this.hunter);

    this.tickSeals();

    if (this.died) {
      this.taken(this.hunter);
      return;
    }

    if (this.hunter.dead) {
      this.clearSector();
      return;
    }

    this.phase = 'hunting';
    this.chooseIntents();
    this.paint();
  },

  resolveCreature(creature) {
    for (const step of creature.path) {
      if (this.isBlocked(creature.at, step)) {
        this.ctx.message(`It throws itself at the barred door to ${ROOMS[step]}.`);
        return;
      }
      creature.at = step;
      if (creature.at === this.player) break;
    }

    if (creature.at === this.player) this.died = true;
  },

  /** It has you: the sector is over, and the hunt moves on without it. */
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
      if (turns <= 1) this.sealed.delete(key);
      else this.sealed.set(key, turns - 1);
    }
  },

  /* -------------------------------------------------------- a kill, a body */

  /**
   * The score is the body count and nothing else: no points for hitting it, for
   * keeping it off you, for clearing a sector or for the matriarch. That is the
   * read the table already turns on — what pays is finishing it — so there is
   * nothing here to farm and nothing to lose but the sector.
   */
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

    this.ctx.message(this.isBossSector
      ? 'The matriarch is dead.'
      : 'Sector clear. You strip rounds off the body.');

    this.ammo = AMMO_CAP;
    this.paint();

    this.settle = setTimeout(() => {
      if (!this.alive) return;
      this.sector += 1;
      this.dealSector();
    }, SECTOR_MS);
  },

  /* ---------------------------------------------------------------- painting */

  paint() {
    this.paintReadout();
    this.paintBoard();
    this.paintActions();
    if (this.phase === 'hunting') this.describeTurn();
  },

  paintReadout() {
    this.chips.sector.value.textContent = this.isBossSector ? `${this.sector} · boss` : String(this.sector);
    this.chips.sector.box.classList.toggle('hunt__chip--boss', Boolean(this.isBossSector));

    this.chips.hunter.value.textContent = `${this.hunter.label} ${this.hunter.armour}/${this.hunter.maxArmour}`;
    this.chips.hunter.box.classList.toggle('hunt__chip--plated', Boolean(this.hunter.plated));

    this.chips.ammo.value.textContent = `${this.ammo}/${AMMO_CAP}`;
    this.chips.seals.value.textContent = String(this.sealsLeft);
    this.chips.kills.value.textContent = String(this.kills);
  },

  paintBoard() {
    const open = this.canAct();
    const threatened = this.hunter.path[this.hunter.path.length - 1];
    const linedUp = !this.hunter.dead && inLine(this.player, this.hunter.at);

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index].el;
      const door = doorsOf(this.player).some((entry) => entry.index === index);
      const reach = slipsFrom(this.player).includes(index);
      const inThere = !this.hunter.dead && this.hunter.at === index;
      const lane = inLine(this.player, index);

      cell.className = 'hunt__cell';
      cell.replaceChildren(el('span', 'hunt__room', ROOMS[index]));

      if (index === this.player) cell.classList.add('hunt__cell--here');
      if (index === threatened) cell.classList.add('hunt__cell--threat');
      if (open && reach && !this.armed) cell.classList.add('hunt__cell--reachable');
      if (open && this.armed === 'seal' && door) cell.classList.add('hunt__cell--door');
      // The lane lights whenever the thing is in it, so the rule teaches itself.
      if (open && linedUp && lane && index !== this.player) cell.classList.add('hunt__cell--lane');
      if (open && this.armed === 'fire' && linedUp && lane && inThere) cell.classList.add('hunt__cell--target');

      // A barred door is drawn on the edge it sits in, as its own element, so
      // four bars and a threat ring can all show at once.
      for (const direction of DIRECTIONS) {
        const other = stepIn(index, direction);
        if (other === null) continue;
        if (this.isBlocked(index, other)) cell.append(el('span', `hunt__seal hunt__seal--${direction.id}`));
      }

      if (inThere) {
        cell.classList.add('hunt__cell--creature');

        const figure = el('span', 'hunt__figure');
        const bug = createBug(this.hunter);
        if (this.hunter.plated) bug.classList.add('hunt__bug--plated');
        figure.style.transform = `rotate(${facing(this.hunter.at, this.player)}deg)`;
        figure.append(bug);
        cell.append(figure);

        const plates = el('span', 'hunt__plates', `${this.hunter.armour}/${this.hunter.maxArmour}`);
        if (this.hunter.plated) plates.classList.add('hunt__plates--plated');
        cell.append(plates);
      }

      if (index === this.player) cell.append(el('span', 'hunt__mark hunt__mark--you', 'You'));

      cell.disabled = !open;
      cell.setAttribute('aria-label', this.describeCell(index, inThere, reach, index === threatened));
    }
  },

  describeCell(index, inThere, reach, threatened) {
    const parts = [ROOMS[index]];

    if (inThere) {
      parts.push(`${this.hunter.label}, ${this.hunter.armour} of ${this.hunter.maxArmour} plates${this.hunter.plated ? ', plated' : ''}`);
    }
    if (index === this.player) parts.push('you are here');
    else if (reach) parts.push('one move away');
    if (threatened) parts.push('it means to be here next');

    return parts.join('. ');
  },

  paintActions() {
    const open = this.canAct();
    const linedUp = !this.hunter.dead && inLine(this.player, this.hunter.at);

    this.fireButton.disabled = !open || this.ammo <= 0 || !linedUp;
    this.sealButton.disabled = !open || this.sealsLeft <= 0;
    this.holdButton.disabled = !open;

    this.fireButton.classList.toggle('hunt__action--armed', this.armed === 'fire');
    this.sealButton.classList.toggle('hunt__action--armed', this.armed === 'seal');
  },
};

export default game;
