---
name: ucsc-suggestion-matches-contigs
description:
  The reference dialog's UCSC name pattern matches chr6, offering a genome that
  does not exist.
metadata:
  category: ready
  area: reference
  first_move:
    'Exclude chr-style names from the UCSC db pattern in src/siteConfig.ts.'
  order: 9
---

# Typing a contig name suggests a UCSC genome of that name

- `/^[a-z][A-Za-z]*\d+$/` in `src/siteConfig.ts` (142) matches `chr6`, so
  `genomeHubUrl` offers `<ucsc>/chr6/config.json`, which fails when picked
- Fix: exclude `chr\d+`-like names, or suggest only names in the genome index
