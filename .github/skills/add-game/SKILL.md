---
name: add-game
description: "Use when designing or implementing a conventional new TTAGames game, including its rules, registry entry, game module, stylesheet, README listing, and validation."
---

# Add a TTAGames Game

Use this workflow to add one self-contained game that follows the repository's
current conventions. Treat `.github/copilot-instructions.md` and the existing
source code as authoritative; consult them rather than restating their full
contents here. Keep the change focused. Do not change the shared shell, runner,
loader, or storage unless the requested feature genuinely cannot work without
it.

## Workflow

1. **Inspect the project guidance and architecture.** Read
   `.github/copilot-instructions.md`, the "Adding a table" and relevant rules
   sections of `README.md`, and `js/games.config.js`. Confirm the current game
   contract and loading behavior in `js/shell.js` and `games/play.html`.

2. **Study comparable games before proposing mechanics.** Search `js/games/`
   and `css/games/` for games with similar interactions, timing, scoring, or
   board layout. Read their implementations and relevant styles. Reuse
   established helpers and patterns where they fit; do not import another
   game's module or couple the new game to it.

3. **Check design notes.** Look for a relevant `plans/<id>.md` or other
   directly related note in `plans/`. Read any that exist; if none apply, say
   so rather than assuming decisions from unrelated plans.

4. **Settle the design before coding.** Summarize the proposed rules, game
   states and round flow, player controls, scoring and end-of-run behavior.
   Identify unresolved decisions that materially affect play, scoring, or
   track/theme metadata. Ask the user about those ambiguities with the
   `ask_user` tool, one focused question at a time, and wait for answers before
   implementing the dependent behavior. Do not invent rules, scoring,
   category choices, or track metadata. In particular, get the actual
   Tabletop Audio track title and hosted audio URL from the user or a
   repository source; never fabricate them. Once key decisions are settled,
   state the resulting compact design before implementation.

5. **Register the game.** Add one entry to `GAMES` in
   `js/games.config.js` with a unique kebab-case ID, title, tagline, existing
   category, accent, meaningful `scoreLabel`, player-facing `rules`,
   appropriate `actionLabel`, and verified track metadata (`title`,
   `audioUrl`, and `soundUrl`). Only add a category if the agreed design
   genuinely needs one. The registry drives hub presentation and game loading.

6. **Implement only the game surfaces.** Create
   `js/games/<id>.js` and `css/games/<id>.css`. Follow the existing
   `mount(ctx)`, `start(ctx)`, `stop(ctx)`, and optional `act(ctx)` contract;
   build game DOM inside `ctx.stage`. Configure a shell action button when
   there is one primary action; otherwise render the game's own visible,
   operable controls. Use game-specific class names and existing shared
   styles/helpers. Update the game table in `README.md`.

7. **Preserve project behavior.** Follow the lifecycle, scoring, seeded RNG,
   audio independence, accessibility, reduced-motion, mobile/touch, and timer
   cleanup requirements in the project instructions and source. Award every
   point before the run ends: the shell captures the final score before
   `stop(ctx)`. Read `ctx.rng` live because it is replaced for each run. Do not
   depend on track playback, add keyboard shortcut handlers, leave callbacks
   running after stop, or introduce unrelated shared-code changes.

8. **Validate what is available.** Check the changed JavaScript and CSS for
   errors using tools already available in the project; do not add a build,
   linter, test runner, or dependency just for this task. The repository
   documents that it has no build, linter, or test runner, so do not imply
   automated tests exist or passed. Smoke-test over HTTP (for example,
   `py dev_server.py 8000` and `games/play.html?game=<id>`): confirm the hub
   entry and game load, exercise the designed interactions and scoring, test
   restart and run-end behavior where practical, and check that audio can be
   declined. Check touch-sized controls, narrow phone layout without horizontal
   overflow, browser-native keyboard access, and reduced-motion behavior.
   Report anything not exercised as unverified.

9. **Review and report.** Inspect the Git diff, including untracked files
   created for the task. Confirm only intended files changed and preserve
   unrelated work. Report every changed file, validation commands and their
   actual results, browser smoke-test results, and anything that remains
   unverified. Never claim a check passed unless it was run and passed.
