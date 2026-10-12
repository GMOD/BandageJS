# Figures

File → **Export SVG** saves the drawing, its walks' keys and panels, and the
walk rows under it, as a vector figure. **Copy figure spec** copies the JSON
spec for what is on screen, which `bandage-figure` in
[@jbrowse/bandage-core](https://www.npmjs.com/package/@jbrowse/bandage-core)
turns into the same figure with no browser, so a figure in a paper can be made
again from its spec:

```console
npx -p @jbrowse/bandage-core bandage-figure spec.json -o figure.svg
```

- Every SVG carries its spec in its metadata
- The export draws walk rows under the graph at most 260 px tall, as
  `bandage-figure` does, while the screen also caps them at 40% of the window.
  On a short window the export can therefore box genes the screen leaves out
- The spec is described in the plugin's
  [figures.md](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/blob/main/docs/figures.md)
