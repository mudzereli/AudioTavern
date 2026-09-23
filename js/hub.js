/* ---------------------------------------------------------------------------
   hub.js — renders the tavern hub from the registry in games.config.js.

   Nothing here is hardcoded to a specific table: add an entry to GAMES and it
   appears, grouped under its category, with its accent and its best score.
   --------------------------------------------------------------------------- */

import { CATEGORIES, gamesInCategory } from './games.config.js';
import { getBest, getRuns } from './store.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const root = document.querySelector('[data-hub]');

if (!root) {
  throw new Error('hub: no [data-hub] container on the page');
}

/* Header ------------------------------------------------------------------- */

const header = el('header', 'hub__header');
header.append(
  el('p', 'hub__kicker', 'TTAGames'),
  el('h1', 'hub__title', 'Small games, ten minutes each'),
  el(
    'p',
    'hub__blurb',
    'Every table is themed after a Tabletop Audio track and runs exactly as long as it. Press play, sit down, and try to beat your own best.',
  ),
);
root.append(header);

/* One wing per category ---------------------------------------------------- */

for (const category of CATEGORIES) {
  const wing = el('section', 'wing');
  wing.append(el('h2', 'wing__title', category.title), el('p', 'wing__blurb', category.blurb));

  const list = el('ul', 'tables');

  for (const game of gamesInCategory(category.id)) {
    const item = el('li', 'table');
    item.style.setProperty('--accent', game.accent);

    const link = el('a', 'table__link');
    link.href = `./games/play.html?game=${encodeURIComponent(game.id)}`;

    link.append(
      el('p', 'table__tagline', game.tagline),
      el('h3', 'table__title', game.title),
      el('p', 'table__rules', game.rules),
    );

    const track = el('p', 'table__track');
    track.append(document.createTextNode('Themed after '));
    track.append(el('strong', null, game.track.title));
    track.append(document.createTextNode(' on Tabletop Audio'));
    link.append(track);

    const best = getBest(game.id);
    const runs = getRuns(game.id);
    const meta = el('p', 'table__meta');

    if (best > 0) {
      meta.append(el('span', 'table__best', `Best ${best} ${game.scoreLabel}`));
      meta.append(el('span', 'table__fresh', `${runs} run${runs === 1 ? '' : 's'}`));
    } else {
      meta.append(el('span', 'table__fresh', 'Never played'));
    }

    link.append(meta);
    link.append(el('span', 'table__cta', 'Sit down \u2192'));

    item.append(link);
    list.append(item);
  }

  wing.append(list);
  root.append(wing);
}

/* Footer ------------------------------------------------------------------- */

const footer = el('footer', 'hub__footer');
footer.append(
  el(
    'p',
    null,
    'Sound is not streamed by this site. Each table links out to Tabletop Audio, which is free, advertising-free and funded by its listeners.',
  ),
);

const donate = el('a', null, 'Support Tabletop Audio \u2197');
donate.href = 'https://tabletopaudio.com/donate.html';
donate.target = '_blank';
donate.rel = 'noopener noreferrer';
footer.append(donate);

root.append(footer);
