---
name: todo
description:
  Index of the open action items in todo/, grouped by what to do first. Read
  when picking up work, and before filing anything new here.
---

# Todo

One file per item under [todo/](todo/). Each carries its table row in its own
frontmatter: `metadata.category` picks the table, `area` and `first_move` are
the columns, `order` is where it sits. This index has no generator, so add or
remove a row here when you add or remove an entry.

## Ready to take

| Item                                                                                                      | Area      | First move                                                                                         |
| --------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| [Improve the jbrowse integration](todo/jbrowse-graph-display.md)                                          | jbrowse   | Teach trackFrom in src/hubConfig.ts the WalkTabixSyntenyAdapter and RgfaTabixAdapter lanes tracks. |
| [A remembered sample alias loses to a hub that names the sample](todo/remember-box-loses-to-named-hub.md) | reference | Run the remembered pass over the user overlay before the named pass in resolve().                  |
| [A layout picked inside a popped bubble is lost on Back](todo/layout-pick-inside-bubble.md)               | layout    | In choose() in src/menuItems.ts, write state.modeOverride while state.stack is non-empty.          |
| [A failed open leaks the link's requested view and walks](todo/failed-open-leaks-link-state.md)           | links     | Clear the asked view and walks on the failure path of beginOpen.                                   |
| [Switching to a fast layout leaves the force worker running](todo/fast-layout-leaves-force-worker.md)     | layout    | Call cancelLayout() in the fast branch of relayout() in src/layout.ts.                             |
| [The reference dialog keeps stale state between openings](todo/reference-dialog-state.md)                 | reference | Reset referenceRemember.checked in showReferenceDialog and pass widened to choose().               |
| [Gene track failures after the first go unreported](todo/gene-track-warnings.md)                          | genes     | Key the warned flag in src/genes.ts by src.file.                                                   |
| [Typing a contig name suggests a UCSC genome of that name](todo/ucsc-suggestion-matches-contigs.md)       | reference | Exclude chr-style names from the UCSC db pattern in src/siteConfig.ts.                             |
| [The walk key leaves out the bp outside the cut](todo/walk-key-outside-bp.md)                             | legend    | Print key.outside in the walk key in src/overlays.ts.                                              |
| [Walk rows with no axis count as untracked, not unplaced](todo/walk-gene-rows-unplaced.md)                | genes     | Count axis-less rows as unplaced in the walk-row gene reads in src/genes.ts.                       |

## Needs a call

| Item                                                                   | Area  | First move                                                                                  |
| ---------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| [Read a typed locus 1-based, as JBrowse does](todo/one-based-locus.md) | links | Decide whether loc= and the location box switch to 1-based, and how old links keep working. |

## Needs a visual call

| Item                                                                      | Area   | First move                                                                                               |
| ------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| [Grey out the layouts a graph cannot draw](todo/grey-out-layout-modes.md) | layout | Show every mode in the Layout menu, greying those not drawable, and look at it on a graph with no walks. |
