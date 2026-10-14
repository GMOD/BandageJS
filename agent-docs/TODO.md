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
| [The reference dialog keeps stale state between openings](todo/reference-dialog-state.md)                 | reference | Reset referenceRemember.checked in showReferenceDialog and pass widened to choose().               |

## Needs a visual call

| Item                                                                      | Area   | First move                                                                                               |
| ------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| [Grey out the layouts a graph cannot draw](todo/grey-out-layout-modes.md) | layout | Show every mode in the Layout menu, greying those not drawable, and look at it on a graph with no walks. |
