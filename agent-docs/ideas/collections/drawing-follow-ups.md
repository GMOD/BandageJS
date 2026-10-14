---
name: drawing-follow-ups
description: Follow-ups on drawing: link ends outside the force layout, sub-pixel exons.
---

# Drawing: follow-ups

- Only the force layout records which way it drew each node, so the anchored and
  ordered layouts still pick a link's ends by x-distance
- An exon shorter than a pixel draws nothing at overview zoom. 823c12b's
  round-capped exon strokes likely fixed this; check on screen, then drop it
