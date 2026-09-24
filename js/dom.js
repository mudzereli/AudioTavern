/* ---------------------------------------------------------------------------
   dom.js — the two helpers every file was writing for itself.

   `el` was the same six lines in the shell, the hub and four tables. `plural`
   was spelled out by hand at nine call sites. Neither belongs to a table: they
   are shared vocabulary, so they live here and nowhere else.
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
