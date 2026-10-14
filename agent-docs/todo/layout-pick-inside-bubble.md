---
name: layout-pick-inside-bubble
description:
  Picking a layout while a bubble is popped saves it and writes it to the link,
  but Back draws the old mode.
metadata:
  category: ready
  area: layout
  first_move:
    'In choose() in src/menuItems.ts, write state.modeOverride while state.stack
    is non-empty.'
  order: 3
---

# A layout picked inside a popped bubble is lost on Back

- `choose()` in `src/menuItems.ts` (72-80) writes `settings.mode`, which is
  saved and linked as `layout=`, and clears `modeOverride`
- `unpopBubble` in `src/bubbles.ts` (53) then sets `modeOverride = from.mode`,
  so the root draws the old mode while the settings and Copy link name the new
  one
- `cutsWholeWalks()` in `src/state.ts` reads `settings.mode` too, so Back can
  fire an unwanted `recut()`
- Fix: while `state.stack.length > 0`, write the pick to `state.modeOverride`,
  as the comment on `modeOverride` describes
