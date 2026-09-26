# What we're working on

The working queue, in priority order, one entry per table. This is the single
place to look. Update entries in place as they land; leave the shipped list at
the bottom alone.

Last updated: 2026-09-26

---

## 1. Higher or Lower — the hand-end transition

**Type:** design, plus one real bug. **Status:** not started.

The report, verbatim:

> higher / lower works great but it feels a little off after guessing wrong and
> banking? idk maybe something because the card changes

The table plays fine; the awkwardness is in the *transition out of a hand*. Both
endings — a miss and a bank — funnel into `newHand()`, which replaces
`this.current`, zeroes the pot, zeroes the streak and repaints **in one frame**.
So the card the player just acted on is swapped in the same frame the pot is
zeroed, with no stage of its own. And the bank beat (`BANK_MS` 450) is
*shorter* than the miss beat (`BEAT_MS` 1100), so the good outcome resolves
faster than the bad one and reads as a reset rather than a result.

**Test first:** watch a bank and decide whether the oddness is *the card
changing* or *the pot leaving*. Those lead to different fixes.

**Lead candidate:** make `BANK_MS` longer than `BEAT_MS` — almost certainly
right on its own. The other options (give the new hand its own stage, carry the
card across a bank, deal the new card on the next click instead of on a timer)
are written up in `plans/higher-lower.md` under "Reopened 2026-09-26", with a
caution against carrying the card, since banking is often how you *escape* a bad
one.

**Fix this while in there — it is a genuine bug.** `settleAtBell()` sets
`phase = 'settling'` but does not clear a pending `this.beat`, and `advance()`
guards only on `this.alive`, which stays true until the shell calls `stop()`. A
beat landing in the last ~1.2 s can therefore set `phase = 'awaiting'` and
`refresh()`, reopening the call and bank buttons *after* the house has settled —
anything built in that window is never settled and is silently lost. Clear
`this.beat` in `settleAtBell()` and have `advance()` check the phase as well.

**Files:** `js/games/higher-lower.js`; `css/games/higher-lower.css` only if the
new hand gets a stage of its own.

---

## 2. Pairs — stop fading matched cards

**Type:** cosmetic. **Status:** not started. Fully specified.

> in pairs, no need to fade the already matched cards, staying flipped up is
> already good enough

A matched pair is faded *as well as* left face-up, so the fade is doing no work.
Drop the faded state on a matched card and let face-up carry it — but keep
whatever still distinguishes a matched card from one merely turned over, if that
read matters.

**Files:** `css/games/pairs.css`, plus `js/games/pairs.js` only if that needs a
new class rather than an existing one restyled.

---

## 3. Blastfire — score the crossings, not the probing

**Type:** scoring. **Status:** not started. Fully specified.

> on blastfire you should only get 1 point for a completed game, and value should
> be "bogs crossed" no points for just patches.

- Only a completed crossing scores. Probing a patch scores nothing.
- **1 point per completed crossing**, so the score is a count of crossings, not
  a total of patches.
- `scoreLabel` becomes `'bogs crossed'`, so the HUD, the summary panel and the
  hub row all follow from that one field.

**Files:** `js/games/blastfire.js`, `js/games.config.js` (the `blastfire` entry:
`scoreLabel` and the rules text), `README.md` (the table row).

---

## Shipped — the baseline these sit on

- **The hub** is a flat list: one compact row per table, 15 of them, with the
  wing as a label on the row. No wing sections, no rules text on the hub (the
  play page's start panel shows the rules), and the columns step 1 / 2 / 3 at
  620px and 960px.
- **Pig** is one die plus a house that races you to 100 and always moves first,
  taking a random 3–9 a round. The **leg margin is the only thing that scores**;
  a banked pot pays nothing on its own. `scoreLabel` is `points`.
