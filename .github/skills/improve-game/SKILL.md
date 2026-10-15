---
name: improve-game
description: "Use when reviewing, brainstorming, redesigning, tuning, playtesting, or implementing improvements to an existing TTAGames game."
---

# Improve a TTAGames Game

Act as a game designer, critical reviewer, and playtester—not just a code
refactorer. Help the user understand how the game plays, identify changes that
could make it more enjoyable, discuss tradeoffs, and implement only the changes
they choose. Follow `.github/copilot-instructions.md` and the existing game
patterns as the authority. This skill adds an improvement workflow; it does not
replace project-wide requirements.

## Match the user's intent

- **Brainstorming or review:** inspect and report; do not modify files.
- **Design discussion:** propose concrete rule or tuning changes and explain
  their benefits, costs, and risks before implementation. Keep the discussion
  open to the user's preferences.
- **Explicit implementation request:** implement the requested, agreed scope
  with focused changes, then validate it.
- **Ambiguous edit intent or scope:** ask the user before changing files.

Do not treat a request such as "How can we make this game more fun?" as
permission to edit. For iterative conversations, present options, let the user
choose, and keep unselected ideas out of the implementation.

## Workflow

1. **Understand the game in context.** Identify the target game and inspect its
   module, stylesheet, registry rules and scoring label, README entry, and any
   relevant `plans/` notes. Trace the behavior that matters through shared
   systems such as `js/shell.js`, `js/run.js`, `js/store.js`, `js/rng.js`, or
   `js/dom.js` as appropriate. Compare related games when their mechanics or UI
   offer useful precedent. Distinguish documented intent from behavior
   observed in code; verify conflicts instead of assuming comments are current.

2. **Evaluate the play experience.** Apply only criteria relevant to this
   game's mechanics. Consider whether choices matter and have understandable
   consequences; whether strategy can develop; whether risk and reward create
   useful tension; and whether difficulty, pacing, feedback, and clarity help
   the player make informed decisions. Look for repetitive actions, dominant
   strategies, trivial or impossible states, degenerate scoring, exploits,
   weak replayability, and ways the loop may become tedious or exhausting over
   the ten-minute run. Preserve the game's identity and strengths; do not add
   complexity merely to add features.

3. **Ground the diagnosis in evidence.** Separate directly observed problems
   from hypotheses about player experience. When possible, walk through
   representative turns, states, and edge cases; calculate example scores or
   compare alternative choices. Explain what evidence would confirm a
   hypothesis. A successful load or compile is not evidence that a mechanic is
   fun, engaging, or balanced.

4. **Recommend focused improvements.** Give specific changes tied to the
   identified weaknesses. Rank them by expected gameplay benefit,
   implementation effort, and regression risk, explaining the ranking briefly.
   Prefer high-impact, low-risk improvements and separate optional ideas from
   the core recommendation. Explain meaningful tradeoffs; do not silently
   decide contested rules, difficulty, penalties, caps, or scoring. Ask the
   user when those choices materially change the game.

5. **Agree on scope before design-led edits.** For a redesign or tuning request,
   summarize the proposed rules, interaction changes, scoring effects,
   difficulty/pacing impact, and relevant edge cases before implementing.
   Confirm choices that remain ambiguous with the user, one focused question
   at a time. Do not expand the agreed scope into unrelated cleanup or feature
   work.

6. **Implement narrowly when authorized.** Follow the existing game contract:
   `mount(ctx)`, `start(ctx)`, `stop(ctx)`, and optional `act(ctx)`. Keep the
   game independent and update its directly related registry rules, README, or
   design note when behavior changes. Avoid shared-shell, runner, loader, or
   storage changes unless the feature genuinely requires them; explain why if
   it does. Preserve unrelated work and inspect current changes before editing
   shared files.

7. **Preserve project requirements.** Award all score before the run ends,
   because the shell captures the score before `stop(ctx)`. Read `ctx.rng` live;
   the shell replaces it for each run. Keep gameplay independent of audio and
   preserve Tabletop Audio hosting, unmodified audio, and visible creator and
   license attribution. Retain touch-friendly narrow-screen layouts,
   perceivable controls and status, browser-native keyboard access, no custom
   keyboard shortcuts, reduced-motion fallbacks, and reliable cleanup of
   timers/listeners. Do not introduce unrelated dependencies.

8. **Verify the actual change.** Use validation tools that exist in the
   repository and the changed code's environment; do not invent commands,
   add tooling unnecessarily, or claim checks that were not run. Where
   possible, play the affected game in a browser over HTTP and test the
   changed interactions, scoring, restart/end behavior, and representative
   edge cases. Check phone-width/touch behavior, accessibility, reduced motion,
   and audio-independent play when relevant. Consider regressions to adjacent
   mechanics and saved scores. Report checks that were impossible or not
   performed as unverified. The project currently documents no build, linter,
   or test runner; verify available tools rather than assuming they exist.

9. **Review and report.** Review the Git diff, including untracked files, and
   confirm only intended files changed. Summarize the diagnosis, selected
   improvements and why they should help, all changed files, validation and
   actual results, and remaining uncertainty or risk. For review-only requests,
   state clearly that no files were changed.
