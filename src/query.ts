import { HPRC, HPRC_WALKS, isHprc } from './gbz'

import type { GbzSource } from './gbz'

// A cut as the page's query string and back. `walks=hprc` is the HPRC walk
// file; `gbz=`, from older links, still opens, and `gbz=hprc` is the HPRC
// gbz-base database. `expand` names the abridged walks the cut reads in full.
export function gbzQuery(src: GbzSource): Record<string, string> {
  const preset = isHprc(src)
  return {
    ...(preset
      ? { gbz: 'hprc' }
      : { walks: src.db === HPRC_WALKS ? 'hprc' : src.db }),
    ...(!preset && src.index ? { index: src.index } : {}),
    loc: src.region,
    ...(src.referenceSample ? { ref: src.referenceSample } : {}),
    ...(src.haplotypes?.length ? { haps: src.haplotypes.join(',') } : {}),
    ...(src.expand?.length ? { expand: src.expand.join(',') } : {}),
  }
}

function sourceOf(params: URLSearchParams) {
  const walks = params.get('walks')
  const gbz = params.get('gbz')
  const index = params.get('index') ?? undefined
  return walks
    ? { db: walks === 'hprc' ? HPRC_WALKS : walks, index }
    : gbz === 'hprc'
      ? HPRC
      : gbz
        ? { db: gbz, index }
        : undefined
}

export function gbzFromQuery(params: URLSearchParams): GbzSource | undefined {
  const src = sourceOf(params)
  const loc = params.get('loc')
  if (!src || !loc) {
    return undefined
  }
  const haps = params.get('haps')
  const expand = params.get('expand')
  return {
    ...src,
    region: loc,
    referenceSample: params.get('ref') ?? undefined,
    haplotypes: haps ? haps.split(',') : undefined,
    expand: expand ? expand.split(',') : undefined,
  }
}
