---
name: remember-box-loses-to-named-hub
description:
  The reference resolver checks hubs that name a sample before the alias the
  user remembered for it, so the remember box does nothing for a named sample.
metadata:
  category: ready
  area: reference
  first_move:
    'Run the remembered pass over the user overlay before the named pass in
    resolve().'
  order: 2
---

# A remembered sample alias loses to a hub that names the sample

- `resolve()` in `src/reference.ts` (169-190) returns `how: 'named'` from the
  first hub whose site overlay names the sample, before the `remembered` pass
  reads the user's overlay
- Repro: a `GRCh38#0#chr6` graph binds by name to hg38; pick another assembly
  with the remember box ticked. `choose()` stores the alias, but the next
  resolve binds hg38 again, with no feedback
- Fix: check the user overlay first
- Test: an e2e spec that picks a different assembly for a sample a hub names
