/* ---------------------------------------------------------------------------
   Assassin's Bazaar — find the mark.

   The broker gives you a description: one hood colour and one thing the
   target is carrying. Pick the matching figure from the nine market-goers.
   Each round makes nine distinct combinations, so the description always
   identifies exactly one person.
   --------------------------------------------------------------------------- */

import { plural } from '../dom.js';
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
  // Was a fan, but a lens with ribs radiating from a point reads as a flower at
  // 25px. A crier's bell has a silhouette nothing else in the set shares.
  { name: 'a bell', icon: 'M7 16a5 5 0 0 1 10 0v2H7v-2ZM5 18h14M10 18a2 2 0 0 0 4 0M12 11V9M10.4 7.4a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 1 1-3.2 0' },
  { name: 'a map', icon: 'm4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Zm5-2v14m6-12v14m-4-7 2-2 2 1' },
];

const CROWD_SIZE = 9;
const BEAT_MS = 850;

/** Scoring. Nothing is ever taken away: a wrong pick costs only the momentum you
    had built, so speed is a reward rather than a deadline. */
const BASE_MARKS = 1;
const QUICK_MS = 4000;
const QUICK_MARKS = 1;
const STREAK_EVERY = 4;

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

    const streakStat = document.createElement('div');
    streakStat.className = 'bazaar__stat';
    const streakLabel = document.createElement('span');
    streakLabel.className = 'bazaar__record-label';
    streakLabel.textContent = 'Clean streak';
    this.streakEl = document.createElement('strong');
    this.streakEl.className = 'bazaar__streak-value';
    this.streakEl.textContent = '0';
    streakStat.append(streakLabel, this.streakEl);

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
    fastestLabel.textContent = 'Fastest this run';
    this.fastestEl = document.createElement('strong');
    this.fastestEl.className = 'bazaar__record-value';
    fastestPick.append(fastestLabel, this.fastestEl);
    record.append(streakStat, currentPick, fastestPick);

    wrap.append(wanted, this.crowd, record);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.alive = true;
    this.fastestTime = null;
    this.streak = 0;
    this.fastestEl.textContent = this.fastestTime === null ? '—' : `${this.fastestTime} ms`;
    this.paintStreak();
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

  /** Momentum is the only thing a miss can take, so it is the headline readout. */
  paintStreak() {
    if (!this.streakEl) return;
    const streak = this.streak ?? 0;
    this.streakEl.textContent = String(streak);
    this.streakEl.classList.toggle('bazaar__streak-value--hot', streak >= STREAK_EVERY);
  },

  choose(index) {
    if (this.locked || !this.alive) return;
    this.locked = true;

    const ctx = this.ctx;
    const recognitionMs = Math.round(performance.now() - this.roundStartedAt);
    const isCorrect = index === this.targetIndex;
    const quick = isCorrect && recognitionMs <= QUICK_MS;
    this.currentPickStatusEl.textContent = isCorrect ? 'Correct' : 'Incorrect';
    this.currentPickTimeEl.textContent = quick ? `${recognitionMs} ms · quick` : `${recognitionMs} ms`;
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
      this.streak += 1;
      // The streak pays at every fourth clean read, and pays more each time.
      const milestone = this.streak % STREAK_EVERY === 0 ? this.streak / STREAK_EVERY : 0;
      const marks = BASE_MARKS + (quick ? QUICK_MARKS : 0) + milestone;
      ctx.addPoints(marks);
      this.paintStreak();

      if (this.fastestTime === null || recognitionMs < this.fastestTime) {
        this.fastestTime = recognitionMs;
        this.fastestEl.textContent = `${recognitionMs} ms`;
      }

      const earned = [];
      if (quick) earned.push('quick read');
      if (milestone) earned.push(`the streak pays ${milestone} more`);
      const aside = earned.length ? ` — ${earned.join(', ')}` : '';
      ctx.message(
        `Correct in ${recognitionMs} ms${aside}: ${marks} ${plural(marks, 'mark')}. Streak ${this.streak}.`,
      );
    } else {
      const target = this.people[this.targetIndex];
      const lost = this.streak;
      this.streak = 0;
      this.paintStreak();
      ctx.message(
        `Incorrect pick in ${recognitionMs} ms. The mark wore a ${target.hood.name} hood and carried ${target.good.name}. `
        + (lost > 0 ? `Streak ended at ${lost}.` : 'No streak to lose.'),
      );
    }

    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (!this.alive) return;
      this.newRound(ctx);
    }, BEAT_MS);
  },
};

export default game;