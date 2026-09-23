/* ---------------------------------------------------------------------------
   dice.js — rolling dice, drawing pips, and the subset search Bones needs.

   Shared by Bones and Pig so neither table reinvents a die.
   --------------------------------------------------------------------------- */

/**
 * Pip layouts for a d6. Cells are numbered left to right, top to bottom:
 *
 *   1 2 3
 *   4 5 6
 *   7 8 9
 */
const PIPS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

/** Roll `count` dice of `sides` sides. Returns an array of values. */
export function roll(rng, count = 1, sides = 6) {
  const values = [];
  for (let i = 0; i < count; i += 1) {
    values.push(1 + Math.floor(rng() * sides));
  }
  return values;
}

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

/** A single die as a DOM node. */
export function renderDie(value) {
  const die = document.createElement('span');
  die.className = 'die';
  die.setAttribute('role', 'img');
  die.setAttribute('aria-label', String(value));

  const cells = PIPS[value] || [5];
  for (const cell of cells) {
    const pip = document.createElement('span');
    pip.className = 'die__pip';
    pip.style.gridRow = String(Math.floor((cell - 1) / 3) + 1);
    pip.style.gridColumn = String(((cell - 1) % 3) + 1);
    die.append(pip);
  }

  return die;
}

/** A group of dice as a DOM node. */
export function renderDice(values) {
  const group = document.createElement('span');
  group.className = 'dice';
  for (const value of values) group.append(renderDie(value));
  return group;
}

/**
 * Every subset of `values` that adds up to exactly `target`.
 *
 * Returns an array of subsets (each an array of the original values). Used by
 * Bones to decide whether a roll is still playable — a 9-tile board is only
 * 511 subsets, so brute force is instant and far clearer than anything clever.
 */
export function subsetsSummingTo(values, target) {
  const found = [];
  const count = values.length;

  for (let mask = 1; mask < 1 << count; mask += 1) {
    let total = 0;
    const subset = [];
    for (let i = 0; i < count; i += 1) {
      if (mask & (1 << i)) {
        total += values[i];
        subset.push(values[i]);
      }
    }
    if (total === target) found.push(subset);
  }

  return found;
}
