---
name: layouts-doc
description:
  docs/layouts.md, a help page saying what each Layout menu entry draws and what
  a graph needs for it.
metadata:
  category: ready
  area: bandagejs
  first_move:
    'Write docs/layouts.md from LAYOUT_MODES in @jbrowse/bandage-core and
    layoutItems in src/menuItems.ts.'
  order: 2
---

# Layouts doc

The README's Layout bullet lists the layouts in one line and links nowhere.
`docs/` has pages for haplotypes, links, figures, walk files and genes, but none
for layouts.

- Write `docs/layouts.md` covering each entry `layoutItems` in
  `src/menuItems.ts` offers, which are force-directed with FMMM or stress,
  anchored, sample rows, walk rows, ordered, tube map, and tube map on reference
- Say what each needs (rGFA tags or a reference path, W or P lines), since the
  menu leaves out a layout the graph can't draw
- Cover Rerun layout and Layout settings…
- Link the page from the README's Layout bullet, which also omits sample rows
  and tube map on reference
