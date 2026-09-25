/* ---------------------------------------------------------------------------
   dom.js — the small helpers every file was writing for itself.

   `el` was the same six lines in the shell, the hub and four tables. `plural`
   was spelled out by hand at nine call sites. `svgEl` and `svgPath` were written
   twice over for the tables that draw their own pieces. None of it belongs to a
   single table: it is shared vocabulary, so it lives here and nowhere else.
   --------------------------------------------------------------------------- */

/** A small element with a class and optional text. */
export function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

/**
 * The word on its own, so it composes inside a sentence:
 * `${marks} ${plural(marks, 'mark')}` reads "1 mark" or "4 marks".
 * Pass pluralWord for the irregulars, e.g. plural(3, 'wolf', 'wolves').
 */
export function plural(count, word, pluralWord) {
  if (count === 1) return word;
  return pluralWord || `${word}s`;
}

/**
 * An SVG node. A table that draws its own pieces — a bug, a bonfire — builds
 * them with this rather than spelling out createElementNS every time.
 */
export function svgEl(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

/** A stroked line, which is all a leg, an antenna or a limb has to be. */
export function svgPath(d, width = 1.6) {
  return svgEl('path', {
    d,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
}
