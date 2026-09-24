# Higher or Lower — the pot on the table

Rewritten 2026-09-24. The old table was a coin flip with a scoreboard: a fresh
shuffle every hand, one point a call, and two stats that almost always read the
same number. Nothing to read, nothing to decide, no reason to hold on.

## The pitch

Call the next card higher or lower. Every correct call grows the pot by your
streak squared, but the pot is only yours once you bank it — a wrong call takes
everything on the table, and a tie costs nothing.

The guess is read off the card rather than a printed number, and the house
settles any pot still on the table when the clock runs out.

## Decisions

- **The pot replaces the point.** A right call used to be worth 1 and nothing
  else. Now it is worth `streak ** 2`, and it is unbanked until you say so.
- **Banking ends the hand.** Without that, banking after every call would be
  free and optimal. Banking forfeits the ladder, which is the whole tension.
- **No safety net** (user's call). A miss burns the pot. This does depart from
  the repo note that a miss should cost momentum rather than points — but
  `pig.js` already wipes a round on a one, so there is precedent, and the pot is
  always the player's to bank.
- **No deck tracking, and no printed odds.** An earlier draft carried a tracked
  shoe whose depletion moved the counts, and then a readout printed under each
  call. Both were cut as too much code for a simple game (user, 2026-09-24). The
  pile that remains is only a source of physical cards, so the same card cannot
  appear twice in a pair and nothing ever runs out.
- **The read is the card face.** Reading the table is now a judgement rather than
  a number to compare against a threshold, so banking is a feel decision instead
  of an exact one. That is the honest cost of dropping the readout. An ace and a
  two still close the side they cannot beat, so there is no guaranteed-loss click.
- **The deck is continuous within a hand and fresh at the start of one.** There
  is no mid-hand reshuffle and no empty-deck rule, because nothing is tracked
  and nothing can run out.
- **Ties are free.** The card still advances, on its own, after a beat.
- **The manual "Next card" button is gone.** Correct calls, pushes and misses all
  advance themselves, which removes the dead air the old table was full of.
- **Two stats became three that differ.** "Current streak" and "highest streak"
  were the same number most of the time. They are now Streak, Next call pays, and
  Biggest pot — the last two being the two numbers the decision actually needs.
- `scoreLabel` is now `banked`, so the HUD and the summary read "347 banked".

## Why streak squared works

Because the pot is the running sum of squares, the confidence needed to justify
one more call climbs with the streak:

| streak | pot on the table | confidence needed to hold |
| --- | --- | --- |
| 1 | 1 | 20% |
| 2 | 5 | 36% |
| 3 | 14 | 47% |
| 4 | 30 | 55% |
| 5 | 55 | 60% |
| 6 | 91 | 65% |
| 8 | 204 | 72% |
| 10 | 385 | 76% |

So the skill is: hold while the card looks friendly, bank when it does not.
Banking every call yields 1 point per call, strictly worse than riding, so there
is no degenerate grind.

## Certainties

Aces are high, so an ace has nothing above it and a two nothing below. Those two
sides are closed rather than offered — the only calls that are impossible by
construction. Everything else is a judgement on the card in front of you.

## Timing and numbers

| constant | value | meaning |
| --- | --- | --- |
| `STEP_MS` | 420 | correct call or push, then the card advances itself |
| `BEAT_MS` | 1100 | a miss; long enough to see the card that beat you |
| `BANK_MS` | 450 | a bank; long enough to watch the pot leave the table |
| `CLOCK_MS` | 250 | how often the bell is checked |
| `SETTLE_MS` | 1200 | settle the pot this long before the clock stops |
| `LAST_CALL_MS` | 30_000 | from here the pot caption reads "last call" |

## The bell, and why it fires early

`submitScore` is fed the score captured by `onEnd({ score })`, and the shell calls
`game.stop(ctx)` *after* that capture. Points added from `stop()` therefore never
reach the summary panel. So the pot cannot be settled at the bell — it has to be
settled just before it, which is what `startClock()` and `settleAtBell()` do at
`SETTLE_MS`. Banking in `stop()` would silently lose the pot.

## Phases

`awaiting` → `settling` | `busted` | `banked` → `awaiting` …, plus `stopped`.
Only `awaiting` accepts a call or a bank, which is what `syncControls()` enforces:
the calls follow the printed odds and the bank follows the pot. Every timer
callback re-checks `alive` and the phase.

## Files

- `js/games/higher-lower.js` — the table, rewritten.
- `css/games/higher-lower.css` — the pot panel, the bank, and the last-call and
  lost states.
- `js/games.config.js` — the `higher-lower` entry: `scoreLabel: 'banked'` and new
  rules text.
- `README.md` — the table row.

No shared file changes: the table still fits the contract with `actionLabel: null`,
drawing its own three buttons and binding Left, Right and B itself.

## Notes for a first play

- A very long hand can bank several hundred at once, dwarfing the rest of the
  night. Left uncapped on purpose; the fallback is an auto-bank cap (e.g. 400).
- With no readout the entire tension sits in the banking decision, so the night
  reads as a series of hold-or-bank calls with nothing to calculate. If it ever
  feels too loose, printing the count of remaining cards above and below the card
  is a local change that would not touch the pot or banking logic.
- The burnt-pot cue is a static colour and caption change, never an animation,
  because `css/tokens.css` neutralises all CSS animation under
  `prefers-reduced-motion`.
