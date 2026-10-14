---
name: reference-dialog-state
description:
  The reference dialog's remember box keeps its last state, Apply reads it while
  hidden, and a late hub read overwrites the user's pick.
metadata:
  category: ready
  area: reference
  first_move:
    'Reset referenceRemember.checked in showReferenceDialog and pass widened to
    choose().'
  order: 7
---

# The reference dialog keeps stale state between openings

All in `src/referenceDialog.ts`:

- `showReferenceDialog` (441-450) never resets `referenceRemember`, so an untick
  carries into the next sample's dialog
- Apply's early return reads `widened` (row shown and ticked), but `choose()`
  gets the raw `.checked` (576-577, 592), even with the row hidden
- `draw()` (430-435) sets `picked` from the binding after `await readHubs()`,
  dropping a pick made while hubs load or when removing a hub reruns it; only
  set `picked` while it is undefined
