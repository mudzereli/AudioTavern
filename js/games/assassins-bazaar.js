/* ---------------------------------------------------------------------------
   Assassin's Bazaar — find the mark.

   The broker gives you a description: one hood colour and one thing the
   target is carrying. Pick the matching figure from the nine market-goers.
   Each round makes nine distinct combinations, so the description always
   identifies exactly one person.
   --------------------------------------------------------------------------- */

import { shuffle } from '../rng.js';

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
  { name: 'a lantern', glyph: '\u2726' },
  { name: 'a scroll', glyph: '\u2756' },
  { name: 'a dagger', glyph: '\u2694' },
  { name: 'a basket', glyph: '\u25a4' },
  { name: 'a bottle', glyph: '\u25c8' },
  { name: 'a flower', glyph: '\u273f' },
  { name: 'a key', glyph: '\u26bf' },
  { name: 'a fan', glyph: '\u2739' },
  { name: 'a map', glyph: '\u25a7' },
];

const CROWD_SIZE = 9;
const BEAT_MS = 850;

function makeCrowd(rng) {
  const combinations = [];

  for (const hood of HOODS) {
    for (const good of GOODS) {
      combinations.push({ hood, good });
    }
  }

  return shuffle(rng, combinations).slice(0, CROWD_SIZE);
}

const game = {
  id: 'assassins-bazaar',

  mount(ctx) {
    this.ctx = ctx;

    const wrap = document.createElement('div');
    wrap.className = 'bazaar';

    const wanted = document.createElement('div');
    wanted.className = 'bazaar__wanted';

    const wantedLabel = document.createElement('p');
    wantedLabel.className = 'cap';
    wantedLabel.textContent = 'the broker whispers';

    this.clue = document.createElement('p');
    this.clue.className = 'bazaar__clue';
    this.clue.setAttribute('aria-live', 'polite');

    wanted.append(wantedLabel, this.clue);

    this.crowd = document.createElement('div');
    this.crowd.className = 'bazaar__crowd';
    this.crowd.setAttribute('aria-label', 'Nine people in the bazaar');

    wrap.append(wanted, this.crowd);
    ctx.stage.append(wrap);

    document.addEventListener('keydown', (event) => {
      if (!this.alive || this.locked) return;
      if (!/^[1-9]$/.test(event.key)) return;
      event.preventDefault();
      this.choose(Number(event.key) - 1);
    });
  },

  start(ctx) {
    this.alive = true;
    this.newRound(ctx);
  },

  stop() {
    this.alive = false;
    this.locked = true;
    clearTimeout(this.beat);
  },

  newRound(ctx) {
    this.locked = false;
    this.people = makeCrowd(ctx.rng);
    this.targetIndex = Math.floor(ctx.rng() * this.people.length);

    const target = this.people[this.targetIndex];
    this.clue.replaceChildren();
    this.clue.append(document.createTextNode('Find the one in the '));
    const hood = document.createElement('strong');
    hood.textContent = `${target.hood.name} hood`;
    const good = document.createElement('strong');
    good.textContent = `carrying ${target.good.name}`;
    this.clue.append(hood, document.createTextNode(', '), good, document.createTextNode('.'));

    this.crowd.replaceChildren();
    this.people.forEach((person, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bazaar__person';
      button.setAttribute('aria-label', `${index + 1}: ${person.hood.name} hood, carrying ${person.good.name}`);
      button.addEventListener('click', () => this.choose(index));

      const figure = document.createElement('span');
      figure.className = 'bazaar__figure';
      figure.style.setProperty('--hood-color', person.hood.color);

      const hoodShape = document.createElement('span');
      hoodShape.className = 'bazaar__hood';
      hoodShape.setAttribute('aria-hidden', 'true');

      const face = document.createElement('span');
      face.className = 'bazaar__face';
      face.setAttribute('aria-hidden', 'true');

      const shoulders = document.createElement('span');
      shoulders.className = 'bazaar__shoulders';
      shoulders.setAttribute('aria-hidden', 'true');

      const item = document.createElement('span');
      item.className = 'bazaar__good';
      item.textContent = person.good.glyph;
      item.setAttribute('aria-hidden', 'true');

      const number = document.createElement('span');
      number.className = 'bazaar__number';
      number.textContent = String(index + 1);
      number.setAttribute('aria-hidden', 'true');

      figure.append(shoulders, hoodShape, face, item);
      button.append(figure, number);
      this.crowd.append(button);
    });

    ctx.message('Pick the person who matches the broker’s description.');
  },

  choose(index) {
    if (this.locked || !this.alive) return;
    this.locked = true;

    const ctx = this.ctx;
    const buttons = this.crowd.querySelectorAll('.bazaar__person');
    buttons.forEach((button, personIndex) => {
      button.disabled = true;
      if (personIndex === this.targetIndex) button.classList.add('bazaar__person--mark');
      else if (personIndex === index) button.classList.add('bazaar__person--miss');
    });

    if (index === this.targetIndex) {
      ctx.addPoints(1);
      ctx.message('Clean work. The mark disappears into the crowd.');
    } else {
      const target = this.people[this.targetIndex];
      ctx.message(`Wrong person. The mark wore a ${target.hood.name} hood and carried ${target.good.name}.`);
    }

    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(ctx);
    }, BEAT_MS);
  },
};

export default game;