# All Hallows' Eve — judgement at the door

A new table for the Tabletop Audio track `230_All_Hallows_Eve.mp3`
(horror / cities / planar / mysterious / monster / investigate / sneak).

## The pitch

Someone knocks. You read six signs through the frosted glass — shadow, breath,
knocks, hounds, lantern, gate — and the ledger reports only what you can see.
The living break none of the signs. The dead break exactly one.

Offer the living a soul cake, bar the door on the dead. A wrong judgement, or no
judgement at all, ends the night, and what you have earned is kept.

## Decisions

- Folded into the existing `watch` category ("The Night Watch"), which is now a
  three-table wing, so its blurb was rewritten.
- One wrong call ends the night, points banked — the Blastfire / Higher-or-Lower shape.
- All six ledger rows are shown every visitor, in a fixed order, so scanning is
  positional and never re-learned.
- A short free read follows the knock before the window opens, and the player may
  skip it by answering.
- Scoring is a speed bonus times an in-night streak multiplier.
- A night is eight clean judgements; dawn pays a bonus and the next night is harder.
- A death costs one tier: the next night starts at `max(1, night - 1)`.
- Difficulty never plateaus — the window keeps shrinking to a 1.1s floor.
- The dead break exactly one sign, always. No false alarms, no ambiguity.
- No scripted opener: the always-open lore panel and the reveal feedback teach.
- Clarity pass 2026-09-24: the mapping from visitor to judgement was only in the
  rules panel, which is read once. Each button now carries a sublabel naming who
  it is for ("the dead" / "the living"), and the lore list was retitled from
  "The keeper's lore" to "The dead — and the sign each one breaks", so the list
  at the bottom reads as a list of the dead rather than of signs to check.
- Tuned 2026-09-24 after the first play. The complaint was not the ramp but the
  time to read: six rows of prose plus a choice did not fit in the window. So the
  free read got long (`READ_MS` 2600), the window got generous
  (`WINDOW_BASE_MS` 6000, floor 2200), and the meter now names its phase — it
  reads "Read the signs" and stays grey while nothing is counting. The ramp in
  reporting rows per night and the wording of the values were both left alone.

## Design invariants

1. The scene never leaks a sign value. The silhouette has no props, is blurred
   behind frost, and its size is independent of what is behind the door. The
   knock cue is a single neutral rap — never a count that could match the
   KNOCKS row.
2. Reported rows are styled identically whether the visitor lives or not. No
   colour, weight or glyph differs before the judgement. The whole puzzle is the
   wording of the value.
3. Every unreported row reads the identical words `nothing to report`, dimmed. A
   quiet row can never be the anomaly, so per-sign quiet phrasing was rejected —
   the natural wording for GATE and for its broken value were nearly the same
   sentence.
4. Rows sit in a fixed canonical order: SHADOW, BREATH, KNOCKS, HOUNDS, LANTERN,
   GATE.
5. A quiet row is never the anomaly, and the number of reporting rows is the same
   for living and dead visitors: the tell is *swapped into* the observed set
   rather than appended, so the count never becomes a clue.

## Signs

| row | living value | broken value | spirit |
| --- | --- | --- | --- |
| SHADOW | one, and cast long | none at all | The Thin Woman |
| BREATH | fogs in the cold | no fog, no breath | The Hollow Child |
| KNOCKS | three, patient | four, and the fourth comes late | The Late Guest |
| HOUNDS | the village hounds are up | the hounds do not stir | The Quiet Guest |
| LANTERN | their lantern burns warm | unlit, and still you see the face | The Lantern Man |
| GATE | the gate creaks behind them | the gate is still | The One Already In |

## Timing and numbers

| constant | value | meaning |
| --- | --- | --- |
| `TICK_MS` | 40 | one clock drives both phases |
| `ARRIVE_MS` | 450 | the knock, before anything is answerable |
| `READ_MS` | 2600 | free read; answering now pays the full speed bonus |
| `WINDOW_BASE_MS` | 6000 | window on night 1 |
| `WINDOW_STEP_MS` | 180 | minus this per night |
| `WINDOW_MIN_MS` | 2200 | floor; never plateaus below it |
| `OBSERVED_BASE` / `MAX` | 2 / 6 | `min(2 + night, 6)` rows report anything |
| `REWARD_BASE` | 10 | before speed and streak |
| `SPEED_MAX` | 2 | `1 + windowLeft / window`, so 1.0 slow to 2.0 instant |
| `STREAK_STEPS` | 1, 1, 1.5, 1.5, 2, 2, 2.5, 2.5 | ladder peaks as dawn arrives |
| `DAWN_EVERY` | 8 | clean judgements to dawn |
| `DAWN_BONUS_BASE` / `STEP` | 50 / 25 | `50 + 25 * (night - 1)` |
| `DEAD_SHARE_*` | 0.35 + 0.05/night, max 0.6 | how often the door gets the dead |
| `BEAT_MS` / `NIGHT_END_MS` / `DAWN_SETTLE_MS` | 620 / 2200 / 2600 | settle pauses |

## Phases

`idle` → `arriving` → `reading` → `deciding` → `won` | `lost` → settle → `arriving` …
plus `paused` (tab hidden) and `stopped`. `judge()` is legal in `reading` and
`deciding` only. Every timer callback re-checks `alive` and the phase.

Pausing clears the interval and stores what was left of the phase; resuming
restarts the clock with the remainder, so a hidden tab costs nothing.

## Files

- `js/games.config.js` — the `all-hallows-eve` entry and the rewritten `watch` blurb.
- `js/games/all-hallows-eve.js` — the table.
- `css/games/all-hallows-eve.css` — the door scene, the ledger and the window.
- `README.md` — the table row.

No shared file changes: the game fits the existing contract with `actionLabel: null`,
drawing its own two buttons.
