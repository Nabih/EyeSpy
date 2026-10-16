/**
 * Whether the browser can actually run WebGPU inference. A present
 * `navigator.gpu` isn't enough: some environments expose it but return no
 * adapter, and a fallback (software) adapter is slower than the WASM backend,
 * so we only accept a real hardware adapter.
 */
export async function detectWebGPU() {
  if (typeof navigator === 'undefined' || !navigator.gpu?.requestAdapter) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return false
    if (adapter.isFallbackAdapter) return false
    return true
  } catch {
    return false
  }
}
