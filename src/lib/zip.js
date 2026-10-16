/**
 * Minimal ZIP writer (STORE / no compression). Enough to bundle a handful of
 * small files — an image, label .txt, classes.txt and data.yaml — without
 * pulling in a zip dependency.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const LOCAL_SIG = 0x04034b50
const CENTRAL_SIG = 0x02014b50
const END_SIG = 0x06054b50
const UTF8_FLAG = 0x0800

/**
 * @param {Array<{name: string, data: Uint8Array}>} files
 * @returns {Blob}
 */
export function createZip(files) {
  const encoder = new TextEncoder()
  const entries = files.map((f) => ({
    name: encoder.encode(f.name),
    data: f.data,
    crc: crc32(f.data),
  }))

  const localParts = []
  const centralParts = []
  let offset = 0

  for (const e of entries) {
    const local = new Uint8Array(30 + e.name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, LOCAL_SIG, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, UTF8_FLAG, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0, true)
    lv.setUint32(14, e.crc, true)
    lv.setUint32(18, e.data.length, true)
    lv.setUint32(22, e.data.length, true)
    lv.setUint16(26, e.name.length, true)
    lv.setUint16(28, 0, true)
    local.set(e.name, 30)
    localParts.push(local, e.data)

    const central = new Uint8Array(46 + e.name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, CENTRAL_SIG, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, UTF8_FLAG, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, e.crc, true)
    cv.setUint32(20, e.data.length, true)
    cv.setUint32(24, e.data.length, true)
    cv.setUint16(28, e.name.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    central.set(e.name, 46)
    centralParts.push(central)

    offset += local.length + e.data.length
  }

  const centralSize = centralParts.reduce((n, p) => n + p.length, 0)

  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, END_SIG, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' })
}
