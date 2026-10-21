# Developing

```console
git clone https://github.com/cmdcolin/BandageJS.git
cd BandageJS
pnpm install
pnpm dev        # esbuild watch + serve dist/
pnpm typecheck
pnpm build
pnpm test       # unit and browser tests
pnpm run deploy # needs aws credentials for the jbrowse.org bucket
```

## Layout

The page imports `@jbrowse/bandage-core` for parsing, layouts, rendering and the
gbz-base cut. `build.mjs` fails if the core pulls in JBrowse's host, mobx or
React.

- `src/main.ts`: menu bar, opens the graph the address names
- `state.ts`, `settings.ts`, `derived.ts`: view state, saved settings, memoized
  graph facts
- `view.ts`, `overlays.ts`, `input.ts`: canvas and overlays, SVG ports of the
  plugin's React overlays, pointer and keyboard
- `layout.ts`, `engine.ts`, `layoutWorker.ts`: layouts and the force-directed
  worker
- `sources.ts`, `gbz.ts`, `walkFiles.ts`, `read.ts`: opening GFA files, gbz cuts
  and walk files
- `walks.ts`, `walkStrip.ts`, `bubbles.ts`, `details.ts`, `find.ts`: haplotype
  highlighting, walk rows, bubbles, node details, node search
- `reference.ts`, `hubs.ts`, `genes.ts`: reference assembly and genes; see
  [the guide](guide.md#genes)
- `figure.ts`: Export SVG

Modules that touch no DOM have unit tests in Node. Changes to the plugin's
overlays need the same change in `src/overlays.ts`.

## Testing

- `pnpm test:unit` runs `test/unit` in Node
- `pnpm test:e2e` builds `dist/`, serves it on port 4178 (or `TEST_PORT`) and
  drives Chromium through the page's DOM. Use a different `TEST_PORT` in a
  second checkout
- `--headed` or `--debug` helps debug. A failing test leaves a trace for
  `pnpm exec playwright show-trace`

The tests block network requests and serve fixtures from `test/e2e/data`,
including the plugin's 46-sample `micb-kir3dl1.gbz.db` at `https://gbz.test/`.

## Screenshots

- `pnpm shoot` builds, then reshoots every image in `img/` with puppeteer.
  `pnpm shoot cfh_facet` reshoots one. `CHROME=<path>` picks the browser
- `scripts/shoot-readme.mjs` holds each figure's address, window size and
  settings. The HPRC figures cut live over the network
- `pnpm shoot:tutorial` reshoots `img/tutorial/` for [walk files](walk-files.md)
  by driving the Open and cut dialogs
- `img/jbrowse_kiv2.png` and `img/jbrowse_kiv2_facet.png` are screenshots of the
  JBrowse plugin, copied from its `img/`. This script does not shoot them

## Updating the core

```console
pnpm update @jbrowse/bandage-core
pnpm typecheck && pnpm build
```

The plugin's CI tests each core push against BandageJS's `core-next` branch if
it exists, else `main`. For a breaking change, push the BandageJS side to
`core-next` first. After the release, bump the core there, fast-forward `main`
and delete the branch.

## Deploying

`pnpm run deploy` builds, syncs `dist/` to `s3://jbrowse.org/demos/bandagejs`
with `--delete` and invalidates the CloudFront path. Bare `pnpm deploy` is
pnpm's own command.

## Gene hubs

`config.json` next to `index.html` lists the JBrowse hubs that
[genes](guide.md#genes) come from:

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

## Examples

`examples/index.json` lists the Examples menu. A `file` entry is a GFA in
`examples/`. A `walks: "hprc"` entry is cut live from the HPRC release 2 walk
file.
