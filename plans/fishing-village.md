# Fishing Village

A peaceful shoreline fishing game for Tabletop Audio track 167. Choose a spot, cast, wait for the float to dip, and fill a catchbook as time and weather change what can be caught. Villager requests are not part of the game.

## Loop

1. Read the current day/night and weather condition, the spot odds, and the `X / 18 found` catchbook progress.
2. Click a spot to cast. The line stays out for four seconds; all spots lock while the float drifts. The catch resolves automatically, without timing input.
3. Common, uncommon, and rare fish are worth 1, 2, and 3 points. A species' first catch in the run pays 10 times its value; repeats pay normal value. Update the inline slot, total-fish count, and rare-fish count on reveal.
4. Conditions advance each minute: day-clear, day-rain, night-rain, night-clear, then repeat. The catchbook resets every ten-minute run; best score remains the persistent replay target.

## Spots and fish

| Spot | Clue | Common | Uncommon | Day-clear rare | Day-rain rare | Night-rain rare | Night-clear rare |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Village Pier | Silver flashes gather around the pilings. | Herring | Mackerel | Sea Bass | Cod | Bluefish | Eel |
| Reedbank | Small ripples stir between the reeds. | Roach | Perch | Pike | Tench | Burbot | Walleye |
| Breakwater | Gulls wheel above the deeper water. | Goby | Flounder | Sea Trout | Haddock | Conger Eel | Pollock |

Each spot has one common and one uncommon fish available in every condition, plus one rare species for each condition. The normal common / uncommon / rare mix is 55/30/15 for day-clear, 50/30/20 for day-rain, 40/30/30 for night-rain, and 50/30/20 for night-clear. Every cast also has a 2% chance to catch one of the spot's rare fish from another condition, chosen evenly among the other three; the remaining 98% follows the normal mix. A catch uses the conditions active when the bite resolves. Each species is shown as a slot in a compact grid within its spot card. Empty slots are outlined; caught species are marked and show their repeat count. Rare species for other conditions remain visible but subdued with their condition label. Collected out-of-season rare slots retain a stronger filled appearance. No tab or additional collection screen is used.

## Boundaries

- First discoveries are worth 10 times base rarity value for that catch only; repeats always score. Rare catches receive a high-contrast gold reveal.
- No requests, penalties, inventory, equipment, bait, boat travel, or extra scoring layer.
- The shell's ten-minute clock is the only overall timer. Derive condition from its elapsed time, pause the cast wait while the tab is hidden, cancel it on stop, and never award a catch after run end. Gameplay does not depend on the audio playing.
- Use seeded `ctx.rng` for catches; keep the game module under 500 lines.
