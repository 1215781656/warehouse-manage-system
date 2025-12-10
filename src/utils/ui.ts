export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
export async function runWithLoading(loading: { value: boolean }, fn: () => Promise<any>, minMs = 200) {
  loading.value = true
  const start = Date.now()
  try {
    const res = await fn()
    const elapsed = Date.now() - start
    if (elapsed < minMs) await sleep(minMs - elapsed)
    return res
  } finally {
    loading.value = false
  }
}
