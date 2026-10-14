---
name: walk-gene-rows-unplaced
description:
  The per-walk-row gene note counts a row with no axis as having no gene track,
  where bandage-core and the plugin call it unplaced.
metadata:
  category: ready
  area: genes
  first_move:
    'Count axis-less rows as unplaced in the walk-row gene reads in
    src/genes.ts.'
  order: 11
---

# Walk rows with no axis count as untracked, not unplaced

- `src/genes.ts` (177-190) files a row with no `axis` under `untracked`
- bandage-core's `GeneGaps.unplaced` (`walkRowDraw.ts` 298) and the plugin's
  `walkRowViews.ts` (108-112) call it `unplaced`, so the note here names the
  wrong reason
- The plugin keeps the same logic and the same `WALK_GENE_ROWS = 40`; a shared
  `walkGeneReads` in bandage-core would end the drift
