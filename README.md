# BandageJS

Browser viewer for pangenome graphs, at https://jbrowse.org/demos/bandagejs/

- **Built for:** pangenomes. Haplotype walks, bubbles, genes and regions cut
  from a GBZ are first-class
- **Also opens:** de novo assembly graphs, as
  [Bandage](https://github.com/rrwick/Bandage) does

![LPA KIV-2 from the HPRC graph, force-directed](img/kiv2_force.png)

- **In:** a GFA (plain or gzipped), or a region cut live from a pangenome
- **Out:** a force-directed, anchored or tube-map drawing with haplotypes,
  bubbles and genes marked

## Using it

- **Open:** File → Open, paste a url, drop a GFA on the page, or use
  `?gfa=<url>`
- **Cut a region:**
  `?gbz=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133`. Paste a
  `.gbz.db` or [walk file](docs/walk-files.md) url to cut your own
- **Go to:** type a region, position or gene name in the location box (`g`)
- **Inspect:** click a node, or find it by name, for its links, walks, bubble
  and genes
- **Haplotypes:** highlight walks as lanes or side by side
  ([details](docs/haplotypes.md))
- **Layout:** the Layout menu picks force-directed, anchored, ordered, walk rows
  or tube map
- **Share:** File → **Copy link** ([parameters](docs/links.md))
- **Export:** File → **Export SVG** ([figures](docs/figures.md))

![GRCh38, HG00097 and HG00133 through the KIV-2 cut, side by side](img/kiv2_facet.png)

![LPA KIV-2 in eight HPRC samples, force-directed with its walk rows beneath](img/kiv2_strip.png)

More: [genes](docs/genes.md), [gallery](docs/gallery.md),
[developing](docs/developing.md).

## See also

- [jbrowse-plugin-graphgenomeviewer](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer),
  the JBrowse 2 plugin for these graphs
- [HPRC tutorial](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc/)

### Programmatic usage

- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) (npm): layout
  and drawing, plus `bandage-figure` for SVGs with no browser
- [@jbrowse/graph-stress-layout](https://github.com/GMOD/graph-stress-layout)
  (npm): stress layout
- [@gmod/gbz-base](https://github.com/GMOD/gbz-base-js) (npm): `.gbz.db` reader
- [@jbrowse/graph-walks](https://github.com/GMOD/graph-walks) (npm): walk file
  reader
- [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix): writes walk files
- [ggbandage](https://github.com/GMOD/ggbandage) (R): Bandage-style figures as
  ggplot2 layers

## License

GPL-3.0-or-later, building on [BandageNG](https://github.com/asl/BandageNG) and
[OGDF](https://www.ogdf.uni-osnabrueck.de/). The earlier BandageNG fork is on
the
[`bandage-layout-js`](https://github.com/cmdcolin/BandageJS/tree/bandage-layout-js)
branch.
