# Genes

Genes are drawn along the reference nodes, exons dark, name beside them. Hover a
name for the span and strand. They appear in the force-directed, anchored,
ordered and sample-row layouts, and on walk rows.

## Which assembly

A graph names a reference sample (`GRCh38#0#chr6`), and `chr6` exists in every
human assembly. The page matches the sample to an assembly in its JBrowse hubs
by name or alias, then reads that assembly's gene track. Most graphs need
nothing more.

When nothing matches, File → Choose reference genome… lets you:

- Pick from the assemblies whose sequence names fit the reference
- Search every genome on genomes.jbrowse.org by name (`thale cress`), GenArk
  accession (`GCF_000005845.2`) or UCSC name (`mm39`)

The browser remembers the choice for that sample. Pick Automatic to forget it.

Haplotypes → Reference haplotype draws along another walk, and the genes follow
that walk's assembly.

## Walk rows

Each bar is boxed with genes from the assembly named for its haplotype
(`HG00097#1`), if the hub has one. The HPRC portal has them for every release 2
haplotype. Click a bar for a link to that span in JBrowse.

## Your own genes

File → Open genes… reads a GFF3 or BED file, plain or gzipped. It needs no
assembly, only contig names that match the graph's (`chr6` or `GRCh38#0#chr6`).

## Linking

`hub=`, `assembly=` and `contigs=` store a choice in the address. See
[links.md](links.md).

## Site setup

A deployer lists hubs in `config.json` next to `index.html`:

```json
{
  "jbrowse": "https://jbrowse.org/code/jb2/main/",
  "hubs": [
    "https://jbrowse.org/pangenome/hprc-grch38/config.json",
    {
      "url": "https://jbrowse.org/hubs/genark/GCF/000/005/845/GCF_000005845.2/config.json",
      "aliases": { "GCF_000005845.2": ["K12"] },
      "refNameAliases": { "GCF_000005845.2": { "chr": "NC_000913.3" } }
    }
  ]
}
```

- `hubs`: JBrowse `config.json` urls, searched in order
- `aliases`: sample names your graphs use for the assembly
- `refNameAliases`: `{ "graph name": "assembly name" }` for sequences named
  differently
- `genes`: the gene track id, or `""` for none
- `jbrowse`: the JBrowse Web that File → JBrowse links open
- `genomes`: where the search dialog finds UCSC, GenArk and
  genomes.jbrowse.org-style `searchIndex.json` entries

Adding the same `aliases` and `refNameAliases` to your own JBrowse works for
both apps.
