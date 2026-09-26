/* ---------------------------------------------------------------------------
   Assassin's Bazaar — work out which of the crowd the broker means.

   The broker never gives a name. A whisper is two or three clauses, every one of
   which fits several people on its own, so the mark has to be narrowed by
   elimination: whoever fits all of it, and only them, is the mark. Sometimes it
   fits nobody, and then the answer is the "Not here" button.

   Nothing is timed, nothing is tracked, and no description is printed unless it
   is provably fair: one match or none, with every clause carrying its weight.
   --------------------------------------------------------------------------- */

import { el, svgEl, svgPath } from '../dom.js';
import { pick, randInt, shuffle } from '../rng.js';

const HOODS = [
  { name: 'red', color: '#bb4d43' },
  { name: 'ochre', color: '#c18b3b' },
  { name: 'teal', color: '#3c938b' },
  { name: 'blue', color: '#527bb3' },
  { name: 'plum', color: '#946295' },
  { name: 'green', color: '#62834e' },
  { name: 'black', color: '#333237' },
  { name: 'white', color: '#d6cdbb' },
  { name: 'rose', color: '#b96878' },
];

const GOODS = [
  { name: 'a lantern', icon: 'M8 8h8l1 3v8H7v-8l1-3Zm2 0V5h4v3M7 12h10M10 15h4M9 19v2h6v-2' },
  { name: 'a scroll', icon: 'M8 5h8v14H8a2 2 0 0 1 0-4h8M8 5a2 2 0 0 0 0 4h8M11 12h3' },
  { name: 'a dagger', icon: 'm12 3 4 10-4 2-4-2 4-10Zm0 12v6m-3-3h6' },
  { name: 'a basket', icon: 'm5 10 2 10h10l2-10H5Zm2 0 2-5m8 5-2-5M9 11v8m6-8v8m-9-4h12' },
  { name: 'a bottle', icon: 'M10 4h4v4l2 2v10H8V10l2-2V4Zm0 3h4m-6 6h12' },
  { name: 'a flower', icon: 'M12 11c-4-5 2-8 2-3 4-5 7 1 1 3 6 2 2 7-2 2 0 7-6 5-2 0-5 4-8-2-2-3-6-1-4-7 1-3 1-6 7-6 3Zm0 3v8m0-4-3-2m3 4 3-2' },
  { name: 'a key', icon: 'M14 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-1 3 7 7-2 2-2-2-2 2-2-2 2-2-3-3' },
  // Was a fan, but a ribbed lens reads as a flower at 25px; a crier's bell does not.
  { name: 'a bell', icon: 'M7 16a5 5 0 0 1 10 0v2H7v-2ZM5 18h14M10 18a2 2 0 0 0 4 0M12 11V9M10.4 7.4a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 1 1-3.2 0' },
  { name: 'a map', icon: 'm4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Zm5-2v14m6-12v14m-4-7 2-2 2 1' },
];

/* The dials: how often the description fits nobody, how often a job plants a
   decoy, and how many clean reads before the market fills. */
const ABSENT_SHARE = 1 / 6;
const NEAR_MISS_SHARE = 1 / 3;
const STAGE_2_MARKS = 12;
const STAGE_3_MARKS = 30;

const BASE_MARKS = 1;
const BEAT_MS = 850;
const CROWD_SIZE = 9;
const HOODS_PER_CROWD = 4;
const GOODS_PER_CROWD = 6;

/* A clause has to carry its weight: narrower than the first bound and it names
   the mark on its own, wider than the second and it is only saying "one of the
   crowd". */
const MIN_CLAUSE_MATCHES = 2;
const MAX_CLAUSE_MATCHES = CROWD_SIZE - 2;

/** The clause kinds that make a decoy a decoy rather than a figure to rule out. */
const TRAP_KINDS = new Set(['place', 'rel']);

/** A description is searched for rather than dialled in, so cap the search. */
const CROWD_TRIES = 30;

const JOB_HINT = 'Pick whoever fits every clause of the whisper — or say they never came.';
const STAGE_LINES = {
  2: 'The market fills: the broker has started whispering three things at once.',
  3: 'The market turns: now the broker describes them by where they stand.',
};

const ROW_NAMES = ['top row', 'middle row', 'bottom row'];
const ROW_WORDS = ['in the top row', 'in the middle row', 'in the bottom row'];
const COL_NAMES = ['left', 'middle', 'right'];
const SIDE_WORDS = { 0: 'on the left', 2: 'on the right' };

const rowOf = (index) => Math.floor(index / 3);
const colOf = (index) => index % 3;
const pairKey = (hood, good) => `${hood.name}|${good.name}`;
const whereWords = (index) => `${ROW_NAMES[rowOf(index)]}, ${COL_NAMES[colOf(index)]}`;

/**
 * Nine people, every one a distinct hood-and-good pair, with every hood and good
 * in play carried by two or three of them. Those duplicates are the whole game:
 * they are what stops one clause naming a person on its own, so the whisper has
 * to be narrowed by elimination instead of spotted.
 *
 * Two matchings of hoods to goods do the doubling, and a ninth person lifts one
 * hood and one good to three. A good left at one carrier is kept out of clauses
 * and used only to point with: "the one carrying the map" is one person.
 */
function buildCrowd(rng) {
  const hoods = shuffle(rng, HOODS).slice(0, HOODS_PER_CROWD);
  const goods = shuffle(rng, GOODS).slice(0, GOODS_PER_CROWD);
  const shift = randInt(rng, 1, GOODS_PER_CROWD - 1);
  const pairs = [];

  for (let index = 0; index < HOODS_PER_CROWD; index += 1) {
    pairs.push({ hood: hoods[index], good: goods[index] });
    pairs.push({ hood: hoods[index], good: goods[(index + shift) % GOODS_PER_CROWD] });
  }

  // Adding to an already-doubled good leaves every singly-carried good single,
  // which is what the pointing clauses need.
  const extraHood = hoods[randInt(rng, 0, HOODS_PER_CROWD - 1)];
  const spoken = new Set(pairs.filter((pair) => pair.hood === extraHood).map((pair) => pair.good));
  const counts = new Map();
  for (const pair of pairs) counts.set(pair.good, (counts.get(pair.good) || 0) + 1);
  const free = goods.filter((good) => !spoken.has(good));
  const doubled = free.filter((good) => counts.get(good) >= 2);

  pairs.push({ hood: extraHood, good: pick(rng, doubled.length ? doubled : free) });

  return shuffle(rng, pairs).map((pair, index) => ({ ...pair, index }));
}

/* -------------------------------------------------------------- the clauses */

/** A clause is a predicate plus the two ways of saying it out loud: `text` as the
    broker whispers it, `against` as the reason a figure is ruled out by it. */
const clause = (kind, text, against, fits) => ({ kind, text, against, fits });

const hoodClause = (hood, yes = true) => clause(
  'hood',
  `${yes ? '' : 'not '}a ${hood.name} hood`,
  `they are ${yes ? 'not ' : ''}in a ${hood.name} hood`,
  (person) => (person.hood === hood) === yes,
);

const goodClause = (good, yes = true) => clause(
  'good',
  `${yes ? '' : 'not '}carrying ${good.name}`,
  `they are ${yes ? 'not ' : ''}carrying ${good.name}`,
  (person) => (person.good === good) === yes,
);

const rowClause = (row) => clause(
  'place',
  ROW_WORDS[row],
  `they are not ${ROW_WORDS[row]}`,
  (person) => rowOf(person.index) === row,
);

const sideClause = (col) => clause(
  'place',
  SIDE_WORDS[col],
  `they are not ${SIDE_WORDS[col]}`,
  (person) => colOf(person.index) === col,
);

/** Both places true of this slot. Rows and sides are never mixed in one
    description — together they would name a single cell. */
function placeClauses(subject) {
  const row = rowOf(subject.index);
  const col = colOf(subject.index);
  return col === 1 ? [rowClause(row)] : [rowClause(row), sideClause(col)];
}

/** The next seat along, never a diagonal: the whisper says "directly beside", so
    the rule and the wording have to agree. */
const isDirectlyBeside = (a, b) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1;

/* Clauses that talk about the crowd rather than one person. Each still fits
   several people and costs a step: find the reference, then look around them. A
   direct "just to the left of" is absent on purpose — it fits one person, which
   would hand over the answer. The reference carries a good nobody else carries. */
const RELATIONS = [
  ['standing directly beside', 'not standing directly beside', (a, b) => isDirectlyBeside(a, b)],
  ['not standing directly beside', 'standing directly beside', (a, b) => a !== b && !isDirectlyBeside(a, b)],
  ['in the same row as', 'not in the same row as', (a, b) => a !== b && rowOf(a) === rowOf(b)],
  ['in the same column as', 'not in the same column as', (a, b) => a !== b && colOf(a) === colOf(b)],
];

function relativeCandidates(people, subject) {
  const out = [];

  for (const ref of people) {
    if (ref.index === subject.index) continue;
    if (people.filter((person) => person.good === ref.good).length !== 1) continue;

    const point = `the one carrying ${ref.good.name}`;
    for (const [say, deny, test] of RELATIONS) {
      out.push(clause('rel', `${say} ${point}`, `they are ${deny} ${point}`,
        (person) => test(person.index, ref.index)));
    }
  }

  return out.filter((entry) => entry.fits(subject));
}

/** Every clause the stage allows that is true of the subject. */
function clauseCandidates(people, subject, stage) {
  const out = [hoodClause(subject.hood), goodClause(subject.good), ...placeClauses(subject)];

  if (stage >= 2) {
    for (const hood of new Set(people.map((person) => person.hood))) {
      if (hood !== subject.hood) out.push(hoodClause(hood, false));
    }
    for (const good of new Set(people.map((person) => person.good))) {
      if (good !== subject.good) out.push(goodClause(good, false));
    }
  }

  if (stage >= 3) out.push(...relativeCandidates(people, subject));

  return out;
}

/* ------------------------------------------------------------- the search */

const fitsAll = (person, clauses) => clauses.every((entry) => entry.fits(person));
const countMatches = (people, clauses) => people.filter((person) => fitsAll(person, clauses)).length;

/** The first clause this person breaks, said out loud. */
function failureOf(person, clauses) {
  const missed = clauses.find((entry) => !entry.fits(person));
  return missed ? missed.against : null;
}

/**
 * Fair means exactly one match or exactly none, with every clause load-bearing:
 * drop any one and it stops being the answer. A clause that fits one person on
 * its own, or leaves only one out, is not a clue and is refused.
 */
function isSound(people, clauses, absent) {
  if (new Set(clauses.map((entry) => entry.text)).size !== clauses.length) return false;
  if (countMatches(people, clauses) !== (absent ? 0 : 1)) return false;

  const floor = absent ? 1 : 2;
  return clauses.every((entry) => {
    const alone = countMatches(people, [entry]);
    if (alone < MIN_CLAUSE_MATCHES || alone > MAX_CLAUSE_MATCHES) return false;
    return countMatches(people, clauses.filter((other) => other !== entry)) >= floor;
  });
}

/**
 * The sharpest decoy: someone who fits every clause about who the mark is and
 * only fails the one about where they are. Anyone who simply misses a clause is
 * not a trap, they are the crowd, and those are everywhere by construction.
 */
const findTrap = (people, clauses) => people.findIndex((person) => {
  const missed = clauses.filter((entry) => !entry.fits(person));
  return missed.length === 1 && TRAP_KINDS.has(missed[0].kind);
});

/** Every fair description of the subject. Only pairs and triples ever occur, so
    the subset walk is written out rather than made generic. */
function clauseSets(people, subject, stage, absent) {
  const candidates = clauseCandidates(people, subject, stage);
  const found = [];

  for (let a = 0; a < candidates.length; a += 1) {
    for (let b = a + 1; b < candidates.length; b += 1) {
      const pair = [candidates[a], candidates[b]];
      if (isSound(people, pair, absent)) found.push(pair);
      if (stage < 2) continue;
      for (let c = b + 1; c < candidates.length; c += 1) {
        const triple = [pair[0], pair[1], candidates[c]];
        if (isSound(people, triple, absent)) found.push(triple);
      }
    }
  }

  return found;
}

/**
 * Who an absent description can be about: the trap, where the hood-and-good pair
 * really is in the crowd, just not where the description puts it, so the person
 * wearing it fails the one clause about where they stand; or the cold one, where
 * nobody wears that pair and the job is a walk of the whole crowd.
 */
function phantomSubjects(rng, people, preferTrap) {
  const out = [];
  const cells = shuffle(rng, people.map((person) => person.index));

  if (preferTrap || rng() < 0.5) {
    const holder = pick(rng, people);
    for (const cell of cells) {
      if (cell !== holder.index) out.push({ hood: holder.hood, good: holder.good, index: cell });
    }
  }

  const held = new Set(people.map((person) => pairKey(person.hood, person.good)));
  const hoods = shuffle(rng, [...new Set(people.map((person) => person.hood))]);
  const goods = shuffle(rng, [...new Set(people.map((person) => person.good))]);
  const free = [];

  for (const hood of hoods) {
    for (const good of goods) {
      if (!held.has(pairKey(hood, good))) free.push({ hood, good });
    }
  }

  for (const pair of free.slice(0, 4)) {
    for (const cell of cells.slice(0, 3)) out.push({ ...pair, index: cell });
  }

  return out;
}

/** The search for a fair description, as big as the stage asks for. A shorter one
    is better than a bad one, so the pool widens rather than giving up. */
function findJob(rng, stage, absent, nearMissWanted) {
  const wanted = stage >= 2 ? 3 : 2;

  for (let attempt = 0; attempt < CROWD_TRIES; attempt += 1) {
    const people = buildCrowd(rng);
    const found = [];

    const subjects = absent ? phantomSubjects(rng, people, nearMissWanted) : people;
    for (const subject of subjects) {
      for (const clauses of clauseSets(people, subject, stage, absent)) {
        found.push({ subject, clauses });
      }
    }
    if (!found.length) continue;

    let pool = found.filter((entry) => entry.clauses.length === wanted);
    if (!pool.length) pool = found;

    // The last stage is the one that talks about the crowd, so take a relation
    // when one is on offer.
    if (stage >= 3) {
      const related = pool.filter((entry) => entry.clauses.some((clause) => clause.kind === 'rel'));
      if (related.length) pool = related;
    }

    if (nearMissWanted) {
      const trappy = pool.filter((entry) => findTrap(people, entry.clauses) !== -1);
      if (trappy.length) pool = trappy;
    }

    const choice = pick(rng, pool);
    return { people, clauses: choice.clauses, absent, targetIndex: absent ? -1 : choice.subject.index };
  }

  return null;
}

/** A last resort that cannot be unfair: one hood and one good name exactly one
    person, and both clauses carry their weight. */
function fallbackJob(rng) {
  const people = buildCrowd(rng);
  return { people, clauses: [hoodClause(people[0].hood), goodClause(people[0].good)], absent: false, targetIndex: 0 };
}

function createGoodIcon(pathData) {
  const icon = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  icon.append(svgPath(pathData, 1.7));
  return icon;
}

const game = {
  id: 'assassins-bazaar',

  mount(ctx) {
    this.ctx = ctx;

    const wanted = el('div', 'bazaar__wanted');
    this.clausesEl = el('div', 'bazaar__clauses');
    this.clausesEl.setAttribute('aria-live', 'polite');
    wanted.append(el('p', 'cap', 'the broker whispers'), this.clausesEl);

    this.crowd = el('div', 'bazaar__crowd');
    this.crowd.setAttribute('aria-label', 'Nine people in the bazaar');

    // The one action this table needs is "not here", which is what the shell's
    // single button is for. Moving it under the crowd is what Bones does with
    // the row it draws its own controls on.
    ctx.actionBar.classList.add('bazaar__actions');

    const wrap = el('div', 'bazaar');
    wrap.append(wanted, this.crowd, ctx.actionBar);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.alive = true;
    this.marks = 0;
    this.stage = 1;
    this.newRound(ctx);
  },

  stop(ctx) {
    this.alive = false;
    this.locked = true;
    clearTimeout(this.beat);
    if (ctx) ctx.setActionEnabled(false);
  },

  newRound(ctx) {
    this.locked = false;
    this.ctx.actionBar.classList.remove('bazaar__actions--correct');

    const stage = this.marks >= STAGE_3_MARKS ? 3 : this.marks >= STAGE_2_MARKS ? 2 : 1;
    const absent = ctx.rng() < ABSENT_SHARE;
    const nearMiss = ctx.rng() < NEAR_MISS_SHARE;
    const job = findJob(ctx.rng, stage, absent, nearMiss)
      || findJob(ctx.rng, stage, !absent, nearMiss)
      || fallbackJob(ctx.rng);

    this.people = job.people;
    this.clauses = job.clauses;
    this.absent = job.absent;
    this.targetIndex = job.targetIndex;

    // One clause to a line: the job is reading them against the crowd one by one.
    this.clausesEl.replaceChildren(
      ...this.clauses.map((entry) => el('p', 'bazaar__clause', entry.text)),
    );
    this.crowd.replaceChildren(...this.people.map((person, index) => this.buildFigure(person, index)));

    const turn = stage > this.stage ? STAGE_LINES[stage] : null;
    this.stage = stage;
    ctx.setActionEnabled(true);
    ctx.message(turn ? `${turn} ${JOB_HINT}` : JOB_HINT);
  },

  /** One figure: the hood, the face inside it, the carried thing. */
  buildFigure(person, index) {
    const figure = el('span', 'bazaar__figure');
    figure.style.setProperty('--hood-color', person.hood.color);

    const item = el('span', 'bazaar__good');
    item.append(createGoodIcon(person.good.icon));

    figure.append(
      el('span', 'bazaar__shoulders'),
      el('span', 'bazaar__hood'),
      el('span', 'bazaar__face'),
      item,
    );

    // Where they stand belongs in the label too: a whisper can describe it.
    const button = el('button', 'bazaar__person');
    button.type = 'button';
    button.setAttribute('aria-label', `${index + 1}: ${whereWords(index)} — ${person.hood.name} hood, carrying ${person.good.name}`);
    button.append(figure, el('span', 'bazaar__number', String(index + 1)));
    button.addEventListener('click', () => this.choose(index));
    return button;
  },

  /** Resolve the job, then hand over to the next whisper. One point a job, and
      nothing is ever taken away — a miss costs only the job itself. */
  finish(pickedIndex, correct) {
    this.locked = true;
    this.ctx.setActionEnabled(false);

    this.crowd.querySelectorAll('.bazaar__person').forEach((button, personIndex) => {
      button.disabled = true;
      if (personIndex === this.targetIndex) button.classList.add('bazaar__person--mark');
      if (personIndex === pickedIndex) {
        button.classList.add(correct ? 'bazaar__person--correct' : 'bazaar__person--miss');
      }
    });

    // No figure to flash for a right "not here", so the button carries the flash.
    this.ctx.actionBar.classList.toggle('bazaar__actions--correct', correct && this.absent);

    if (correct) {
      this.marks += 1;
      this.ctx.addPoints(BASE_MARKS);
      this.ctx.message(this.absent
        ? 'Nobody here fits. The description was a dead end.'
        : 'The mark is yours.');
    } else if (pickedIndex === -1) {
      const mark = this.people[this.targetIndex];
      this.ctx.message(`They were there. The mark was the ${mark.hood.name} hood carrying ${mark.good.name}.`);
    } else {
      // The message spends itself on the one thing worth knowing: the clause
      // that beat you.
      const against = failureOf(this.people[pickedIndex], this.clauses);
      this.ctx.message(against ? `Not them — ${against}.` : 'Not them.');
    }

    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (this.alive) this.newRound(this.ctx);
    }, BEAT_MS);
  },

  choose(index) {
    if (this.locked || !this.alive) return;
    this.finish(index, !this.absent && index === this.targetIndex);
  },

  /** The shell's single button: the answer for the jobs where the whisper fits
      nobody at all. */
  act() {
    if (this.locked || !this.alive) return;
    this.finish(-1, this.absent);
  },
};

export default game;