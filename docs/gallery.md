# Gallery

## Assembly graph

A de novo assembly graph, coloured at random per contig as Bandage does:

![A 64-contig assembly graph, force-directed](../img/assembly_graph.png)

## Amylase locus as walk rows

The locus cut from the HPRC graph for four samples. Each bar is one haplotype's
assembly through the locus, boxed with the genes HPRC's CAT annotation gives that
assembly, under CAT's names.

- The boxes count the AMY1 copies: one at 146 kb, two at 168 kb, three at 240 kb
  as in GRCh38, four at 318 kb
- Length can't tell the copies apart: HG01123#2 and HG02055#2 both run 146 kb
  with one AMY1, but only HG01123#2 has AMY2A, where HG02055#2 has the AMYP1
  pseudogene
- A stretch on GRCh38's path takes the hue of the GRCh38 stretch it runs through;
  charcoal is off GRCh38's path, an alternative route through the graph and not
  sequence GRCh38 lacks

![The amylase locus in four HPRC samples, as walk rows with their genes](../img/amy1_rows.png)

## LPA KIV-2 with walk rows

Eight HPRC samples, force-directed with the walk rows under it. The pointer on
HG01123#2's bar rings that node in the hairball above, and the ticks mark where
each other walk passes the same node. Each bar is boxed in LPA from its own
assembly's annotation; a strip with too many rows to box genes in leaves them out
and says so.

![LPA KIV-2 in eight HPRC samples, force-directed with its walk rows beneath](../img/kiv2_strip.png)

## Tube map

Five E. coli strains through a pggb graph:

![The pggb E. coli subgraph as a tube map](../img/tube_map.png)
