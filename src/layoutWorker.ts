import { layoutEngine } from '@jbrowse/bandage-core'

import type { EngineRequest } from '@jbrowse/bandage-core'

// A force layout off the main thread: the engine the request names, the
// Bandage wasm module or the stress layout, the same request the plugin's
// GraphComputeLayout RPC runs.
async function reply(request: EngineRequest) {
  try {
    self.postMessage(await layoutEngine(request))
  } catch (error) {
    self.postMessage({ error: String(error) })
  }
}

self.addEventListener('message', (e: MessageEvent<EngineRequest>) => {
  void reply(e.data)
})
