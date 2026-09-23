/* ---------------------------------------------------------------------------
   rng.js — a seeded random number generator.

   Every run gets its own generator, handed to the games through the shell
   context. Seeding it means a run is reproducible if we ever want to replay
   one, and it keeps the games free of direct Math.random() calls.
   --------------------------------------------------------------------------- */

/** A fresh, unpredictable seed. */
export function randomSeed() {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

/**
 * Mulberry32. Small, fast, and good enough for dice and cards.
 * Returns a function producing floats in [0, 1).
 */
export function createRng(seed) {
  let a = (seed >>> 0) || 1;

  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max], both inclusive. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** A random element. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** A shuffled copy. The original is left alone. */
export function shuffle(rng, items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
