---
name: jbrowse-graph-display
description:
  Have the JBrowse link draw walk-file and rGFA graphs as a LinearGraphDisplay
  under the gene track, in one linear view.
metadata:
  category: ready
  area: jbrowse
  first_move:
    'Teach trackFrom in src/hubConfig.ts the WalkTabixSyntenyAdapter and
    RgfaTabixAdapter lanes tracks.'
  order: 1
---

# Improve the jbrowse integration

`graphViewLink` in `src/jbrowse.ts` opens a `GraphGenomeView` beside a
`LinearGenomeView`, tied by `connectedViewId`, and only for a GBZ cut:
`jbrowseItems` reaches it through `cutTrack`, which needs a lanes track with
`gbz`.

`trackFrom` in `src/hubConfig.ts` sets `gbz` only for `GbzBaseSyntenyAdapter`.
The GBZ route is deprecated in favour of walk files and rGFA (gfa-to-tabix).

- Teach `trackFrom` the walk-file (`WalkTabixSyntenyAdapter`) and rGFA
  (`RgfaTabixAdapter`) lanes tracks, and `cutTrack` to match one to the file the
  graph on screen came from
- Have the JBrowse link open one `LinearGenomeView` whose tracks are the gene
  track and that lanes track with `type: 'LinearGraphDisplay'`, as the plugin's
  `LinearGraphDisplay.test.ts` does with `showTrack`
- Pass `subgraphHaplotypes`, which the display takes
- Keep `gfaViewLink`: a standalone GFA has no linear view to sit in
- Update `test/unit/jbrowse.test.ts` and any e2e spec that expects the paired
  views
