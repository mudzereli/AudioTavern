/* ---------------------------------------------------------------------------
   Fire Dance — the fire is the fence.

   A clearing at night, one bonfire, dancers circling it, and something pacing
   outside the light. The fire's level *is* its light radius, and the beast takes
   ground only while it stands in the dark: while the light reaches it, it holds
   at the edge and takes nothing.

   Every turn is one action and then the beast. Nothing drains the fire on its own,
   but every action but a feed is paid for out of it: a step of the dance burns a
   level of light or two, the walk to the woodpile burns one, and a log gives back
   somewhere between three and six. Both of those are rolled each turn and shown
   before you choose, so the swing is visible rather than a surprise.

   The trade is the whole game:

     the rite burns the light that holds the beast out, the wood is out in the
     dark, and the closer you let it come, the less light it takes to hold it.

   The ladder deepens the night one dial at a time, and the tell — how far it
   will come this turn if the light fails — is on the board before you commit,
   because reading it is the whole decision.

   This table draws its own three actions, so the shell hides its single-action
   bar. Nothing is awarded at the bell: a completed rite is scored as it turns.
   --------------------------------------------------------------------------- */

import { el, plural, svgEl, svgPath } from '../dom.js';
import { randInt } from '../rng.js';

/** The fire. Its level is the light radius, and the light is the fence. */
const FIRE_MAX = 8;
const FIRE_START = 4;

/**
 * What one step of the dance costs the fire, before the ladder puts it up, and
 * how far past that the flames can swing. Both the price of a step and the gift
 * of a log are rolled at the start of every turn and shown on the buttons before
 * the player commits — the fire is alive, but it is never unfair.
 */
const DANCE_COST = 1;
const DANCE_SWING = 1;

/** Fuel. A log is the only thing that lengthens the light, and wood feeds it. */
const FEED_GAIN = 3;
const FEED_SWING = 3;
const WOOD_START = 4;
const WOOD_CAP = 8;
const GATHER_MIN = 1;
const GATHER_MAX = 3;
/** The trip itself is paid for out of the light: you are away from the fire. */
const GATHER_COST = 1;

/** The beast. `BEAST_FAR` is the treeline, and 0 means it has reached you. */
const BEAST_FAR = 5;

/** The rite. A completed verse is the score, and the ladder lengthens them. */
const DANCERS = 3;
const VERSE_BASE = 3;
const VERSE_LENGTH_FROM = 5;
const VERSE_MAX = 8;

/** Verse one is a free page: it prowls, and it cannot close. */
const FREE_VERSE = 1;

/** The fire a completed verse adds, and the beat the flare of it lasts. */
const FLARE_GAIN = 1;
const FLARE_MS = 700;

/** The pauses the table takes. */
const TAKE_MS = 900;
const RITE_MS = 1800;

/**
 * The ladder. The night deepens one dial per verse and never two at once, so
 * every verse teaches exactly one new thing — and it deepens slowly, because a
 * step's price is what the whole economy is built on.
 *
 * Verses two to four are the long opening stretch: a step costs one, and the only
 * question is whether the light still reaches the beast. From verse five the rite
 * drinks two a step, so a log buys two steps instead of four.
 */
const LADDER = [
  { verse: 2, cost: DANCE_COST, tellMin: 1, tellMax: 1 },
  { verse: 5, cost: 2 },
  { verse: 7, tellMax: 2 },
];

/** Everything the night is doing to you at a given verse. */
function nightAt(verse) {
  const night = { cost: DANCE_COST, tellMin: 1, tellMax: 1 };
  for (const rung of LADDER) {
    if (rung.verse > verse) break;
    if (rung.cost != null) night.cost = rung.cost;
    if (rung.tellMin != null) night.tellMin = rung.tellMin;
    if (rung.tellMax != null) night.tellMax = rung.tellMax;
  }
  return night;
}

/** How the beast's step reads, so the board and the talk agree. */
function tellWords(night) {
  if (night.tellMin === 2) return 'two rings every time';
  if (night.tellMax === 2) return 'one ring or two';
  return 'one ring';
}

/** Verses keep gaining a step every other verse once the ladder is spent. */
function verseLength(verse) {
  if (verse < VERSE_LENGTH_FROM) return VERSE_BASE;
  const grown = 1 + Math.floor((verse - VERSE_LENGTH_FROM) / 2);
  return Math.min(VERSE_MAX, VERSE_BASE + grown);
}

/**
 * One scale for the light and for the beast, so that "held" is literally true
 * on the board: the ring is drawn at the fire's radius and the pip at the
 * beast's distance, and the pip sits on the ring whenever it is being held.
 */
function radiusPercent(level) {
  return 8 + Math.max(0, Math.min(level, FIRE_MAX)) * 5;
}

/**
 * How tall the drawn fire stands, as a percentage of the clearing — the same
 * shape as radiusPercent, because the height of the picture *is* the level, and
 * the ring has to agree with it.
 */
function flameHeightPercent(level) {
  return 10 + Math.max(0, Math.min(level, FIRE_MAX)) * 4.5;
}

/** A turn's parts joined into one sentence, so a turn reads as a single line. */
function sentence(parts) {
  const text = parts.filter(Boolean).join(', ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/**
 * The fire, drawn rather than stacked: two logs, a flame and a core, scaled to
 * the level from paintBoard. The logs are the only part that survives the fire
 * going out, which is the one thing the picture has to say without a number.
 */
function createFire() {
  const svg = svgEl('svg', { viewBox: '0 0 40 64' });
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('fire__blaze');

  const logs = svgEl('g', { class: 'fire__logs' });
  logs.append(
    svgEl('rect', { x: 3, y: 53, width: 34, height: 6, rx: 3, transform: 'rotate(-12 20 56)' }),
    svgEl('rect', { x: 3, y: 53, width: 34, height: 6, rx: 3, transform: 'rotate(12 20 56)' }),
  );

  const flame = svgEl('path', {
    d: 'M20 4 C27 17 35 24 35 38 C35 50 28 57 20 57 C12 57 5 50 5 38 C5 24 13 17 20 4 Z',
    fill: 'currentColor',
  });
  flame.classList.add('fire__body');

  const core = svgEl('path', {
    d: 'M20 22 C24 31 28 35 28 42 C28 49 24 53 20 53 C16 53 12 49 12 42 C12 35 16 31 20 22 Z',
    fill: 'currentColor',
  });
  core.classList.add('fire__core');

  svg.append(logs, flame, core);
  return svg;
}

/**
 * The thing outside the light: a demon's face at the treeline — horns, a heavy
 * brow over two lit eyes, and a mouth of fangs. It is the one mark on the board
 * that is a face rather than a shape, so it is drawn upright and read as one;
 * where it stands on the ray is the information, not which way it points.
 */
function createBeast() {
  const svg = svgEl('svg', { viewBox: '0 0 32 30' });
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('fire__beast');

  // Skull and horns in the beast's own colour: one silhouette, so the light
  // shows through only at the eyes and the teeth.
  svg.append(
    svgEl('path', { d: 'M9.5 9.5 C5.5 7 3.5 4 4 1 C7.5 2.5 10.5 5.5 12.5 8.8 Z', fill: 'currentColor' }),
    svgEl('path', { d: 'M22.5 9.5 C26.5 7 28.5 4 28 1 C24.5 2.5 21.5 5.5 19.5 8.8 Z', fill: 'currentColor' }),
    svgEl('path', {
      d: 'M16 5.5 C22.5 5.5 26.5 9.5 27 15.2 C27.5 21 24 26 16 28.5 C8 26 4.5 21 5 15.2 C5.5 9.5 9.5 5.5 16 5.5 Z',
      fill: 'currentColor',
    }),
  );

  const lit = (d) => {
    const node = svgEl('path', { d, fill: 'currentColor' });
    node.classList.add('fire__glow');
    return node;
  };

  // Two slanted eyes, then the fangs below them.
  svg.append(
    lit('M9.6 15.6 L15 12.9 L14.5 16.6 Z'),
    lit('M22.4 15.6 L17 12.9 L17.5 16.6 Z'),
    lit('M10.6 20.2 L13.2 20.2 L11.9 23.6 Z'),
    lit('M14.7 20.2 L17.3 20.2 L16 23.6 Z'),
    lit('M18.8 20.2 L21.4 20.2 L20.1 23.6 Z'),
  );

  return svg;
}

/** A dancer: arms up, standing, and the only piece here that can go out. */
function createDancer() {
  const svg = svgEl('svg', { viewBox: '0 0 12 20' });
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('fire__dancer');

  svg.append(
    svgEl('circle', { cx: 6, cy: 3.4, r: 2.5, fill: 'currentColor' }),
    svgPath('M6 6.4 L6 13.6', 2),
    svgPath('M6 8 L1.6 3.8', 1.6),
    svgPath('M6 8 L10.4 3.8', 1.6),
    svgPath('M6 13.6 L2.8 19.4', 1.8),
    svgPath('M6 13.6 L9.2 19.4', 1.8),
  );
  return svg;
}

const game = {
  id: 'fire-dance',

  /* ------------------------------------------------------------------ mount */

  mount(ctx) {
    this.ctx = ctx;

    const wrap = el('section', 'fire');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'The clearing');

    const readout = el('div', 'fire__readout');
    this.chips = {};
    for (const [key, label] of [
      ['fire', 'Fire'],
      ['wood', 'Wood'],
      ['beast', 'Beast'],
      ['verse', 'Verse'],
    ]) {
      const box = el('div', 'fire__chip');
      const value = el('strong', 'fire__chip-value', '—');
      box.append(el('span', 'fire__chip-label', label), value);
      readout.append(box);
      this.chips[key] = { box, value };
    }

    // The clearing is drawn rather than read out: the ring, the flame and the pip
    // are decoration, with the chips carrying every number — so only the dancers,
    // which nothing else counts, keep a label of their own.
    const clearing = el('div', 'fire__clearing');

    const ring = el('div', 'fire__ring');
    ring.setAttribute('aria-hidden', 'true');

    this.blaze = createFire();

    const beast = createBeast();

    const dancers = el('div', 'fire__dancers');
    dancers.setAttribute('role', 'img');
    this.dancerMarks = [];
    for (let index = 0; index < DANCERS; index += 1) {
      const mark = createDancer();
      dancers.append(mark);
      this.dancerMarks.push(mark);
    }

    clearing.append(ring, beast, this.blaze, dancers);

    this.clearing = clearing;
    this.dancersEl = dancers;
    this.orderEl = el('p', 'fire__order', '');

    this.nets = {};
    this.danceButton = this.buildAction('Dance', 'dance', 'btn btn--primary fire__action');
    this.feedButton = this.buildAction('Feed', 'feed', 'btn btn--ghost fire__action');
    this.gatherButton = this.buildAction('Gather', 'gather', 'btn btn--ghost fire__action');

    const bar = el('div', 'fire__bar');
    bar.append(this.danceButton, this.feedButton, this.gatherButton);

    const hint = el(
      'p',
      'fire__hint',
      'The fire is the fence: its level is how far the light reaches, and it only takes ground in the dark. Dance for the rite, feed for the fence, and go out for wood when it is far enough off.',
    );

    wrap.append(readout, clearing, this.orderEl, bar, hint);
    ctx.stage.append(wrap);
  },

  /** An action button that carries its own net effect on the fire. */
  buildAction(label, mode, className) {
    const button = el('button', className);
    button.type = 'button';
    button.disabled = true;

    const net = el('span', 'fire__action-net', '');
    button.append(el('span', 'fire__action-name', label), net);
    button.addEventListener('click', () => this.act(mode));

    this.nets[mode] = net;
    return button;
  },

  /* -------------------------------------------------------------- lifecycle */

  start(ctx) {
    this.ctx = ctx;
    this.alive = true;
    this.locked = false;

    this.verse = 1;
    this.step = 0;
    this.rites = 0;
    this.fire = FIRE_START;
    this.wood = WOOD_START;
    this.beast = BEAST_FAR;
    this.dancers = DANCERS;
    this.flared = false;

    clearTimeout(this.settle);
    clearTimeout(this.flare);
    this.openTurn(true);
  },

  stop() {
    this.alive = false;
    this.locked = true;
    this.phase = 'stopped';
    clearTimeout(this.settle);
    clearTimeout(this.flare);
    this.paint();
  },

  canAct() {
    return this.alive === true && this.locked === false && this.phase === 'waiting';
  },

  /**
   * Open a turn: the night's dials for this verse, and the tell — how far the
   * beast will come this turn if the light fails to reach it. The tell is rolled
   * now and shown, because knowing it before you commit is the decision.
   */
  openTurn(first) {
    this.phase = 'waiting';
    this.night = nightAt(this.verse);
    this.free = this.verse <= FREE_VERSE;

    // The turn's three rolls, all shown before the player commits: what this step
    // of the dance costs, what this log would give back, and how far the beast
    // means to come if the light falls short of it.
    this.cost = randInt(this.ctx.rng, this.night.cost, this.night.cost + DANCE_SWING);
    this.gift = randInt(this.ctx.rng, FEED_GAIN, FEED_GAIN + FEED_SWING);
    this.tell = this.free
      ? 0
      : randInt(this.ctx.rng, this.night.tellMin, this.night.tellMax);
    this.paint();

    if (first) {
      this.ctx.message('Verse one is the free page: it prowls the treeline and cannot come in. Learn the fire, the rite and the woodpile while nothing is at stake.');
    }
  },

  /* ---------------------------------------------------------------- a turn */

  /**
   * The turn: the action, and then the beast. Nothing drains the fire on its own —
   * the dance is what the fire pays for, so the light only shortens as fast as the
   * rite advances.
   */
  act(mode) {
    if (!this.canAct()) return;
    this.phase = 'resolving';

    const said = [];
    if (mode === 'dance') said.push(this.dance());
    else if (mode === 'feed') said.push(this.feed());
    else said.push(this.gather());

    if (this.beast <= this.fire) {
      said.push('it is held at the edge of the light');
    } else if (this.free) {
      said.push('it prowls the treeline and does not come in');
    } else {
      const closed = Math.min(this.beast, this.tell);
      this.beast -= closed;
      said.push(`it closes ${plural(closed, 'ring')}`);
    }

    if (this.beast === 0) {
      this.take();
      return;
    }

    this.ctx.message(sentence(said));
    this.openTurn();
  },

  /** The dancers stamp: the rite advances, and the fire pays for the step. */
  dance() {
    this.step += 1;
    this.fire = Math.max(0, this.fire - this.cost);

    const need = verseLength(this.verse);
    if (this.step >= need) return this.turnTheVerse();

    return `the dancers stamp out step ${this.step} of ${need} — ${plural(this.cost, 'level')} off the fire, down to ${this.fire}`;
  },

  /**
   * A log into the fire: the only thing in the table that lengthens the light.
   * At full blaze it is a wasted log — the ceiling is on the chip, and the loss is
   * the punishment for not reading it (the same rule as firing at plating).
   */
  feed() {
    if (this.wood <= 0) return 'there is no wood left to feed it with';

    this.wood -= 1;
    if (this.fire >= FIRE_MAX) {
      return `the fire is already at full blaze, so the log is wasted — ${plural(this.wood, 'log')} in the ring`;
    }

    this.fire = Math.min(FIRE_MAX, this.fire + this.gift);
    return `a log goes on — ${this.gift} levels — and the fire is at ${this.fire}`;
  },

  /**
   * Out to the woodpile: what the dark is willing to give, and the light it costs
   * to be away from the fire while you get it.
   */
  gather() {
    if (this.wood >= WOOD_CAP) {
      return 'the arms are already full, so there is no reason to leave the light';
    }

    this.fire = Math.max(0, this.fire - GATHER_COST);
    const hauled = randInt(this.ctx.rng, GATHER_MIN, GATHER_MAX);
    this.wood = Math.min(WOOD_CAP, this.wood + hauled);
    return `out to the woodpile and back with ${plural(hauled, 'log')} — ${this.wood} in the ring, and the fire down to ${this.fire}`;
  },

  /**
   * A verse completes: it is scored, the fire flares, and the beast falls back a
   * ring — the only thing in the table that buys ground. The rite carries
   * straight on into a night that is one dial deeper.
   */
  turnTheVerse() {
    this.rites += 1;
    this.ctx.addPoints(1);

    this.verse += 1;
    this.step = 0;
    this.fire = Math.min(FIRE_MAX, this.fire + FLARE_GAIN);
    this.beast = Math.min(BEAST_FAR, this.beast + 1);

    // The completion is the one thing in the table worth seeing, so the clearing
    // throws an echo of its own light for a beat. A state, never an animation:
    // tokens.css neutralises motion, so this has to read with it switched off.
    clearTimeout(this.flare);
    this.flared = true;
    this.flare = setTimeout(() => {
      this.flared = false;
      if (this.alive) this.paint();
    }, FLARE_MS);

    return `the verse is complete — rite ${this.rites}: the fire flares and it falls back a ring`;
  },

  /**
   * It has a dancer. The cost is a life and the tempo, never the work in hand:
   * the steps already danced into this verse are kept, the fire is relit from
   * the embers, and it drags the body back out to the treeline.
   */
  take() {
    this.dancers -= 1;
    this.fire = FIRE_START;
    this.beast = BEAST_FAR;
    this.phase = 'settling';
    this.paint();

    if (this.dancers <= 0) {
      this.riteIsLost();
      return;
    }

    this.ctx.message(`It has a dancer — ${plural(this.dancers, 'dancer')} left at the fire. It drags the body back to the treeline, the fire is relit, and the rite carries on from the step it stood at.`);

    this.settle = setTimeout(() => {
      if (!this.alive) return;
      this.openTurn();
    }, TAKE_MS);
  },

  /**
   * The last dancer is gone, so this rite is over — but the night is not. The
   * dance starts again from the first verse with three dancers and a fresh fire,
   * while the score stands untouched: what a lost rite costs is the tempo and
   * the depth it had reached, and nothing else.
   */
  riteIsLost() {
    this.phase = 'settling';
    this.paint();

    this.ctx.message(`The last dancer falls, and this rite breaks — ${plural(this.rites, 'rite')} stand. The fire is lit again from the embers.`);

    this.settle = setTimeout(() => {
      if (!this.alive) return;
      this.restartRite();
    }, RITE_MS);
  },

  /** A fresh rite: the opening position again, and the score left alone. */
  restartRite() {
    clearTimeout(this.flare);
    this.flared = false;
    this.verse = 1;
    this.step = 0;
    this.fire = FIRE_START;
    this.wood = WOOD_START;
    this.beast = BEAST_FAR;
    this.dancers = DANCERS;
    this.openTurn(true);
  },

  /* ---------------------------------------------------------------- painting */

  paint() {
    this.paintReadout();
    this.paintBoard();
    this.paintActions();
    this.describeNight();
  },

  paintReadout() {
    const reach = this.beast <= this.fire;

    this.chips.fire.value.textContent = `${this.fire}/${FIRE_MAX}`;
    this.chips.fire.box.classList.toggle('fire__chip--low', this.fire <= 1);

    this.chips.wood.value.textContent = `${this.wood}/${WOOD_CAP}`;

    this.chips.beast.value.textContent = this.free
      ? `${this.beast} · prowling`
      : `${this.beast} · ${reach ? 'held' : `comes ${this.tell}`}`;
    this.chips.beast.box.classList.toggle('fire__chip--held', reach && !this.free);
    this.chips.verse.box.classList.toggle('fire__chip--flared', this.flared === true);

    this.chips.verse.value.textContent = `${this.verse} · ${this.step}/${verseLength(this.verse)}`;
  },

  paintBoard() {
    // The ring and the pip share radiusPercent, so a held beast sits on the ring.
    this.clearing.style.setProperty('--light', `${radiusPercent(this.fire)}%`);
    this.clearing.style.setProperty('--out', `${radiusPercent(this.beast)}%`);

    this.clearing.classList.toggle('fire__clearing--held', !this.free && this.beast <= this.fire);
    this.clearing.classList.toggle('fire__clearing--dark', this.fire <= 0);
    this.clearing.classList.toggle('fire__clearing--flared', this.flared === true);

    for (let index = 0; index < this.dancerMarks.length; index += 1) {
      this.dancerMarks[index].classList.toggle('fire__dancer--lost', index >= this.dancers);
    }

    // The drawing is the level: the flame stands as tall as the fire is high.
    this.clearing.style.setProperty('--flame', `${flameHeightPercent(this.fire)}%`);
    this.blaze.classList.toggle('fire__blaze--out', this.fire <= 0);

    this.dancersEl.setAttribute('aria-label', `${this.dancers} of ${DANCERS} dancers still standing`);
  },

  /**
   * Every button says what it will do to the fire before it is pressed, because
   * those three numbers are the economy and they move when the ladder moves.
   */
  paintActions() {
    const open = this.canAct();

    this.danceButton.disabled = !open;
    this.feedButton.disabled = !open;
    this.gatherButton.disabled = !open;

    // The rolled values for this turn, so each button says what will actually
    // happen rather than the range it came out of.
    this.nets.dance.textContent = `+1 step · fire -${this.cost ?? DANCE_COST}`;
    this.nets.feed.textContent = `fire +${this.gift ?? FEED_GAIN} · wood -1`;
    this.nets.gather.textContent = `wood +${GATHER_MIN}-${GATHER_MAX} · fire -${GATHER_COST}`;
  },

  /** The order line: what a step costs, and what the beast does about it. */
  describeNight() {
    const costRange = `${this.night.cost} or ${this.night.cost + DANCE_SWING}`;
    const giftRange = `${FEED_GAIN} to ${FEED_GAIN + FEED_SWING}`;

    if (this.free) {
      this.orderEl.textContent = `Verse ${this.verse} of the free page: it prowls the treeline and cannot close. A step costs ${costRange} fire, and a log gives back ${giftRange}.`;
      return;
    }

    this.orderEl.textContent = `Verse ${this.verse}: a step costs ${costRange} fire, a log gives back ${giftRange}, and it closes ${tellWords(this.night)} while the fire falls short of it.`;
  },
};

export default game;
