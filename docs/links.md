# Links

The address always describes the view on screen, and File → **Copy link** copies
it. A graph opened from your computer has no link.

| Parameter                                              | Meaning                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `gfa`                                                  | GFA url                                                                              |
| `walks`, `loc`, `ref`, `haps`                          | Cut: walk file url (or `hprc`), region, reference sample, comma-separated haplotypes |
| `expand`                                               | Abridged walks the cut reads in full, comma-separated `sample#haplotype#contig`      |
| `hub`, `assembly`, `contigs`                           | Genes: JBrowse configs, assembly, `graph:assembly` contig names                      |
| `layout`                                               | `force`, `anchored`, `ordered`, `samplerows`, `walkrows`, `tubemap` or `tubemapref`  |
| `along`                                                | Walk that a walk-anchored graph draws along                                          |
| `walk`                                                 | Highlighted walk, repeated per walk                                                  |
| `facet`, `columns`                                     | `none`, `walk` or `sample`; panels across                                            |
| `node`                                                 | Selected node                                                                        |
| `view`                                                 | `x,y,scale` at the pane's centre; absent when fitted                                 |
| `color`, `width`, `thickness`                          | Colour scheme, `depth` or `uniform` width, node width in px                          |
| `bubbles`, `deletions`, `genes`, `paths`, `bars`       | `1` or `0` for each drawn element                                                    |
| `engine`, `quality`, `spacing`, `separation`, `spread` | Force layout settings                                                                |
| `gbz`, `index`                                         | Older links: a gbz-base `.gbz.db` cut and its haplotype index                        |

A parameter appears only when it differs from the default.

- `loc` reads 1-based and closed, as JBrowse writes a locus:
  `chr6:160,614,798-160,647,758`, or `chr6:160,614,798` for one base
