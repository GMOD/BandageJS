# BandageJS

View GFA graphs in the browser at https://jbrowse.org/demos/bandagejs/

![LPA KIV-2 from the HPRC graph, force-directed](img/kiv2_force.png)

- **In:** a GFA (plain or gzipped), or a region cut live from a pangenome
- **Out:** a force-directed, anchored or tube-map drawing, with haplotypes,
  bubbles and genes marked

## Using it

- **Open a graph:** File → Open, paste a url, drop a GFA on the page, or use
  `?gfa=<url>`. The Open dialog lists recent files to reopen
- **Cut a region from HPRC:**
  `?gbz=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133`. Paste any
  `.gbz.db` url, or a [walk file](docs/walk-files.md), to cut from your own
- **Move around:** type a region (`chr6:160,614,798-160,647,758`), a position or
  a gene name in the location box (`g`). ‹ › step half a window
- **Inspect:** click a node, or find it by name, to list beside the drawing the
  nodes at each end, the walks through it, its bubble and its genes
- **Highlight haplotypes:** the Haplotypes menu, as lanes or side by side. See
  [docs/haplotypes.md](docs/haplotypes.md)
- **Change the layout:** the Layout menu picks force-directed, anchored, ordered,
  walk rows or tube map. Layout → Layout settings… tunes the force layout and
  switches it to an experimental stress engine
- **Share:** File → **Copy link** copies the address, which always states the
  view on screen. See [docs/links.md](docs/links.md)
- **Export:** File → **Export SVG** saves a vector figure. See
  [docs/figures.md](docs/figures.md)

![GRCh38, HG00097 and HG00133 through the KIV-2 cut, side by side](img/kiv2_facet.png)

![LPA KIV-2 in eight HPRC samples, force-directed with its walk rows beneath](img/kiv2_strip.png)

## Docs

- [Haplotypes](docs/haplotypes.md): overlaid, side-by-side and grid views
- [Genes](docs/genes.md): gene tracks and your own GFF3 or BED
- [Walk files](docs/walk-files.md): cutting from gfa-to-tabix files
- [Links](docs/links.md): every address parameter
- [Figures](docs/figures.md): SVG export and `bandage-figure`
- [Gallery](docs/gallery.md): more graphs
- [Developing](docs/developing.md)

## See also

- [jbrowse-plugin-graphgenomeviewer](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer),
  the JBrowse 2 plugin that browses these graphs by locus
- [HPRC tutorial](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc/) on
  jbrowse.org

### Programmatic usage

- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) (npm): the
  layout and drawing engine this page uses. Its `bandage-figure` command makes
  an SVG from a [figure spec](docs/figures.md) with no browser
- [@jbrowse/graph-stress-layout](https://github.com/GMOD/graph-stress-layout)
  (npm): the stress layout that keeps the reference straight
- [@gmod/gbz-base](https://github.com/GMOD/gbz-base-js) (npm): range-request
  reader for `.gbz.db` databases
- [@jbrowse/graph-walks](https://github.com/GMOD/graph-walks) (npm): reader for
  [walk files](docs/walk-files.md)
- [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix): writes walk files from
  a GFA
- [gbz-haplotype-index](https://github.com/GMOD/gbz-haplotype-index): lists the
  walks in a gbz-base cut
- [ggbandage](https://github.com/GMOD/ggbandage) (R): Bandage-style graph
  figures as ggplot2 layers

## License

GPL-3.0-or-later, building on [BandageNG](https://github.com/asl/BandageNG) and
[OGDF](https://www.ogdf.uni-osnabrueck.de/), both GPL.

The earlier BandageNG fork is on the
[`bandage-layout-js`](https://github.com/cmdcolin/BandageJS/tree/bandage-layout-js)
branch. Colin started this at Cold Spring Harbor while TA'ing Programming for
Biology in 2025.
