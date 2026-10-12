# Links

The page rewrites its address as the view changes, so the address is always a
link to what is on screen, and File → **Copy link** copies it. A graph opened
from this computer has no address to link to.

| Parameter                                              | What it states                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gfa`                                                  | The GFA's url                                                                                                                                          |
| `gbz`, `index`, `loc`, `ref`, `haps`                   | A cut: the `.gbz.db` or `.walks.bed.gz` url or `hprc`, its haplotype index, the region, the reference sample, and the haplotypes kept, comma separated |
| `hub`, `assembly`, `contigs`                           | JBrowse configs to read genes from, the assembly the reference is on, and `graph:assembly` contig names where they differ                              |
| `along`                                                | The walk a walk-anchored graph draws x along                                                                                                           |
| `walk`                                                 | A highlighted walk, once per walk                                                                                                                      |
| `node`                                                 | The selected node                                                                                                                                      |
| `view`                                                 | The layout point at the pane's centre and the zoom, `x,y,scale`; absent while the graph is fitted to the window                                        |
| `layout`                                               | `force`, `anchored`, `ordered`, `samplerows`, `walkrows`, `tubemap` or `tubemapref`                                                                    |
| `color`, `width`, `thickness`                          | The colour scheme, whether depth widens nodes (`depth` or `uniform`), and a node's width in px                                                         |
| `bubbles`, `deletions`, `genes`, `paths`, `bars`       | What is drawn, `1` or `0`: bubble labels, deletion edges, genes, every haplotype in colour, and haplotype bars under the graph                         |
| `facet`, `columns`                                     | How highlighted walks are drawn, `none`, `walk` or `sample`, and how many panels go across                                                             |
| `engine`, `quality`, `spacing`, `separation`, `spread` | The force layout's engine, quality, spacing, component separation and bubble spread, as Layout settings… offers them                                   |

Settings appear only where they differ from the defaults, the layout aside, so a
changed default reaches a link's reader. A link's settings hold for the visit.
