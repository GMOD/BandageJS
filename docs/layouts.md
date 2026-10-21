# Layouts

The Layout menu lists the layouts the open graph can draw and leaves out the
rest. The address holds the choice as `layout=` ([links.md](links.md)).

- **Walks** are a GFA's P or W lines
- **A reference** comes from rGFA `SN`/`SO`/`SR` tags, or else from the first
  walk in the file. Haplotypes → **Reference haplotype** picks another walk

## Anchored

- **Draws:** x at reference bp, one row per stable rank
- **Needs:** a reference

## Sample rows

- **Draws:** x at reference bp, one row per contributing assembly. Where an
  assembly has a deletion, its row is empty across the deleted span
- **Needs:** a reference and at least one segment off it

## Walk rows

- **Draws:** one bar per haplotype, x along that haplotype's own bp, blue where
  the walk follows the reference and purple off it, so a repeat expansion shows
  as a longer bar. When genes are loaded, each bar has boxes for that
  haplotype's genes
- **Needs:** a reference and two or more walks

Haplotypes → **Bars under the graph** draws the same bars beneath any layout
except walk rows and the tube maps.

## Ordered

- **Draws:** x in reference order, not bp, with each node as wide as the log of
  its length, so a SNP allele stays visible beside a 10 kb segment and a bubble
  is drawn as a lens shape
- **Needs:** a reference

## Tube map

- **Draws:** each walk as a coloured tube through boxed nodes, as
  [sequenceTubeMap](https://github.com/vgteam/sequenceTubeMap) does, with
  columns in node order and log-scaled node widths. No genes
- **Needs:** at least one walk

## Tube map on reference

- **Draws:** the tube map with each column at the reference bp it covers
- **Needs:** walks and a reference

## Force-directed

- **FMMM:** Bandage's own layout, OGDF's fast multipole multilevel method
  compiled to wasm
- **Stress:** draws the reference straight and places each variant against it:
  an allele as a lens, a repeat loop as a ring, a deletion as an arch. A
  component with no reference gets plain stress, by stochastic gradient descent
- **Needs:** nothing, so every graph has both. FMMM is the default

## Layout settings

Layout → **Layout settings…** opens a dialog:

- **Node thickness** and **Width by depth**, for every layout. Width by depth is
  greyed out when every node has the same depth
- **Force-directed** settings, shown when the layout on screen comes from the
  force engine: **Engine**, **Quality** (Fastest to Best), **Bubble spread**,
  **Spacing** and **Component separation**
- **Bubble spread** sets how a node's bp becomes drawn length: Proportional
  (Bandage's scale), Open or Wide bubbles (a minimum length for every allele),
  or Compress lengths (long and short nodes pulled towards the mean)
- **Reset** restores the defaults
- A force setting lays the graph out again when its slider is released, and
  Layout → **Rerun layout** does so on demand
