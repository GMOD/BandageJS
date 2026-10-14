---
name: fast-layout-leaves-force-worker
description:
  A force layout still computing keeps its worker busy after the user picks a
  layout that runs on the main thread.
metadata:
  category: ready
  area: layout
  first_move:
    'Call cancelLayout() in the fast branch of relayout() in src/layout.ts.'
  order: 6
---

# Switching to a fast layout leaves the force worker running

- `relayout()` in `src/layout.ts` (44-47) takes the synchronous `m.run` result
  without calling `cancelLayout()`
- Only `stopLayout` (`src/sources.ts` 404) or the next `workerEngine` call ends
  a running worker
- Repro: open a large graph so FMMM runs, pick Linear: Linear draws, the worker
  keeps a core busy, and its result is thrown away
