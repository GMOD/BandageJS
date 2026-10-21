# Genes

BandageJS draws genes along the reference nodes, with exons dark and each gene's
name beside it. Hover a name for the span and strand. They appear in the
force-directed, anchored, ordered and sample-row layouts, and on walk rows.

## Which assembly

A graph's reference sample has a name such as `GRCh38#0#chr6`, and `chr6` exists
in every human assembly. The page matches the sample to an assembly in its
JBrowse hubs by name or alias, then reads that assembly's gene track, so most
graphs need no setup.

When nothing matches, File → Choose reference genome… lets you:

- Pick from the assemblies whose sequence names fit the reference
- Search every genome on genomes.jbrowse.org by name (`thale cress`), GenArk
  accession (`GCF_000005845.2`) or UCSC name (`mm39`)

The browser remembers the choice for that sample. Pick Automatic to forget it.

Picking another walk under Haplotypes → Reference haplotype redraws the graph
along it, with genes from that walk's assembly.

## Walk rows

Each bar is boxed with genes from the assembly named for its haplotype
(`HG00097#1`), if the hub has one. The HPRC portal has them for every release 2
haplotype. Click a bar for a link to that span in JBrowse.

## Your own genes

File → Open genes… reads a GFF3 or BED file, plain or gzipped. It needs no
assembly, only contig names that match the graph's (`chr6` or `GRCh38#0#chr6`).

## Linking

`hub=`, `assembly=` and `contigs=` record a choice in the address. See
[links.md](links.md).

## Site setup

A deployer lists the hubs the page searches in `config.json`; see
[developing.md](developing.md#gene-hubs).
