---
name: code-review-cleanups
description:
  Splits and small dedupes a code review found in BandageJS's src, starting with
  view.ts, referenceDialog.ts, sources.ts, menus.ts and input.ts.
---

# Code review cleanups

- Split `src/view.ts` (949 lines) along its seams: facets (253-350), the
  walk-rows SVG cache (622-695), overlay and legend drawing (696-790), the info
  box (806-904)
- Move `choose`, `automatic` and `choiceLabel` out of `src/referenceDialog.ts`
  (60-127) into a binding module; `src/menuItems.ts` imports `choiceLabel` from
  the dialog today
- Move link and query building out of `src/sources.ts` (67-152, 455-486) beside
  `query.ts`/`address.ts`, which also eases
  [failed-open-leaks-link-state](../../todo/failed-open-leaks-link-state.md)
- Move the hover-intent state in `src/menus.ts` (110-116, 395-520) into
  `submenuAim.ts`
- Split `src/input.ts` into hit tests (57-125), gestures (164-270), and the
  page-wide keys and drag-drop (315-397)
- Share hub/assembly flattening, name matching and overlay merging between
  `src/reference.ts` (104-114) and `src/referenceDialog.ts` (193-235)
- Use bandage-core's `regionLabel` in `view.ts` (85), `describe.ts` (103) and
  `details.ts` (62-66)
- One `message(e)` for the 7 copies of `e instanceof Error ? e.message : …`
- `hubConfig.ts` `strings` duplicates `siteConfig.ts` `names`; `geneTracks`
  repeats `tracksOn`'s assembly filter
- Move `esc` out of `overlays.ts` (65) into a small `html.ts`; eight modules
  import it
- Unexport `Action`, `Side`, `WalkThrough`, `Rect` and `WalkCutSource`; use
  `isHprc` in `describe.ts` (38)
