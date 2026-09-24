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
  { name: 'a lantern', icon: 'M8 8h8l1 3v8H7v-8l1-3Zm2 0V5h4v3M7 12h10M10 15h4M9 19v2h6v-2' },
  { name: 'a scroll', icon: 'M8 5h8v14H8a2 2 0 0 1 0-4h8M8 5a2 2 0 0 0 0 4h8M11 12h3' },
  { name: 'a dagger', icon: 'm12 3 4 10-4 2-4-2 4-10Zm0 12v6m-3-3h6' },
  { name: 'a basket', icon: 'm5 10 2 10h10l2-10H5Zm2 0 2-5m8 5-2-5M9 11v8m6-8v8m-9-4h12' },
  { name: 'a bottle', icon: 'M10 4h4v4l2 2v10H8V10l2-2V4Zm0 3h4m-6 6h12' },
  { name: 'a flower', icon: 'M12 11c-4-5 2-8 2-3 4-5 7 1 1 3 6 2 2 7-2 2 0 7-6 5-2 0-5 4-8-2-2-3-6-1-4-7 1-3 1-6 7-6 3Zm0 3v8m0-4-3-2m3 4 3-2' },
  { name: 'a key', icon: 'M14 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-1 3 7 7-2 2-2-2-2 2-2-2 2-2-3-3' },
  { name: 'a fan', icon: 'M12 12 4 8a9 9 0 0 1 16 0l-8 4Zm0 0-7-1m7 1-5 3m5-3v7m0-7 5 3m-5-3 7-1' },
  { name: 'a map', icon: 'm4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Zm5-2v14m6-12v14m-4-7 2-2 2 1' },
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

function createGoodIcon(pathData) {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(namespace, 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.7');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  icon.append(path);
  return icon;
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

    const record = document.createElement('div');
    record.className = 'bazaar__record';
    const currentPick = document.createElement('div');
    currentPick.className = 'bazaar__stat';
    const currentPickLabel = document.createElement('span');
    currentPickLabel.className = 'bazaar__record-label';
    currentPickLabel.textContent = 'Last pick';
    this.currentPickEl = document.createElement('div');
    this.currentPickEl.className = 'bazaar__last-pick';
    this.currentPickStatusEl = document.createElement('strong');
    this.currentPickStatusEl.className = 'bazaar__record-value';
    this.currentPickTimeEl = document.createElement('span');
    this.currentPickTimeEl.className = 'bazaar__last-pick-time';
    this.currentPickEl.append(this.currentPickStatusEl, this.currentPickTimeEl);
    currentPick.append(currentPickLabel, this.currentPickEl);

    const fastestPick = document.createElement('div');
    fastestPick.className = 'bazaar__stat';
    const fastestLabel = document.createElement('span');
    fastestLabel.className = 'bazaar__record-label';
    fastestLabel.textContent = 'Fastest correct this run';
    this.fastestEl = document.createElement('strong');
    this.fastestEl.className = 'bazaar__record-value';
    fastestPick.append(fastestLabel, this.fastestEl);
    record.append(currentPick, fastestPick);

    wrap.append(wanted, this.crowd, record);
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
    this.fastestTime = null;
    this.fastestEl.textContent = this.fastestTime === null ? '—' : `${this.fastestTime} ms`;
    this.currentPickStatusEl.textContent = '—';
    this.currentPickTimeEl.textContent = '';
    this.currentPickStatusEl.classList.remove('bazaar__record-value--correct', 'bazaar__record-value--incorrect');
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
      item.append(createGoodIcon(person.good.icon));

      const number = document.createElement('span');
      number.className = 'bazaar__number';
      number.textContent = String(index + 1);
      number.setAttribute('aria-hidden', 'true');

      figure.append(shoulders, hoodShape, face, item);
      button.append(figure, number);
      this.crowd.append(button);
    });

    this.roundStartedAt = performance.now();
    ctx.message('Pick the person who matches the broker’s description.');
  },

  choose(index) {
    if (this.locked || !this.alive) return;
    this.locked = true;

    const ctx = this.ctx;
    const recognitionMs = Math.round(performance.now() - this.roundStartedAt);
    const isCorrect = index === this.targetIndex;
    this.currentPickStatusEl.textContent = isCorrect ? 'Correct' : 'Incorrect';
    this.currentPickTimeEl.textContent = `${recognitionMs} ms`;
    this.currentPickStatusEl.classList.toggle('bazaar__record-value--correct', isCorrect);
    this.currentPickStatusEl.classList.toggle('bazaar__record-value--incorrect', !isCorrect);

    const buttons = this.crowd.querySelectorAll('.bazaar__person');
    buttons.forEach((button, personIndex) => {
      button.disabled = true;
      if (personIndex === this.targetIndex) button.classList.add('bazaar__person--mark');
      else if (personIndex === index) button.classList.add('bazaar__person--miss');
    });
    if (isCorrect) buttons[index].classList.add('bazaar__person--correct');

    if (isCorrect) {
      ctx.addPoints(1);
      if (this.fastestTime === null || recognitionMs < this.fastestTime) {
        this.fastestTime = recognitionMs;
        this.fastestEl.textContent = `${recognitionMs} ms`;
      }
      ctx.message(`Correct pick in ${recognitionMs} ms. The mark disappears into the crowd.`);
    } else {
      const target = this.people[this.targetIndex];
      ctx.message(`Incorrect pick in ${recognitionMs} ms. The mark wore a ${target.hood.name} hood and carried ${target.good.name}.`);
    }

    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(ctx);
    }, BEAT_MS);
  },
};

export default game;