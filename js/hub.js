/* ---------------------------------------------------------------------------
   hub.js — renders the tavern hub from the registry in games.config.js.

   One flat list, one compact row per table. Fifteen tables across seven wings
   is too many wings to spend seven headings and seven blurbs on, so a wing is
   a label on the row rather than a section, and the whole catalogue fits in
   about two screens on a phone.

   The rules paragraph is absent by design: the play page's start panel is
   where the rules are read, and repeating one on every row is what made the
   hub unnavigable. Nothing here is hardcoded to a specific table — add an
   entry to GAMES and it appears, with its accent, its wing and its best score.
   --------------------------------------------------------------------------- */

import { el, plural } from './dom.js';
import { CATEGORIES, GAMES } from './games.config.js';
import { getBest, getRuns } from './store.js';

const root = document.querySelector('[data-hub]');

if (!root) {
  throw new Error('hub: no [data-hub] container on the page');
}

/**
 * Wing title and blurb by category id, so a row can name its wing.
 * `GAMES` is grouped by wing, so registry order also fixes the wing order.
 */
const WINGS = new Map(CATEGORIES.map((category) => [category.id, category]));

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

/* Every table, one compact row each --------------------------------------- */

const list = el('ul', 'tables');

for (const game of GAMES) {
  const wing = WINGS.get(game.category);
  const item = el('li', 'table');
  item.style.setProperty('--accent', game.accent);

  const link = el('a', 'table__link');
  link.href = `./games/play.html?game=${encodeURIComponent(game.id)}`;

  const main = el('div', 'table__main');

  // The wing is a label, not a control. With the sections gone this is the only
  // place a category shows, so it keeps the category's blurb as a tooltip.
  const wingLabel = el('div', 'table__wing', wing ? wing.title : '');
  if (wing) wingLabel.title = wing.blurb;
  main.append(wingLabel);

  main.append(el('h2', 'table__title', game.title));

  // Tagline and track share one line; the rules live on the play page.
  const sub = el('p', 'table__sub');
  sub.append(document.createTextNode(`${game.tagline} \u00b7 Themed after `));
  sub.append(el('strong', null, game.track.title));
  main.append(sub);

  link.append(main);

  const best = getBest(game.id);
  const runs = getRuns(game.id);
  const aside = el('div', 'table__aside');

  if (best > 0) {
    aside.append(el('span', 'table__best', `Best ${best} ${game.scoreLabel}`));
    aside.append(el('span', 'table__fresh', `${runs} ${plural(runs, 'run')}`));
  } else {
    aside.append(el('span', 'table__fresh', 'New'));
  }

  // The whole row is the link, so the arrow is decoration, not a control.
  const cta = el('span', 'table__cta', '\u2192');
  cta.setAttribute('aria-hidden', 'true');
  aside.append(cta);

  link.append(aside);
  item.append(link);
  list.append(item);
}

root.append(list);

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
