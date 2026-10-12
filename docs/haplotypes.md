# Haplotypes

The Haplotypes menu highlights walks, and the rest of the graph fades to grey.

- **One walk** shades light to dark along the walk
- **Overlaid** gives each walk a flat colour and a lane
- **Side by side** draws one panel per walk on a shared gradient, yellow at the
  start and red at the end
- **Grid by sample** puts each sample in a row and each haplotype in a column
- **Colour highlighted…** picks what a lane shows and the palette

Panels share one view, so a pan, zoom or hover in one applies to all. Click a
panel's title to highlight that walk alone. `columns=` in a link sets how many
panels go across.

Through the LPA KIV-2 array, HG00097 has 22 kb more sequence than GRCh38 and
HG00133 has 116 kb more:

![GRCh38, HG00097 and HG00133 through the KIV-2 cut, side by side](../img/kiv2_facet.png)

The address stores the walks and the facet:

```
?gbz=hprc&loc=chr6:160,614,798-160,647,758&haps=HG00097,HG00133&walk=GRCh38%230%23chr6&walk=HG00133%231%23CM090050.1&facet=walk&columns=2
```

See [links.md](links.md).
