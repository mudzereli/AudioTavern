# Wizard's Tower

Track 174, Wizard's Tower. A cheerful rune-routing puzzle about carrying starlight from the tower to a ritual altar.

## Loop

- Click or tap a rune to rotate it 90 degrees clockwise.
- Link matching ports from the source at the top-left to the altar at the bottom-right. A circuit only conducts through reciprocal ports.
- Each completed circuit scores one rite, then a fresh puzzle begins.
- Puzzles use a 4x4 board for the first four rites and a 5x5 board after that.

## Generation and difficulty

- Generate each solution as a randomized cardinal path from the source to the altar, then rotate some route tiles away from their solved orientation.
- Fill off-route regions that touch at most one route tile with randomly oriented two-port decoy branches. In regions with multiple route contacts, only an individual tile touching one route tile may get two ports; all others stay single-port.
- Require every generated route to leave at least one safe branch cell; both board sizes have a solvable fallback route.
- Increase the number of scrambled route tiles as rites accumulate.
- Bound the randomized search and fall back to a valid monotone path, so every board remains solvable.
- Use the seeded `ctx.rng` for route choice, decoys, and scramble orientations.

## Boundaries

- No special tiles, failure penalties, internal timer, or dependence on the audio track.
- Award points only when a source-to-altar circuit is completed.
- Keep the game-specific module under 500 lines; styling belongs in its own stylesheet.
