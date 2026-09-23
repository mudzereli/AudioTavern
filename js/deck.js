/* ---------------------------------------------------------------------------
   deck.js — a 52-card deck and the card DOM node.

   Aces are high, so a card's `value` is 2-14 and comparing two cards is just
   comparing two numbers.
   --------------------------------------------------------------------------- */

export const SUITS = [
  { id: 'spades', glyph: '\u2660', name: 'spades', red: false },
  { id: 'hearts', glyph: '\u2665', name: 'hearts', red: true },
  { id: 'diamonds', glyph: '\u2666', name: 'diamonds', red: true },
  { id: 'clubs', glyph: '\u2663', name: 'clubs', red: false },
];

const RANK_NAMES = {
  A: 'ace',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  J: 'jack',
  Q: 'queen',
  K: 'king',
};

export const RANKS = [
  { label: 'A', value: 14, name: RANK_NAMES.A },
  { label: '2', value: 2, name: RANK_NAMES[2] },
  { label: '3', value: 3, name: RANK_NAMES[3] },
  { label: '4', value: 4, name: RANK_NAMES[4] },
  { label: '5', value: 5, name: RANK_NAMES[5] },
  { label: '6', value: 6, name: RANK_NAMES[6] },
  { label: '7', value: 7, name: RANK_NAMES[7] },
  { label: '8', value: 8, name: RANK_NAMES[8] },
  { label: '9', value: 9, name: RANK_NAMES[9] },
  { label: '10', value: 10, name: RANK_NAMES[10] },
  { label: 'J', value: 11, name: RANK_NAMES.J },
  { label: 'Q', value: 12, name: RANK_NAMES.Q },
  { label: 'K', value: 13, name: RANK_NAMES.K },
];

/** A full deck, unshuffled. */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rank.value });
    }
  }
  return deck;
}

/** "Queen of hearts" — for announcements. */
export function cardLabel(card) {
  return `${card.rank.name} of ${card.suit.name}`;
}

/** "Q♥" — for tight spots. */
export function cardShort(card) {
  return `${card.rank.label}${card.suit.glyph}`;
}

/** A card as a DOM node. */
export function renderCard(card, { faceDown = false } = {}) {
  const node = document.createElement('div');
  node.className = 'card';

  if (faceDown) {
    node.classList.add('card--back');
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', 'face-down card');
    return node;
  }

  if (card.suit.red) node.classList.add('card--red');
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', cardLabel(card));

  const corner = document.createElement('span');
  corner.className = 'card__corner';

  const rank = document.createElement('span');
  rank.className = 'card__rank';
  rank.textContent = card.rank.label;

  const cornerSuit = document.createElement('span');
  cornerSuit.className = 'card__suit';
  cornerSuit.textContent = card.suit.glyph;

  corner.append(rank, cornerSuit);

  const pip = document.createElement('span');
  pip.className = 'card__pip';
  pip.textContent = card.suit.glyph;

  node.append(corner, pip);
  return node;
}
