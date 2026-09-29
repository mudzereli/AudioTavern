# Ship Graveyard: The Drowned Chart

Turn repeated salvage trips into one short voyage. The ten-minute run begins
with ordinary wrecks and a chart-fragment target, then reveals a final
high-value wreck. Delivered salvage remains the score; chart progress and
refits are run-only progression.

## Voyage

- Each expedition redraws the skiff, routes, wreck caches, and storm limit.
- One non-skiff wreck is marked as the chart-fragment objective until three
  fragments have been extracted. Searching it puts the fragment aboard; only a
  return to the skiff secures it. A capsize loses the carried fragment.
- After three delivered fragments, each new expedition marks the
  Graveyard's Heart. Every Heart is recovered by searching its wreck and
  delivered for a 25-point salvage bonus. A failed expedition loses the Heart;
  it can be attempted again without recollecting the charts. A successful Heart
  delivery resets chart progress to 0/3; collect and deliver three new fragments
  to reveal it again. This cycle repeats until the timed run ends.
- Only a delivered Heart awards a refit, selected uniformly from those not yet
  earned. Ordinary salvage returns award none. There are no duplicates, slots,
  or refit-choice controls. Every earned refit stays active through later
  expeditions and capsizes, then resets when a new timed run starts. Once all ten
  are earned, Hearts continue to award their salvage bonus but no refit.
- Ordinary salvage remains available throughout. Only extracted cargo and the
  recovered Heart bonus score.

## Passive Refits

| Refit | Effect |
| --- | --- |
| Sounding Glass | Shows exact cache sizes at every unsearched wreck. |
| Tide Reader | Shows base strain costs on every generated lane, including lanes not reachable from the current position. |
| Chartwright's Cut | Adds a low-risk lane from the skiff to the nearest wreck not already directly connected. |
| Salvage Winch | Quick takes up to 3 instead of 2, but costs 2 base strain instead of 1. |
| Diver's Saw | Stripping a faint wreck costs 2 base strain instead of 3. |
| Deepwater Hooks | First Strip of a strong wreck each expedition yields 1 extra cargo. |
| Sealed Hold | Cargo-strain thresholds shift from 5/9 to 7/11. |
| Storm Jib | First crossing while carrying cargo each expedition costs 2 less strain, minimum 1. |
| Keel Spurs | First crossing while empty each expedition costs 1 less strain, minimum 1. |
| Undertow Charm | Once per expedition, a capsize-triggering action automatically jettisons up to 2 cargo and removes 3 storm strain. Capsize still occurs if strain remains at the limit. |

Every modified route and action must show its actual cost before commitment.
One-use refits reset each expedition. Effects stack because all earned refits
remain active; tune the sea-condition ramp against the full collection rather
than assuming a two-refit loadout.

## Boundaries

- Fresh refits and chart progress each ten-minute run; no persistent unlocks or
  currency.
- A capsize loses only current cargo and any unextracted objective. Banked
  score, delivered fragments, Heart completion, and refits remain.
- Keep the existing travel, Quick, Strip, and Return verbs. Refits are passive;
  the player never activates them manually.
- Keep the random storm budget, route risks, caches, and starting skiff as the
  expedition-to-expedition variation. Preserve the score label, mouse and touch
  controls, and phone-sized chart.
- Keep `js/games/ship-graveyard.js` under 500 lines. Prefer compact data and
  shared cost helpers over per-refit branches spread across rendering code.

## Files

- `js/games/ship-graveyard.js` owns the voyage, condition, refit, and objective
  state.
- `css/games/ship-graveyard.css` styles chart targets and progression readouts.
- `js/games.config.js` explains the player-facing rules.