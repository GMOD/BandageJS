# Walk files

`gfa-to-tabix --walks` files every haplotype's path under fixed chunks of a
reference, so a cut reads only the chunks under the window and names every walk
without a haplotype index.
[@jbrowse/graph-walks](https://github.com/GMOD/graph-walks), the reader the
JBrowse graph plugin uses too, makes the cut:

```console
vg convert -f graph.gbz > graph.gfa
gfa-to-tabix graph.gfa --walks --refs GRCh38 -o graph
```

- Host `graph.GRCh38.walks.bed.gz` with its `.tbi` beside it
- The page reads walk format 2, which gfa-to-tabix writes from 1.0, and asks for
  a rebuild of a file from 0.12 or earlier
- Each file is cut along the reference it was written for, and a region is on
  that reference: `chr6:160,614,798-160,647,758`. `ref=` can be left out, or has
  to name that reference
- HPRC release 2 has a hosted file, which the "LPA KIV-2, 8 samples (walk
  files)" example reads:
  `?gbz=https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f2.GRCh38.walks.bed.gz&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133`
- For that example's 8 samples the cut takes the same 17 walks as the gbz-base
  cut
