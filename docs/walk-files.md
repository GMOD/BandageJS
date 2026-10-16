# Walk files

[gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix) `--walks` indexes every
haplotype's path by reference chunk. A cut reads the chunks under the window and
needs no haplotype index.

```console
gfa-to-tabix graph.gfa --walks --refs GRCh38 -o graph
```

- A graph shipped as `.gbz` converts first:
  `vg convert -f graph.gbz > graph.gfa`

- Host `graph.GRCh38.walks.bed.gz` with its `.tbi`, then paste the url into Open
  or give it as `walks=`
- Files need walk format 3 (gfa-to-tabix 1.1 or later)
- Regions are 1-based, on the file's reference (`chr6:160,614,798-160,647,758`),
  so `ref=` is optional
- `walks=hprc` names the hosted HPRC release 2 file,
  `https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f3.GRCh38.walks.bed.gz`:
  `?walks=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133`

[The tutorial](walk-files-tutorial.md) walks through a cut with screenshots.

[@jbrowse/graph-walks](https://github.com/GMOD/graph-walks) reads the files.
