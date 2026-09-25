/* ---------------------------------------------------------------------------
   Fire Dance — the fire is the fence.

   A clearing at night, one bonfire, dancers circling it, and something pacing
   outside the light. The fire's level *is* its light radius, and the beast takes
   ground only while it stands in the dark: while the light reaches it, it holds
   at the edge and takes nothing.

   One action a turn, and then the world moves — the fire burns, and the beast
   closes if the light no longer reaches it. The trade is the whole game:

     every log you burn is a turn you did not spend dancing, and the closer you
     let it come, the cheaper the light is.

   The ladder deepens the night one dial at a time, and the tell — how far it
   will come this turn if the light fails — is on the board before you commit,
   because reading it is the whole decision.

   This table draws its own three actions, so the shell hides its single-action
   bar. Nothing is awarded at the bell: a completed rite is scored as it turns.
   --------------------------------------------------------------------------- */

import { el, plural } from '../dom.js';
import { randInt } from '../rng.js';

/** The fire. Its level is the light radius, and the light is the fence. */
const FIRE_MAX = 6;
const FIRE_START = 4;

/** Fuel. Feeding is the only way up, and wood is the only way to feed. */
const FEED_GAIN = 3;
const WOOD_START = 4;
const WOOD_CAP = 8;
const GATHER_MIN = 1;
const GATHER_MAX = 3;

/** The beast. `BEAST_FAR` is the treeline, and 0 means it has reached you. */
const BEAST_FAR = 5;

/** The rite. A completed verse is the score, and the ladder lengthens them. */
const DANCERS = 3;
const VERSE_BASE = 3;
const VERSE_LENGTH_FROM = 5;
const VERSE_MAX = 8;

/** Verse one is a free page: it prowls, and it cannot close. */
const FREE_VERSE = 1;

/** The fire a completed verse adds, and the pause after a take. */
const FLARE_GAIN = 1;
const TAKE_MS = 900;

/**
 * The ladder. The night deepens one dial per verse and never two at once, so
 * every verse teaches exactly one new thing. Note that verse two leaves the
 * dancers' stoke equal to the burn: that verse is the one that teaches that
 * dancing holds the fire. From verse three the burn outruns the stoke and fuel
 * has to be earned.
 *
 * Past the end of the table the verses keep lengthening (see verseLength), so
 * the ladder does not need a rung for every depth.
 */
const LADDER = [
  { verse: 2, burn: 1, tellMin: 1, tellMax: 1 },
  { verse: 3, burn: 2 },
  { verse: 4, tellMax: 2 },
  { verse: 6, tellMin: 2 },
];

/** Everything the night is doing to you at a given verse. */
function nightAt(verse) {
  const night = { burn: 1, tellMin: 1, tellMax: 1 };
  for (const rung of LADDER) {
    if (rung.verse > verse) break;
    if (rung.burn != null) night.burn = rung.burn;
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
  return 10 + Math.max(0, Math.min(level, FIRE_MAX)) * 6;
}

/** "-1" / "+2" / "±0" — the net effect a button will have on the fire. */
function signed(value) {
  if (value === 0) return '±0';
  return value > 0 ? `+${value}` : String(value);
}

/** A turn's parts joined into one sentence, so a turn reads as a single line. */
function sentence(parts) {
  const text = parts.filter(Boolean).join(', ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
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
      ['dancers', 'Dancers'],
    ]) {
      const box = el('div', 'fire__chip');
      const value = el('strong', 'fire__chip-value', '—');
      box.append(el('span', 'fire__chip-label', label), value);
      readout.append(box);
      this.chips[key] = { box, value };
    }

    // The clearing is drawn, never read out: every number is in the chips, so
    // the board itself is decoration and stays out of a screen reader's way.
    const clearing = el('div', 'fire__clearing');
    clearing.setAttribute('aria-hidden', 'true');

    const ring = el('div', 'fire__ring');

    const flame = el('div', 'fire__flame');
    this.tongues = [];
    for (let level = 1; level <= FIRE_MAX; level += 1) {
      const tongue = el('span', 'fire__tongue');
      flame.append(tongue);
      this.tongues.push(tongue);
    }

    const beast = el('span', 'fire__beast');

    const dancers = el('div', 'fire__dancers');
    this.dancerMarks = [];
    for (let index = 0; index < DANCERS; index += 1) {
      const mark = el('span', 'fire__dancer');
      dancers.append(mark);
      this.dancerMarks.push(mark);
    }

    clearing.append(ring, beast, flame, dancers);

    this.clearing = clearing;
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
      'The fire is the fence: its level is how far the light reaches, and the beast only takes ground in the dark. Dance to turn the rite and stoke the fire, feed a log in to raise it, or walk out to the woodpile for more of them — and the closer you let it come, the less light it takes to hold it there.',
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

    clearTimeout(this.settle);
    this.openTurn(true);
  },

  stop() {
    this.alive = false;
    this.locked = true;
    this.phase = 'stopped';
    clearTimeout(this.settle);
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
   * One action, then the world: the fire burns, and the beast takes ground if
   * the light no longer reaches it. If it arrives — the light out, it at the
   * fire — it takes a dancer.
   */
  act(mode) {
    if (!this.canAct()) return;
    this.phase = 'resolving';

    const said = [];
    if (mode === 'dance') said.push(this.dance());
    else if (mode === 'feed') said.push(this.feed());
    else said.push(this.gather());

    this.fire = Math.max(0, this.fire - this.night.burn);

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

  /** The dancers stamp, the fire leans toward them, and the rite turns over. */
  dance() {
    this.step += 1;

    const stoke = this.stoke();
    if (stoke > 0) this.fire = Math.min(FIRE_MAX, this.fire + stoke);

    const need = verseLength(this.verse);
    if (this.step >= need) return this.turnTheVerse();

    return `the dancers stamp out step ${this.step} of ${need}`;
  },

  /** A log into the fire: the only thing in the table that raises it. */
  feed() {
    if (this.wood <= 0) return 'there is no wood left to feed it with';

    this.wood -= 1;
    if (this.fire >= FIRE_MAX) {
      return `the fire is already at full blaze, so the log is wasted — ${plural(this.wood, 'log')} in the ring`;
    }

    this.fire = Math.min(FIRE_MAX, this.fire + FEED_GAIN);
    return `a log goes on and the fire climbs to ${this.fire}`;
  },

  /** Out to the woodpile: what the dark is willing to give, and the turn it costs. */
  gather() {
    if (this.wood >= WOOD_CAP) {
      return 'the arms are already full, so the trip out to the woodpile brings nothing';
    }

    const hauled = randInt(this.ctx.rng, GATHER_MIN, GATHER_MAX);
    this.wood = Math.min(WOOD_CAP, this.wood + hauled);
    return `out to the woodpile and back with ${plural(hauled, 'log')} — ${this.wood} in the ring`;
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

    return `the verse is complete — rite ${this.rites}: the fire flares and it falls back a ring`;
  },

  /**
   * It has a dancer. The cost is a life and the tempo, never the work in hand:
   * the steps already danced into this verse are kept, the fire is relit from
   * the embers, and it drags the body back out to the treeline. The third one
   * ends the night.
   */
  take() {
    this.dancers -= 1;
    this.fire = FIRE_START;
    this.beast = BEAST_FAR;
    this.phase = 'settling';
    this.paint();

    if (this.dancers <= 0) {
      this.ctx.message('The dark takes the last dancer, and the fire is left burning for nobody.');
      this.ctx.run.stop();
      return;
    }

    this.ctx.message(`It has a dancer — ${plural(this.dancers, 'dancer')} left at the fire. It drags the body back to the treeline, the fire is relit, and the rite carries on from the step it stood at.`);

    this.settle = setTimeout(() => {
      if (!this.alive) return;
      this.openTurn();
    }, TAKE_MS);
  },

  /**
   * What the dancers put back into the fire as they dance. It never covers the
   * burn once the night deepens, which is what keeps fuel worth fetching: if it
   * ever did cover it, a player could sit at full blaze and dance to the bell
   * with the beast frozen at the edge of the light.
   */
  stoke() {
    return Math.floor(this.dancers / 2);
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
      ? `${this.beast} of ${BEAST_FAR} · prowling`
      : `${this.beast} of ${BEAST_FAR} · ${reach ? 'held' : `comes ${this.tell}`}`;
    this.chips.beast.box.classList.toggle('fire__chip--held', reach && !this.free);

    this.chips.verse.value.textContent = `${this.verse} · ${this.step}/${verseLength(this.verse)}`;
    this.chips.dancers.value.textContent = `${this.dancers} of ${DANCERS}`;
  },

  paintBoard() {
    // The ring and the pip share radiusPercent, so a held beast sits on the ring.
    this.clearing.style.setProperty('--light', `${radiusPercent(this.fire)}%`);
    this.clearing.style.setProperty('--out', `${radiusPercent(this.beast)}%`);

    this.clearing.classList.toggle('fire__clearing--held', !this.free && this.beast <= this.fire);
    this.clearing.classList.toggle('fire__clearing--dark', this.fire <= 0);

    for (let index = 0; index < this.tongues.length; index += 1) {
      this.tongues[index].classList.toggle('fire__tongue--lit', index < this.fire);
    }

    for (let index = 0; index < this.dancerMarks.length; index += 1) {
      this.dancerMarks[index].classList.toggle('fire__dancer--lost', index >= this.dancers);
    }
  },

  /**
   * Every button says what it will do to the fire before it is pressed, because
   * those three numbers are the economy and they move when the ladder moves.
   */
  paintActions() {
    const open = this.canAct();
    const burn = this.night ? this.night.burn : 1;

    this.danceButton.disabled = !open;
    this.feedButton.disabled = !open;
    this.gatherButton.disabled = !open;

    this.nets.dance.textContent = `+1 step · fire ${signed(this.stoke() - burn)}`;
    this.nets.feed.textContent = `fire ${signed(FEED_GAIN - burn)} · wood -1`;
    this.nets.gather.textContent = `wood +${GATHER_MIN}-${GATHER_MAX} · fire ${signed(-burn)}`;
  },

  /** The order line: what the night is doing, and what it will do next turn. */
  describeNight() {
    const need = verseLength(this.verse);

    if (this.free) {
      this.orderEl.textContent = `Verse ${this.verse}, the free page: it prowls the treeline and cannot close. ${this.step} of ${need} steps danced; the fire burns ${this.night.burn} a turn and the dancers give back ${this.stoke()}.`;
      return;
    }

    this.orderEl.textContent = `Verse ${this.verse}: ${this.step} of ${need} steps danced. The fire burns ${this.night.burn} a turn, the dancers give back ${this.stoke()}, and it closes ${tellWords(this.night)} while the fire falls short of it.`;
  },
};

export default game;
