# TTAGames project instructions

## Architecture and mapping

- This is a dependency-free static site using browser ES modules. The hub is `index.html` + `js/hub.js`; `games/play.html` loads a selected game by `?game=<id>`.
- `js/games.config.js` is the live game-to-track mapping source: `GAMES` defines each game's ID, presentation, rules, and track title/URLs. Keep IDs aligned with `js/games/<id>.js` and `css/games/<id>.css`. `assets/img/tracks.lua` is a separate catalogue, not the runtime registry.
- `js/shell.js` owns shared game UI and lifecycle; `js/run.js` owns the clock and score; `js/store.js` persists scores and run progress. Shared styles are in `css/tokens.css`, `css/hub.css`, and `css/game.css`; plans and further conventions are in `plans/` and `README.md`.

## Game changes

- A game module exports `mount(ctx)`, `start(ctx)`, `stop(ctx)`, and optionally `act(ctx)`. Build its UI inside `ctx.stage`; use the shell context for score, status, controls, and run state.
- Award all points before the run ends: the shell captures the final score before calling `stop(ctx)`, so points awarded from `stop()` do not count.
- Use the seeded `ctx.rng` for randomness, and read it live rather than caching it across runs; the shell replaces it for each run.
- Keep each game independent, with its own module and stylesheet. Avoid unrelated edits and unnecessary dependencies.

## UX, audio, and accessibility

- Design and validate for narrow phone screens and touch: visible, comfortably usable controls; no horizontal overflow or hover-only information. Do not add keyboard shortcut handlers. Preserve browser-native keyboard access to controls.
- Respect reduced-motion preferences; JavaScript-driven cues need a static fallback. Keep status and controls perceivable and usable.
- Games must work without audio. Keep Tabletop Audio audio hosted there and unmodified, and retain visible creator and license attribution. Verify actual player behavior before changing track handling; comments or documentation may be stale.

## Run and validate

- Serve over HTTP; opening `index.html` through `file://` does not work with ES modules. From the repository root run `py dev_server.py 8000` (or `python dev_server.py 8000`) and open `http://localhost:8000/`. `start.cmd` is the Windows launcher.
- There is no build, linter, or test runner. After changes, use the browser to smoke-test the hub and affected game, including its interactions, audio-independent behavior, and phone-width layout. Run any relevant checks available in the changed code's environment.

Keep documentation consistent with the code. When comments, README text, and observed behavior conflict, inspect and verify the implementation, then update directly related documentation when behavior changes.
