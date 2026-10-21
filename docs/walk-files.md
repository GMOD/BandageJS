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
- Files need walk format 4 (gfa-to-tabix 1.2 or later)
- Regions are 1-based, on the file's reference (`chr6:160,614,798-160,647,758`),
  so `ref=` is optional
- `walks=hprc` names the hosted HPRC release 2 file,
  `https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f5.GRCh38.walks.bed.gz`:
  `?walks=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133`

## Abridged walks

- In walk format 5 (gfa-to-tabix 1.4), a costly chunk, usually a satellite
  array, moves its costliest walks to detail records that a window read skips
- The cut gives each such walk two steps, where it leaves and rejoins the
  reference
- The Haplotypes menu lists each as a block, such as
  `HG00133#1: 11 k steps, 171 kb off reference`. Walk rows draw its missing
  steps in amber
- Clicking the block, or **Load its steps** on a selected walk row, cuts again
  with the walk read in full
- A highlighted walk is always read in full, since the highlight draws its steps
- `expand=` in the address names the walks read in full. The node limit still
  applies, so an expansion past it fails as a too-wide window does

[The tutorial](walk-files-tutorial.md) walks through a cut with screenshots.

[@jbrowse/graph-walks](https://github.com/GMOD/graph-walks) reads the files.
