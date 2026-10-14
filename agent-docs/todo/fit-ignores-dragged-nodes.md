---
name: fit-ignores-dragged-nodes
description:
  Fit, the fit button and a resize frame the drawing as laid out, not as
  dragged.
metadata:
  category: ready
  area: view
  first_move:
    'Add state.positionsVersion to the boundsOf memo key in src/view.ts.'
  order: 5
---

# Fit ignores dragged nodes

- `boundsOf` in `src/view.ts` (116-136) memoises on `(layout, region, bars)`
- A drag moves `nodePositions` in place and bumps `state.positionsVersion`
  (`src/input.ts` 211-216), which the key lacks
- Repro: drag a node far out, press `0`: the node stays off screen
