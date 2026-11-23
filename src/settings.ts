import {
  BUBBLE_SPREADS,
  COLOR_SCHEMES,
  FACET_FIELDS,
  LABEL_DEFAULTS,
  LAYOUT_ENGINES,
  LAYOUT_MODES,
  LAYOUT_QUALITIES,
  NODE_WIDTHS,
} from '@jbrowse/bandage-core'

import type {
  BubbleSpread,
  ColorScheme,
  FacetSetting,
  LayoutEngineKind,
  LayoutModeValue,
  NodeWidth,
} from '@jbrowse/bandage-core'

export interface Settings {
  mode: LayoutModeValue
  colorScheme: ColorScheme
  nodeWidth: NodeWidth
  // which force engine draws the force-directed layout
  engine: LayoutEngineKind
  quality: number
  bubbleSpread: BubbleSpread
  showBubbles: boolean
  showDeletionEdges: boolean
  // every node and skip at any zoom, where off a site too small to see at
  // the zoom is left out, counted in the key and drawn again on zooming in
  showSmallSites: boolean
  drawPaths: boolean
  showGenes: boolean
  // each node's length written on it
  nodeLengthLabels: boolean
  // walk rows in a strip under a layout that draws nodes, linked to it
  walkStrip: boolean
  // lifted walks drawn side by side, a panel per walk or a row per sample,
  // and how many go across by walk; 0 takes whichever count draws each panel
  // largest
  facet: Facet
  facetColumns: number
  // multiples of the force engine's link length and gap between components
  spacing: number
  componentSeparation: number
  // a node's drawn width in px, before depth widens it
  nodeThickness: number
}

export const DEFAULTS: Settings = {
  mode: 'force',
  colorScheme: 'auto',
  nodeWidth: 'walks',
  engine: 'fmmm',
  quality: 2,
  bubbleSpread: 'auto',
  showBubbles: false,
  showDeletionEdges: true,
  showSmallSites: false,
  drawPaths: false,
  showGenes: true,
  nodeLengthLabels: LABEL_DEFAULTS.nodeLengths,
  walkStrip: false,
  facet: '',
  facetColumns: 0,
  spacing: 1,
  componentSeparation: 1,
  nodeThickness: 6,
}

export type Facet = FacetSetting['field']

// links share the nodes' scale where nodes are drawn by walks
export const linkWidthOf = ({ nodeWidth }: Pick<Settings, 'nodeWidth'>) =>
  nodeWidth === 'walks' ? ('walks' as const) : ('uniform' as const)

export const SPACINGS = [
  { value: 0.5, label: 'Compact' },
  { value: 1, label: 'Default' },
  { value: 2, label: 'Loose' },
  { value: 4, label: 'Very loose' },
]

export const SEPARATIONS = [
  { value: 0.5, label: 'Close' },
  { value: 1, label: 'Default' },
  { value: 3, label: 'Far' },
]

export const THICKNESSES = [
  { value: 3, label: 'Thin' },
  { value: 6, label: 'Default' },
  { value: 10, label: 'Thick' },
  { value: 16, label: 'Very thick' },
]

const KEY = 'bandagejs-settings'

export function stored<T>(key: string, fallback: T) {
  try {
    const raw = localStorage.getItem(key)
    const value: unknown = raw === null ? fallback : JSON.parse(raw)
    return value
  } catch {
    return fallback
  }
}

export function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

interface Field<K extends keyof Settings = keyof Settings> {
  key: K
  // the setting's name in a link
  param: string
  read: (value: unknown) => Settings[K] | undefined
  parse: (text: string) => unknown
}

type KeysWith<V> = {
  [K in keyof Settings]: Settings[K] extends V ? K : never
}[keyof Settings]

const choice = <K extends keyof Settings>(
  key: K,
  param: string,
  choices: readonly { value: Settings[K] }[],
): Field<K> => ({
  key,
  param,
  read: value => choices.find(c => c.value === value)?.value,
  parse: text => choices.find(c => String(c.value) === text)?.value,
})

const flag = (
  key: KeysWith<boolean>,
  param: string,
): Field<KeysWith<boolean>> => ({
  key,
  param,
  read: value => (typeof value === 'boolean' ? value : undefined),
  parse: text =>
    text === '1' || text === 'true'
      ? true
      : text === '0' || text === 'false'
        ? false
        : undefined,
})

const count = (
  key: KeysWith<number>,
  param: string,
): Field<KeysWith<number>> => ({
  key,
  param,
  read: value =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0
      ? value
      : undefined,
  parse: text => Number(text),
})

// Every setting, with its choices where it has a fixed set
const FIELDS: readonly Field[] = [
  choice('mode', 'layout', LAYOUT_MODES),
  choice('colorScheme', 'color', COLOR_SCHEMES),
  choice('nodeWidth', 'width', NODE_WIDTHS),
  choice('engine', 'engine', LAYOUT_ENGINES),
  choice('quality', 'quality', LAYOUT_QUALITIES),
  choice('bubbleSpread', 'spread', BUBBLE_SPREADS),
  flag('showBubbles', 'bubbles'),
  flag('showDeletionEdges', 'deletions'),
  flag('showSmallSites', 'smallsites'),
  flag('drawPaths', 'paths'),
  flag('showGenes', 'genes'),
  flag('nodeLengthLabels', 'lengths'),
  flag('walkStrip', 'bars'),
  choice('facet', 'facet', FACET_FIELDS),
  count('facetColumns', 'columns'),
  choice('spacing', 'spacing', SPACINGS),
  choice('componentSeparation', 'separation', SEPARATIONS),
  choice('nodeThickness', 'thickness', THICKNESSES),
]

export const SETTING_PARAMS = FIELDS.map(f => f.param)

function assign<K extends keyof Settings>(
  s: Settings,
  f: Field<K>,
  value: unknown,
) {
  s[f.key] = f.read(value) ?? s[f.key]
}

// Stored settings with each value a choice this build offers, else its default
export function validSettings(raw: unknown) {
  const s: Partial<Record<keyof Settings, unknown>> =
    typeof raw === 'object' && raw !== null ? raw : {}
  const settings = { ...DEFAULTS }
  for (const f of FIELDS) {
    assign(settings, f, s[f.key])
  }
  return settings
}

// The settings as a link states them: the layout always, and whatever else
// differs from the defaults, so a link stays short and a changed default
// reaches its reader
export function settingsParams(s: Settings): [string, string][] {
  return FIELDS.filter(
    f => f.param === 'layout' || s[f.key] !== DEFAULTS[f.key],
  ).map(f => {
    const v = s[f.key]
    return [f.param, typeof v === 'boolean' ? (v ? '1' : '0') : String(v)]
  })
}

// Sets each setting a link names, leaving the rest as they were
export function readSettingsParams(params: URLSearchParams, s: Settings) {
  for (const f of FIELDS) {
    const text = params.get(f.param)
    if (text !== null) {
      assign(s, f, f.parse(text))
    }
  }
}

// A record without this format holds every setting, saved before saves kept
// only changes. A value there that was the default of its time says nothing
// about what the reader chose, so the current default replaces it.
const FORMAT = 2
const WAS_DEFAULT: Partial<Record<string, unknown>> = {
  showDeletionEdges: false,
  showBubbles: true,
  nodeWidth: 'depth',
}

const isRecord = (raw: unknown): raw is Record<string, unknown> =>
  typeof raw === 'object' && raw !== null

export function upgraded(raw: unknown) {
  if (!isRecord(raw)) {
    return raw
  }
  const { format, ...s } = raw
  return format === FORMAT
    ? s
    : Object.fromEntries(
        Object.entries(s).filter(([k, v]) => v !== WAS_DEFAULT[k]),
      )
}

export function loadSettings() {
  return validSettings(upgraded(stored(KEY, {})))
}

// The settings that differ from the defaults, the only ones a save keeps, so
// a changed default reaches a returning visitor
export function changedSettings(settings: Settings) {
  return Object.fromEntries(
    FIELDS.filter(f => settings[f.key] !== DEFAULTS[f.key]).map(f => [
      f.key,
      settings[f.key],
    ]),
  )
}

export function saveSettings(settings: Settings) {
  store(KEY, { format: FORMAT, ...changedSettings(settings) })
}
