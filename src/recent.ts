import type { GbzSource } from './gbz'
import type { Declaration } from './reference'

// What the Open dialog lists to reopen. A local file is kept as its
// FileSystemFileHandle, which IndexedDB can store and localStorage cannot;
// reading it again needs the viewer's permission once per session.

// `declared`: the assemblies the user said the graph's backbones are on, which
// reopening it declares again
export type Entry = {
  name: string
  declared?: Record<string, Declaration>
} & (
  | { kind: 'url'; url: string }
  | { kind: 'gbz'; gbz: GbzSource }
  | { kind: 'file'; handle: FileSystemFileHandle }
)

export type Recent = Entry & { at: number }

const MAX_RECENT = 10
const KEY = 'recent'

let db: Promise<IDBDatabase> | undefined

function database() {
  db ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('bandagejs', 1)
    req.addEventListener('upgradeneeded', () => {
      req.result.createObjectStore('kv')
    })
    req.addEventListener('success', () => {
      resolve(req.result)
    })
    req.addEventListener('error', () => {
      reject(req.error ?? new Error('IndexedDB would not open'))
    })
  })
  return db
}

async function request<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const store = (await database()).transaction('kv', mode).objectStore('kv')
  return new Promise<T>((resolve, reject) => {
    const req = run(store)
    req.addEventListener('success', () => {
      resolve(req.result)
    })
    req.addEventListener('error', () => {
      reject(req.error ?? new Error('IndexedDB request failed'))
    })
  })
}

const isRecentList = (list: unknown): list is Recent[] => Array.isArray(list)

export async function recentList() {
  try {
    const list = await request<unknown>('readonly', s => s.get(KEY))
    return isRecentList(list) ? list : []
  } catch {
    return []
  }
}

async function save(list: Recent[]) {
  try {
    await request('readwrite', s => s.put(list, KEY))
  } catch {}
}

async function same(a: Entry, b: Entry) {
  if (a.kind === 'file' && b.kind === 'file') {
    return a.handle.isSameEntry(b.handle).catch(() => false)
  }
  return a.kind === b.kind && key(a) === key(b)
}

function key(r: Entry) {
  return r.kind === 'url'
    ? r.url
    : r.kind === 'gbz'
      ? JSON.stringify([
          r.gbz.db,
          r.gbz.index,
          r.gbz.region,
          r.gbz.referenceSample,
          r.gbz.haplotypes,
        ])
      : r.name
}

async function without(list: Recent[], entry: Entry) {
  const keep = await Promise.all(list.map(async r => !(await same(r, entry))))
  return list.filter((_, i) => keep[i])
}

export async function remember(entry: Entry) {
  const rest = await without(await recentList(), entry)
  await save([{ ...entry, at: Date.now() }, ...rest].slice(0, MAX_RECENT))
}

export async function forget(entry: Recent) {
  await save(await without(await recentList(), entry))
}

// Chromium's permission calls, which TypeScript's DOM types leave out
interface PermissionedHandle extends FileSystemFileHandle {
  queryPermission(opts: { mode: 'read' }): Promise<PermissionState>
  requestPermission(opts: { mode: 'read' }): Promise<PermissionState>
}

// Must run inside the click that asked for it, which is what lets the
// browser show its permission prompt.
const isPermissioned = (h: FileSystemFileHandle): h is PermissionedHandle =>
  'queryPermission' in h && 'requestPermission' in h

export async function readHandle(handle: FileSystemFileHandle) {
  if (
    isPermissioned(handle) &&
    (await handle.queryPermission({ mode: 'read' })) !== 'granted' &&
    (await handle.requestPermission({ mode: 'read' })) !== 'granted'
  ) {
    throw new Error(`Permission to read ${handle.name} was not given`)
  }
  return handle.getFile()
}

type Picker = (opts: {
  types: { description: string; accept: Record<string, string[]> }[]
}) => Promise<FileSystemFileHandle[]>

// undefined where the browser has no file picker that returns handles, so the
// caller falls back to a plain file input
const hasPicker = (w: Window): w is Window & { showOpenFilePicker: Picker } =>
  'showOpenFilePicker' in w

export function pickFile() {
  const w = window
  return hasPicker(w)
    ? w
        .showOpenFilePicker({
          types: [
            {
              description: 'GFA graphs',
              accept: {
                'text/plain': ['.gfa', '.rgfa', '.txt'],
                'application/gzip': ['.gz'],
              },
            },
          ],
        })
        .then(handles => handles[0]!)
    : undefined
}

// A dropped file's handle, where the browser gives one. It has to be asked for
// during the drop event itself.
type HandleItem = DataTransferItem & {
  getAsFileSystemHandle: () => Promise<FileSystemHandle | null>
}

const givesHandle = (item: DataTransferItem): item is HandleItem =>
  'getAsFileSystemHandle' in item

export function droppedHandle(e: DragEvent) {
  const item = e.dataTransfer?.items[0]
  return item && givesHandle(item)
    ? item
        .getAsFileSystemHandle()
        .then(h => (h instanceof FileSystemFileHandle ? h : undefined))
    : undefined
}
