---
name: grey-out-layout-modes
description:
  The Layout menu hides modes the graph cannot draw, where bandage-core says to
  grey them out with their descriptions.
metadata:
  category: visual-call
  area: layout
  first_move:
    'Show every mode in the Layout menu, greying those not drawable, and look at
    it on a graph with no walks.'
  order: 1
---

# Grey out the layouts a graph cannot draw

- `src/menuItems.ts` (68-70) filters on `facts().drawable` and shows no mode
  descriptions
- bandage-core's `layoutModes.ts` (43-45) asks hosts to grey them out instead,
  and the plugin does, with each mode's description
