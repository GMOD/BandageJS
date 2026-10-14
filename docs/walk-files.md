# Walk files

[gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix) `--walks` indexes every
haplotype's path by reference chunk. A cut reads the chunks under the window and
needs no haplotype index.

```console
vg convert -f graph.gbz > graph.gfa
gfa-to-tabix graph.gfa --walks --refs GRCh38 -o graph
```

- Host `graph.GRCh38.walks.bed.gz` with its `.tbi`, then paste the url into Open
  or give it as `gbz=`
- Files need walk format 2 (gfa-to-tabix 1.0 or later)
- Regions are 1-based, on the file's reference (`chr6:160,614,798-160,647,758`),
  so `ref=` is optional
- Example, the hosted HPRC release 2 file:
  `?gbz=https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f2.GRCh38.walks.bed.gz&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133`

[@jbrowse/graph-walks](https://github.com/GMOD/graph-walks) reads the files.
