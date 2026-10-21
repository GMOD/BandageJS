# BandageJS

Browser viewer for pangenome graphs, at https://jbrowse.org/demos/bandagejs/

![LPA KIV-2 from the HPRC graph, force-directed](img/kiv2_force.png)

- **In:** one of
  - a GFA file (`.gfa` or `.gfa.gz`) of a pangenome or of a de novo assembly, as
    [Bandage](https://github.com/rrwick/Bandage) opens. Open it from a url, File
    → Open or by dragging it onto the page
  - a url to a [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix) walk file
    (`.walks.bed.gz` beside its `.tbi`), plus a reference region such as
    `chr6:160,614,798-160,647,758`. BandageJS downloads only the part of the
    file in that region. See the [walk file guide](docs/walk-files.md) or
    [this HPRC example](https://jbrowse.org/demos/bandagejs/?walks=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133)
  - a url to a [gbz-base](https://github.com/jltsiren/gbz-base) database
    (`graph.gbz.db`) plus a region, as for a walk file. The cut dialog also
    fills in the url of `graph.haplotype-index.db` in the same directory. That
    file, from
    [gbz-haplotype-index](https://github.com/GMOD/gbz-haplotype-index), names
    each walk by sample and haplotype. Without it, every walk except the
    reference is named `unknown#N`
- **Out:** a force-directed, anchored, walk-row or tube-map drawing with
  haplotypes, bubbles and genes marked

## Using it

- **Explore** by clicking nodes, searching regions or genes (`g`), and switching
  [layouts](docs/layouts.md) or [haplotype](docs/haplotypes.md) highlights
- **Share** with File → Copy link, or export an SVG

## Docs

- [Haplotypes](docs/haplotypes.md): highlighting walks, panels and rows
- [Layouts](docs/layouts.md): each layout, what it needs and its settings
- [Genes](docs/genes.md): gene tracks and assemblies
- [Links](docs/links.md): every address parameter
- [Walk files](docs/walk-files.md): gfa-to-tabix to a cut, step by step
- [Developing](docs/developing.md): build, test, screenshots and deploy

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
  the JBrowse 2 plugin for these graphs
- [HPRC tutorial](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc/)

## Libraries

- [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix): writes walk files
- [@jbrowse/graph-walks](https://github.com/GMOD/graph-walks) (npm): reads them
- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) (npm): layout
  and drawing
- [@jbrowse/graph-stress-layout](https://github.com/GMOD/graph-stress-layout)
  (npm): stress layout
- [ggbandage](https://github.com/GMOD/ggbandage) (R): Bandage-style figures as
  ggplot2 layers

## License

GPL-3.0-or-later, building on [BandageNG](https://github.com/asl/BandageNG) and
[OGDF](https://www.ogdf.uni-osnabrueck.de/)
