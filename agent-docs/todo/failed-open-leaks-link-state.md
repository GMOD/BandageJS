---
name: failed-open-leaks-link-state
description:
  The view and walks a link asks for stay in module state when its graph fails
  to open, and apply to the next graph opened.
metadata:
  category: ready
  area: links
  first_move: 'Clear the asked view and walks on the failure path of beginOpen.'
  order: 4
---

# A failed open leaks the link's requested view and walks

- The asked view (`src/linkView.ts` 17, 45-46) clears only after a layout, and
  the asked walks (`src/walks.ts` 9, 22) only at `src/sources.ts` 198
- `openGFA` clears `askedAlong` on entry, so only a failed fetch or cut leaks
  that one
- Repro: `?gfa=<unreachable>&view=100,200,5&walk=…`, or decline "Draw anyway",
  then open any example: it lands on the stale view with those walks lifted
- Fix: clear all three on failure, or pass them with the open instead of keeping
  them in module state (see the `sources.ts` split in
  [code-review-cleanups](../ideas/collections/code-review-cleanups.md))
