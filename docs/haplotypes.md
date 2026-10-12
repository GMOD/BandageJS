# Haplotypes

The Haplotypes menu highlights walks in the drawing, and the rest of the graph
fades to grey.

- **One walk** shades light to dark along itself. Its key is a short bar of that
  gradient with its stretch on its own contig written under it.
- **Overlaid** draws walks together, each in one flat colour, a lane apiece.
- **Side by side** draws the layout once per walk, every panel on one shared
  gradient: yellow where its walk starts, red where it ends.
- **Grid by sample** gives each sample a row and each haplotype a column, so a
  sample's two haplotypes read across one row.
- **Colour highlighted…** picks what each highlighted walk's lane shows and in
  which palette.

Panels share one view, so a pan, zoom, drag or hover in one moves or marks them
all. As many go across as draws each panel largest; `columns=` in a link fixes
the count. A panel's title is its walk's key, and clicking it highlights that
walk alone.

Through the LPA KIV-2 array HG00097 carries 22 kb more than GRCh38 and HG00133
116 kb more:

![GRCh38, HG00097 and HG00133 through the KIV-2 cut, side by side](../img/kiv2_facet.png)

A link states the walks and the facet, which the page keeps in its address as
they change:

```
?gbz=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133&walk=GRCh38%230%23chr6&walk=HG00133%231%23CM090050.1&facet=walk&columns=2
```

See [links.md](links.md) for every parameter.
