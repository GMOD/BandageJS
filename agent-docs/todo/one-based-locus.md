---
name: one-based-locus
description:
  The location box and loc= read a start 0-based, so a locus pasted from JBrowse
  lands 1 bp off.
metadata:
  category: needs-a-call
  area: links
  first_move:
    'Decide whether loc= and the location box switch to 1-based, and how old
    links keep working.'
  order: 1
---

# Read a typed locus 1-based, as JBrowse does

- `parseLocation` and `formatRegion` in `src/region.ts` (8-25) treat a typed
  start as 0-based, as does bandage-core's `parseRegion` (`gbzCut.ts` 44)
- The page's own labels are 1-based (`details.ts` 65, `view.ts` 85, `jbrowse.ts`
  40), and JBrowse locstrings are 1-based closed
- The call: switch the box and `loc=` to 1-based, moving links shared before by
  1 bp, or keep `loc=` 0-based and convert only typed input
