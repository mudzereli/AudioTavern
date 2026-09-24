/* ---------------------------------------------------------------------------
   Escape the Hold — find the open hatch.

  A freshly generated maze of cargo passages. A pursuer enters after the first
  move and follows through the passages, so lingering or backtracking too long
  can end the round before the player reaches the hatch.
   --------------------------------------------------------------------------- */

const COLS = 5;
const ROWS = 5;
const START = (ROWS - 1) * COLS + Math.floor(COLS / 2);
const EXIT = Math.floor(COLS / 2);
const BEAT_MS = 950;
const CHASE_MS = 1000;
const MIN_CHASE_MS = 0;
const ESCAPE_SPEEDUP = 1.1;

const DIRECTIONS = [
  { id: 'north', label: 'North', dr: -1, dc: 0, opposite: 'south' },
  { id: 'east', label: 'East', dr: 0, dc: 1, opposite: 'west' },
  { id: 'south', label: 'South', dr: 1, dc: 0, opposite: 'north' },
  { id: 'west', label: 'West', dr: 0, dc: -1, opposite: 'east' },
];

function adjacent(index, direction) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const nextRow = row + direction.dr;
  const nextCol = col + direction.dc;

  if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS) return null;
  return nextRow * COLS + nextCol;
}

function createMaze(rng) {
  const passages = Array.from({ length: COLS * ROWS }, () => new Set());
  const visited = new Set([START]);
  const stack = [START];

  // Randomized depth-first carving makes a perfect maze: one route between
  // any two cells, and therefore an assured route from entrance to hatch.
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const choices = DIRECTIONS
      .map((direction) => ({ direction, next: adjacent(current, direction) }))
      .filter(({ next }) => next !== null && !visited.has(next));

    if (choices.length === 0) {
      stack.pop();
      continue;
    }

    const choice = choices[Math.floor(rng() * choices.length)];
    passages[current].add(choice.direction.id);
    passages[choice.next].add(choice.direction.opposite);
    visited.add(choice.next);
    stack.push(choice.next);
  }

  return passages;
}

function nextStepToward(start, target, passages) {
  if (start === target) return start;

  const queue = [start];
  const previous = new Map([[start, null]]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const direction of DIRECTIONS) {
      if (!passages[current].has(direction.id)) continue;
      const next = adjacent(current, direction);
      if (previous.has(next)) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }

  if (!previous.has(target)) return start;
  let step = target;
  while (previous.get(step) !== start) step = previous.get(step);
  return step;
}

const game = {
  id: 'escape-hold',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'hold';

    const readout = document.createElement('div');
    readout.className = 'hold__readout';

    const streak = document.createElement('div');
    streak.className = 'hold__stat';
    const streakLabel = document.createElement('span');
    streakLabel.className = 'hold__stat-label';
    streakLabel.textContent = 'Escape streak';
    this.streakValue = document.createElement('strong');
    this.streakValue.className = 'hold__stat-value';
    this.streakValue.textContent = '0';
    streak.append(streakLabel, this.streakValue);

    const best = document.createElement('div');
    best.className = 'hold__stat';
    const bestLabel = document.createElement('span');
    bestLabel.className = 'hold__stat-label';
    bestLabel.textContent = 'Best streak';
    this.bestValue = document.createElement('strong');
    this.bestValue.className = 'hold__stat-value hold__stat-value--quiet';
    this.bestValue.textContent = '0';
    best.append(bestLabel, this.bestValue);

    const pursuit = document.createElement('div');
    pursuit.className = 'hold__stat';
    const pursuitLabel = document.createElement('span');
    pursuitLabel.className = 'hold__stat-label';
    pursuitLabel.textContent = 'Pursuer';
    this.pursuitValue = document.createElement('strong');
    this.pursuitValue.className = 'hold__stat-value hold__stat-value--quiet';
    this.pursuitValue.textContent = 'normal';
    pursuit.append(pursuitLabel, this.pursuitValue);

    readout.append(streak, best, pursuit);

    this.board = document.createElement('div');
    this.board.className = 'hold__board';
    this.board.setAttribute('role', 'group');
    this.board.setAttribute('aria-label', 'Cargo hold maze');

    this.cells = [];
    for (let index = 0; index < COLS * ROWS; index += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'hold__cell';
      cell.addEventListener('click', () => this.move(index));
      this.board.append(cell);
      this.cells.push(cell);
    }

    wrap.append(readout, this.board);
    ctx.stage.append(wrap);

    document.addEventListener('keydown', (event) => {
      if (!this.alive || this.locked) return;
      const direction = {
        ArrowUp: 'north',
        ArrowRight: 'east',
        ArrowDown: 'south',
        ArrowLeft: 'west',
      }[event.key];
      if (!direction) return;

      const destination = this.neighbour(this.position, direction);
      if (destination === null || !this.passages[this.position].has(direction)) return;

      event.preventDefault();
      this.move(destination);
    });
  },

  start(ctx) {
    this.alive = true;
    this.successfulEscapes = 0;
    this.bestStreak = 0;
    this.newRound(ctx);
  },

  stop() {
    this.alive = false;
    this.locked = true;
    clearTimeout(this.beat);
    clearInterval(this.chaseTimer);
  },

  neighbour(index, directionId) {
    const direction = DIRECTIONS.find((entry) => entry.id === directionId);
    return direction ? adjacent(index, direction) : null;
  },

  newRound(ctx) {
    clearInterval(this.chaseTimer);
    this.locked = false;
    this.position = START;
    this.passages = createMaze(ctx.rng);
    this.visited = new Set([START]);
    this.chaseActive = false;
    this.pursuerPosition = START;

    this.paint();
    ctx.message('Find the hatch. Each escape is worth one more point than the last; being caught starts the count again.');
  },

  paint() {
    this.cells.forEach((cell, index) => {
      const openings = this.passages[index];
      const canMoveHere = DIRECTIONS.some((direction) => {
        const next = adjacent(this.position, direction);
        return next === index && this.passages[this.position].has(direction.id);
      });
      const atEntrance = index === START;
      const atExit = index === EXIT;
      const atPlayer = index === this.position;
      const atPursuer = this.chaseActive && index === this.pursuerPosition;

      cell.className = 'hold__cell';
      cell.disabled = !canMoveHere || this.locked;
      cell.classList.toggle('hold__cell--visited', this.visited.has(index));
      cell.classList.toggle('hold__cell--player', atPlayer);
      cell.classList.toggle('hold__cell--exit', atExit);
      cell.classList.toggle('hold__cell--entrance', atEntrance);
      cell.classList.toggle('hold__cell--pursuer', atPursuer);

      for (const direction of DIRECTIONS) {
        if (openings.has(direction.id)) cell.classList.add(`hold__cell--open-${direction.id}`);
      }

      if (atPlayer) cell.textContent = '\u25c6';
      else if (atPursuer) cell.textContent = '!';
      else if (atExit) cell.textContent = 'HATCH';
      else if (atEntrance) cell.textContent = '\u25c7';
      else cell.textContent = this.visited.has(index) ? '\u00b7' : '';

      const labels = [];
      if (atPlayer) labels.push('your position');
      if (atPursuer) labels.push('pursuer');
      if (atEntrance) labels.push('entrance');
      if (atExit) labels.push('open hatch');
      if (this.visited.has(index)) labels.push('visited');
      const openLabels = DIRECTIONS.filter((direction) => openings.has(direction.id)).map((direction) => direction.label);
      if (openLabels.length) labels.push(`passages ${openLabels.join(', ')}`);
      cell.setAttribute('aria-label', `Row ${Math.floor(index / COLS) + 1}, column ${index % COLS + 1}: ${labels.join('; ') || 'cargo bay'}`);
    });

    this.paintStreak();
  },

  paintStreak() {
    const streak = this.successfulEscapes ?? 0;
    const best = Math.max(this.bestStreak ?? 0, streak);
    const faster = Math.round((1 - 1 / ESCAPE_SPEEDUP ** streak) * 100);
    this.streakValue.textContent = String(streak);
    this.bestValue.textContent = String(best);
    this.pursuitValue.textContent = faster > 0 ? `+${faster}% faster` : 'normal';
    this.streakValue.classList.toggle('hold__stat-value--hot', streak >= 3);
  },

  move(destination) {
    if (!this.alive || this.locked) return;

    const direction = DIRECTIONS.find((entry) => adjacent(this.position, entry) === destination);
    if (!direction || !this.passages[this.position].has(direction.id)) return;

    this.position = destination;
    const firstVisit = !this.visited.has(destination);
    this.visited.add(destination);
    // Exploring no longer scores: the only points come from getting out.

    if (destination === EXIT) {
      this.locked = true;
      this.successfulEscapes += 1;
      const record = this.successfulEscapes > (this.bestStreak ?? 0);
      this.bestStreak = Math.max(this.bestStreak ?? 0, this.successfulEscapes);
      // The streak is the score: the first escape is worth 1, the next 2, and so on.
      this.ctx.addPoints(this.successfulEscapes);
      this.paint();
      this.ctx.message(`Hatch found. Escape streak ${this.successfulEscapes}${record ? ', best yet' : ''}, worth ${this.successfulEscapes} point${this.successfulEscapes === 1 ? '' : 's'}. The pursuer is quicker next round.`);
      this.settle();
      return;
    }

    if (!this.chaseActive) {
      this.chaseActive = true;
      this.pursuerPosition = START;
      const chaseInterval = Math.max(
        MIN_CHASE_MS,
        CHASE_MS / ESCAPE_SPEEDUP ** this.successfulEscapes,
      );
      this.chaseTimer = setInterval(() => this.advancePursuer(), chaseInterval);
    }

    this.paint();
    this.ctx.message(`${firstVisit ? 'Passage found.' : 'Back through a familiar passage.'} The pursuer is on your trail. Move quickly!`);
  },

  advancePursuer() {
    if (!this.alive || this.locked || !this.chaseActive || document.hidden) return;

    this.pursuerPosition = nextStepToward(this.pursuerPosition, this.position, this.passages);
    if (this.pursuerPosition === this.position) {
      const streakLost = this.successfulEscapes;
      this.locked = true;
      this.successfulEscapes = 0;
      clearInterval(this.chaseTimer);
      this.paint();
      this.ctx.message(streakLost > 0
        ? `Caught in the hold. A streak of ${streakLost} ends, so the next escape is worth 1 point again.`
        : 'Caught in the hold. The next escape starts a new count at 1 point.');
      this.settle();
      return;
    }

    this.paint();
    this.ctx.message('The pursuer advances. Keep moving toward the hatch!');
  },

  settle() {
    clearTimeout(this.beat);
    clearInterval(this.chaseTimer);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(this.ctx);
    }, BEAT_MS);
  },
};

export default game;