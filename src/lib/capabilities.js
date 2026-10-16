/**
 * Whether the browser can actually run WebGPU inference. Checks for an
 * adapter (a present `navigator.gpu` alone isn't enough — some browsers expose
 * it but return no adapter, e.g. headless/software rendering).
 */
export async function detectWebGPU() {
  if (typeof navigator === 'undefined' || !navigator.gpu?.requestAdapter) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return !!adapter
  } catch {
    return false
  }
}
