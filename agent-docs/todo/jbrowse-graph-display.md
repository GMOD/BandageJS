---
name: jbrowse-graph-display
description:
  Open graphs in JBrowse as a LinearGraphDisplay under the gene track, not a
  GraphGenomeView paired with a linear view.
metadata:
  category: ready
  area: jbrowse
  first_move:
    'In graphViewLink (src/jbrowse.ts), emit one LinearGenomeView whose tracks
    hold the gene track and the lanes track with type LinearGraphDisplay.'
  order: 1
---

# Improve the jbrowse integration

The plugin ships `LinearGraphDisplay` (v6.25.0, on the portal's `latest`), which
draws the graph inside a linear genome view with the gene track above it.
`graphViewLink` in `src/jbrowse.ts` still opens a `GraphGenomeView` beside a
`LinearGenomeView`, tied by `connectedViewId`.

- Switch `graphViewLink` to one linear view whose tracks are the gene track and
  the lanes track with `type: 'LinearGraphDisplay'` and `layoutMode`, as the
  plugin's `LinearGraphDisplay.test.ts` does with `showTrack`
- Check that the display takes `subgraphHaplotypes`; `graphViewLink` passes it
  today
- Keep `gfaViewLink`: a standalone GFA has no linear view to sit in
- `JBROWSE_MODES` may also differ, since the display lays force-directed out
  with stress and drops FMMM
- Update `test/unit/jbrowse.test.ts` and any e2e spec that expects the paired
  views
