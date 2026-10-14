// A GFA file's text, gunzipped when its first bytes say it is gzip
export async function gfaText(blob: Blob) {
  const magic = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
  return magic[0] === 0x1f && magic[1] === 0x8b
    ? new Response(
        blob.stream().pipeThrough(new DecompressionStream('gzip')),
      ).text()
    : blob.text()
}

// fetch's bare TypeError, as the likely reasons a url couldn't be read
export function readError(e: unknown, url: string) {
  return e instanceof TypeError
    ? new Error(
        `Couldn't read ${url}: the url may be wrong, or its server may not allow cross-origin requests.`,
      )
    : e
}

// fetch, with an HTTP error status thrown as an error
export async function fetchOk(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res
}

// The promise `read` makes for `key`, kept in `cache` for every later call
// until it fails
export function readOnce<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  read: () => Promise<T>,
) {
  let p = cache.get(key)
  if (!p) {
    p = read()
    cache.set(key, p)
    p.catch(() => cache.delete(key))
  }
  return p
}
