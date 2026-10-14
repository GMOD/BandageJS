---
name: gene-track-warnings
description:
  One module-wide flag silences every gene-track failure after the first.
metadata:
  category: ready
  area: genes
  first_move: 'Key the warned flag in src/genes.ts by src.file.'
  order: 8
---

# Gene track failures after the first go unreported

- `warned` in `src/genes.ts` (45, 263-269) is set once and never reset
- Repro: one network blip, then a 404 on another assembly's track: no notice,
  and the Genes toggle stays on with nothing drawn
