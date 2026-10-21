# BandageJS

Browser viewer for pangenome graphs, at https://jbrowse.org/demos/bandagejs/

- **Built for:** pangenomes. Haplotype walks, bubbles, genes and regions cut
  from a walk file are first-class
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
  `?walks=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133`. Paste a
  [walk file](docs/walk-files.md) url (or a gbz-base `.gbz.db`) to cut your own
- **Go to:** type a region, position or gene name in the location box (`g`);
  regions read 1-based, as JBrowse writes them
- **Inspect:** click a node, or find it by name, for its links, walks, bubble
  and genes
- **Haplotypes:** highlight walks as lanes or side by side
  ([details](docs/haplotypes.md))
- **Layout:** the Layout menu picks force-directed, anchored, sample rows, walk
  rows, ordered, tube map or tube map on reference ([details](docs/layouts.md))
- **Share:** File → **Copy link** ([parameters](docs/links.md))
- **Export:** File → **Export SVG** saves the view as a vector figure. For
  scripted figures, see [ggbandage](https://github.com/GMOD/ggbandage)

![GRCh38, HG00097 and HG00133 through the KIV-2 cut, side by side](img/kiv2_facet.png)

![LPA KIV-2 in eight HPRC samples, force-directed with its walk rows beneath](img/kiv2_strip.png)

## Docs

- [Haplotypes](docs/haplotypes.md): highlighting walks, panels and rows
- [Layouts](docs/layouts.md): each layout, what it needs and its settings
- [Genes](docs/genes.md): gene tracks, assemblies and site setup
- [Links](docs/links.md): every address parameter
- [Walk files](docs/walk-files.md): gfa-to-tabix to a cut, step by step
- [Gallery](docs/gallery.md): example figures
- [Developing](docs/developing.md): build, test, screenshots and deploy

## See also

- [jbrowse-plugin-graphgenomeviewer](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer):
  the JBrowse 2 plugin for these graphs
- [HPRC tutorial](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc/)

## Libraries

- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) (npm): layout
  and drawing
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
[OGDF](https://www.ogdf.uni-osnabrueck.de/)
