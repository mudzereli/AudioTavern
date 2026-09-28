# Fishing Village

A quiet shoreline collection game for Tabletop Audio track 167. Each ten-minute run is a sequence of short collection sets: choose a spot, cast, and collect the twelve species available in that set. Weather and time shift the catch mix. Villager requests are not part of the game.

## Loop

1. A set randomly selects four of the six fish at each spot. The other two are unavailable and do not appear in the interface for that set.
2. Read the current day/night and weather, each available species' catch chance, each spot's no-bite chance, and progress toward the set's `12` fish.
3. Click a spot to cast. All spots lock for four seconds while one quiet ripple cues the drifting float. The result is automatic; there is no timing input.
4. A roll for an unavailable fish is an empty bite. It is not rerolled, redistributed, or scored. The result names no fish, preserving the blackout.
5. Catch all twelve available species to earn 30 bonus points. A fresh randomized set appears immediately; the ten-minute clock continues.
6. Common, uncommon, and rare fish are worth 1, 2, and 3 points. Each species' first catch in the entire run pays 10 times its value; repeats pay normal value, even when a new set begins. Set progress resets, but run-wide counts and score do not.

## Spots and fish

| Spot | Clue | Common | Uncommon | Day-clear rare | Day-rain rare | Night-rain rare | Night-clear rare |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Village Pier | Silver flashes gather around the pilings. | Herring | Mackerel | Sea Bass | Cod | Bluefish | Eel |
| Reedbank | Small ripples stir between the reeds. | Roach | Perch | Pike | Tench | Burbot | Walleye |
| Breakwater | Gulls wheel above the deeper water. | Goby | Flounder | Sea Trout | Haddock | Conger Eel | Pollock |

Each spot keeps the same six-species catalogue, but each set selects four uniformly at random without replacement. Selection may include any combination of commons, uncommons, and rares. Only the four selected fish appear in the interface; the other two have no visible entry, name, or illustration. A later set can make those fish available.

Every condition uses the same outcome rates: 40% common, 20% uncommon, 18% current-condition rare, 10% for each of the two out-of-season rares that share either the time or weather, and 2% for the out-of-season rare that matches neither. This makes 40% total rare outcomes. A blocked result becomes a no-bite rather than being reassigned. A catch uses the condition active when the bite resolves.

An available common shows 40%, an uncommon 20%, an in-season rare 18%, each partially matching out-of-season rare 10%, and the fully mismatched out-of-season rare 2%. A spot's displayed no-bite chance is the sum of all blocked outcomes. Those outcomes plus available-fish chances total 100%.

The inline field guide uses distinct inked silhouettes. Available, uncaught fish show their name, current catch chance, and run catch count; caught-this-set fish are marked. Unavailable fish are omitted entirely. Show progress per spot (`0 / 4`) and per set (`0 / 12`). A set completion receives a brief visual celebration before the next set appears. No separate collection screen is used.

## Boundaries

- Set completion pays 30 points. First-discovery multipliers are run-wide and cannot be earned again by resetting the collection set.
- Rare catches receive a high-contrast gold reveal. Empty bites are clear, quiet feedback and award no points.
- No requests, penalties, inventory, equipment, bait, boat travel, or persistent collection progression.
- The shell's ten-minute clock is the only overall timer. Derive condition from elapsed time, pause the cast wait while the tab is hidden, cancel it on stop, and never award a catch after run end. Gameplay does not depend on audio.
- Use seeded `ctx.rng` for pool selection and catches. Keep `js/games/fishing-village.js` at or below 500 lines; fish art lives in `assets/img/fishing-village-fish.svg`.
