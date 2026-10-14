---
name: share-with-bandage-core
description:
  Code BandageJS and the JBrowse graph plugin each keep a copy of, which
  bandage-core could hold once, and cheap features to port between the two.
---

# Share with bandage-core

Paths name BandageJS `src/`, the plugin's `src/` and bandage-core's `src/`.

- Legend rows: three copies (`overlays.ts` 299-405, the plugin's
  `legendSections.ts`, core `figure.ts`); start from the plugin's builders
- Node and gene hover text into core `hoverText.ts`: `describe.ts` 50-106 vs the
  plugin's `GraphCanvas.tsx`; the plugin's chip readout prints a 0-based start
- Walk-row gene reads as a core `walkGeneReads`: `genes.ts` 158-218 vs the
  plugin's `walkRowViews.ts`, both with `WALK_GENE_ROWS = 40`
- Menu helpers: `ENGINE_NAMES`, the " layout" label strip and the "Auto (X)"
  colour label exist in both apps
- The plugin's `nodeColor.ts`, `nodeSize.ts` and `graphLayers.ts` into core, so
  JBrowse links from `jbrowse.ts` can carry colour, size and layers, not just
  the layout
- The plugin's missing-haplotype-index error and haplotype listing into core's
  GBZ cut, so the cut dialog can offer haplotypes
- `panSNSample`/`panSNContig`/`panSNHaplotype` now exist in both core and
  graph-walks 1.1.0; keep one and re-export it
- `GENE_INK` is defined four times; core exports it as `WALK_GENE_INK`
- Ports into BandageJS: tube-map genes and ruler (core has them; tube maps
  disable Genes today), the plugin's `keepInView`, core `filterSamples`
- Ports into the plugin: spacing and separation controls, node thickness, Rerun
  layout, `nodeDetails.ts` (no DOM code) and genes in the node hover
- Divergences to settle: default layout (force here and in the view, auto in the
  track, anchored per the plugin's ADR-041); hover brightness 1.4 vs 1.15
