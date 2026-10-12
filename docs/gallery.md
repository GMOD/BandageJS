# Gallery

Pangenome graphs also open in JBrowse 2 through
[jbrowse-plugin-graphgenomeviewer](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer).
Here the KIV-2 repeat sits under the RefSeq genes and a curated annotation, and
the strip above the graph shares the genome coordinates:

![The KIV-2 graph as a JBrowse 2 track under gene and annotation tracks](../img/jbrowse_kiv2.png)

Three walks overlaid on the KIV-2 repeat, one colour each. GRCh38 is charcoal,
HG00097#1 blue (22 kb longer) and HG00133#1 orange (116 kb longer). Only
HG00133#1 runs the large loop:

![GRCh38, HG00097#1 and HG00133#1 overlaid on the KIV-2 graph](../img/kiv2_overlay.png)

CFH and its CFHR genes in three HPRC samples. An 84.7 kb deletion edge skips
CFHR3 and CFHR1. HG02055 and HG01123 take it, and HG00097 does not:

![The CFH locus in three HPRC samples, force-directed with genes](../img/cfh_force.png)

CFH faceted in BandageJS, one panel per walk. GRCh38 and HG00097#1 take the loop
through CFHR3 and CFHR1. HG02055#1 takes the 84.5 kb deletion edge instead:

![GRCh38, HG00097#1 and HG02055#1 through CFH, one panel each](../img/cfh_facet.png)

HLA-DRB5, DRB6 and DRB1 in an HPRC rGFA slice, drawn with the stress layout. The
dashed edge is an 86 kb deletion, and the large loop is 46.9 kb of sequence that
the reference lacks:

![The MHC class II DRB region, stress layout](../img/mhc_stress.png)

The KIV-2 repeat faceted in JBrowse, one panel per walk. HG00097 has 22 kb more
sequence than GRCh38, HG01960 has 50 kb more and HG00133 has 116 kb more:

![GRCh38, HG00097, HG01960 and HG00133 through KIV-2, one panel each](../img/jbrowse_kiv2_facet.png)

LPA KIV-2 in eight HPRC samples. Pointing at HG01123#2's bar rings its node in
the graph, and ticks mark where the other walks pass it:

![LPA KIV-2 in eight HPRC samples, force-directed with its walk rows beneath](../img/kiv2_strip.png)

The amylase locus in four HPRC samples as walk rows, boxed with CAT genes. The
boxes count AMY1 copies: one at 146 kb, two at 168 kb, three at 240 kb (as in
GRCh38) and four at 318 kb. Charcoal marks a stretch off GRCh38's path:

![The amylase locus in four HPRC samples, as walk rows with their genes](../img/amy1_rows.png)

A slice of an E. coli minigraph, anchored on K-12 and labelled with its genes:

![An E. coli minigraph slice, force-directed with K-12's genes](../img/ecoli_genes.png)

Five E. coli strains through a pggb graph, as a tube map:

![The pggb E. coli subgraph as a tube map](../img/tube_map.png)

BandageJS also opens the de novo assembly graphs that Bandage draws, coloured
per contig:

![A 64-contig assembly graph, force-directed](../img/assembly_graph.png)
