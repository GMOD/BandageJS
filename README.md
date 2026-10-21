# BandageJS

Browser viewer for pangenome graphs, at https://jbrowse.org/demos/bandagejs/

![LPA KIV-2 from the HPRC graph, force-directed](img/kiv2_force.png)

## Opening a whole graph

Drag a GFA file (`.gfa` or `.gfa.gz`) onto the page, or choose it or paste its
url in File → Open. BandageJS reads the whole file, so use this for de novo
assembly graphs and for pangenome graphs small enough to load.

## Opening one region of a large pangenome

BandageJS reads one region at a time from an indexed pangenome hosted at a url:

| Index             | Made with                                                                                    | Files to host                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Walk file         | [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix) `--walks` ([guide](docs/walk-files.md)) | `graph.<reference>.walks.bed.gz`, such as `graph.GRCh38.walks.bed.gz`, and its `.tbi`                                                                                             |
| gbz-base database | [gbz-base](https://github.com/jltsiren/gbz-base)                                             | `graph.gbz.db`, and optionally `graph.haplotype-index.db` from [gbz-haplotype-index](https://github.com/GMOD/gbz-haplotype-index), which labels each walk by sample and haplotype |

Paste the url of the `.walks.bed.gz` or `.gbz.db` into File → Open, then type a
region on the reference such as `chr6:160,614,798-160,647,758`. BandageJS
downloads only the part of the file in that region. Try
[this HPRC example](https://jbrowse.org/demos/bandagejs/?walks=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133).

## Exploring and sharing

- Click a node for its details, or press `g` and type a region or gene name
- Pick a layout from the [Layout](docs/layouts.md) menu, and highlight walks
  from the [Haplotypes](docs/haplotypes.md) menu
- File → Copy link shares the view, and File → Export SVG saves it

## Docs

- [Haplotypes](docs/haplotypes.md): highlighting walks, panels and rows
- [Layouts](docs/layouts.md): each layout, what it needs and its settings
- [Genes](docs/genes.md): gene tracks and assemblies
- [Links](docs/links.md): every address parameter
- [Walk files](docs/walk-files.md): making a walk file and opening a region of
  it, step by step

## Gallery

<table>
<tr>
<td><a href="docs/gallery.md"><img src="img/kiv2_overlay.png" width="260" alt="Three walks overlaid on KIV-2"></a><br>Three walks overlaid on KIV-2</td>
<td><a href="docs/gallery.md"><img src="img/kiv2_strip.png" width="260" alt="Walk rows under the graph"></a><br>Walk rows under the graph</td>
<td><a href="docs/gallery.md"><img src="img/cfh_force.png" width="260" alt="CFH with genes and a deletion"></a><br>CFH with genes and a deletion</td>
</tr>
<tr>
<td><a href="docs/gallery.md"><img src="img/mhc_stress.png" width="260" alt="MHC class II, stress layout"></a><br>MHC class II, stress layout</td>
<td><a href="docs/gallery.md"><img src="img/ecoli_genes.png" width="260" alt="E. coli with K-12 genes"></a><br>E. coli with K-12 genes</td>
<td><a href="docs/gallery.md"><img src="img/assembly_graph.png" width="260" alt="A de novo assembly graph"></a><br>A de novo assembly graph</td>
</tr>
</table>

More in [the gallery](docs/gallery.md).

## See also

- [jbrowse-plugin-graphgenomeviewer](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer):
  draws pangenome graphs in JBrowse 2
- [ggbandage](https://github.com/GMOD/ggbandage) (R): Bandage-style figures as
  ggplot2 layers
- [JBrowse's HPRC pangenome tutorial](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc/)

## Libraries

- [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix): writes walk files
- [@jbrowse/graph-walks](https://github.com/GMOD/graph-walks) (npm): reads them
- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) (npm): layout
  and drawing
- [@jbrowse/graph-stress-layout](https://github.com/GMOD/graph-stress-layout)
  (npm): stress layout

## License

GPL-3.0-or-later, building on [BandageNG](https://github.com/asl/BandageNG) and
[OGDF](https://www.ogdf.uni-osnabrueck.de/)
