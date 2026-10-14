---
name: walk-key-outside-bp
description:
  The legend's walk key never says how much of a lifted walk lies outside the
  cut, which the plugin and the figure export both print.
metadata:
  category: ready
  area: legend
  first_move: 'Print key.outside in the walk key in src/overlays.ts.'
  order: 10
---

# The walk key leaves out the bp outside the cut

- `src/overlays.ts` (310-311) prints `key.delta + key.reversed`
- bandage-core's `figure.ts` (180), `figureData.ts` (162) and the plugin's
  `legendSections.ts` (456) print `key.outside` as well
- Moving the legend rows into bandage-core fixes this for good; see
  [share-with-bandage-core](../ideas/collections/share-with-bandage-core.md)
