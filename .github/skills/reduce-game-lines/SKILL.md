---
name: reduce-game-lines
description: "Use when reducing a TTAGames game module to 500 lines or fewer without splitting it into modules or removing blank lines."
---

# Reduce a TTAGames Game Module

Use this workflow when a user asks to bring a game's source file under a line
limit while keeping its implementation in one file.

## Requirements

- Count every physical line, including blank lines. Do not use a nonblank-line
  count or treat comment removal as permission to remove blank lines.
- Keep gameplay code in the requested game module. Do not move code into
  submodules, generated files, or other indirection to evade the limit.
- Preserve behavior, readability, accessibility, and project conventions.
- Trim redundant comments and refactor repetitive or unnecessarily verbose
  code when those changes remain clear and behavior-preserving.
- Keep comments that explain non-obvious rules, edge cases, or lifecycle
  constraints. Do not minify or pack unrelated statements onto dense lines.
- Preserve all pre-existing work in the target file and ignore unrelated
  worktree changes.

## Workflow

1. Confirm the target file and measure its full line count, including blank
   lines and any final empty line shown by the editor.
2. Read the whole file and inspect its existing changes before editing. Identify
   safe, local reductions; ask before making changes that alter game behavior.
3. Refactor only within the requested file. Keep blank lines intact, and aim
   below the limit with a small margin for editor line-count differences.
4. Recount the full file and verify it meets the limit.
5. Run available syntax checks and focused tests. For TTAGames, serve the site
   over HTTP and smoke-test the affected game when practical.
6. Report the final line count, what was reduced, files changed, and any
   validation not performed.
