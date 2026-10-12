# Figures

- File → **Export SVG** saves the drawing, walk keys, panels and walk rows as a
  vector figure
- **Copy figure spec** copies the JSON spec for what is on screen. Every SVG
  also contains its spec
- `bandage-figure` rebuilds the figure from the spec with no browser:

```console
npx -p @jbrowse/bandage-core bandage-figure spec.json -o figure.svg
```

The export limits walk rows to 260 px, while the screen limits them to 40% of
the window, so a short window may show fewer gene boxes than the export. The
spec format is in the plugin's
[figures.md](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/blob/main/docs/figures.md).
