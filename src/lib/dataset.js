/**
 * Auto-labelling: turn the current detections into a YOLO-format training
 * sample. Boxes are normalised to the image size and written as
 * `class_index cx cy w h` (all in [0, 1]), matching what YOLOv8 / YOLO11
 * expect alongside a `classes.txt` / `data.yaml`.
 */

const encoder = new TextEncoder()

/** File extension of an image name, defaulting to `.png`. */
export function imageExtension(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '')
  return m ? `.${m[1].toLowerCase()}` : '.png'
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * @param {Array<{class:string, bbox:{x:number,y:number,width:number,height:number}}>} detections
 * @param {string[]} classNames canonical class list; its order defines the indices
 * @param {number} width image width in pixels
 * @param {number} height image height in pixels
 * @param {number} [precision] decimals for the normalised values
 * @returns {string[]} one "index cx cy w h" line per detection
 */
export function yoloLines(detections, classNames, width, height, precision = 6) {
  const lines = []
  for (const d of detections) {
    const index = classNames.indexOf(d.class)
    if (index < 0 || width <= 0 || height <= 0) continue
    const cx = clamp01((d.bbox.x + d.bbox.width / 2) / width)
    const cy = clamp01((d.bbox.y + d.bbox.height / 2) / height)
    const w = clamp01(d.bbox.width / width)
    const h = clamp01(d.bbox.height / height)
    lines.push(
      [index, cx.toFixed(precision), cy.toFixed(precision), w.toFixed(precision), h.toFixed(precision)].join(
        ' ',
      ),
    )
  }
  return lines
}

/** `classes.txt`: one class name per line, index = line number. */
export function classesTxt(classNames) {
  return `${classNames.join('\n')}\n`
}

/** Minimal Ultralytics `data.yaml` pointing at the bundled images/labels. */
export function dataYaml(classNames, { train = 'images', val = 'images' } = {}) {
  const names = classNames.map((n) => `  - ${n}`).join('\n')
  return `path: .\ntrain: ${train}\nval: ${val}\n\nnames:\n${names}\n`
}

/**
 * Assemble the files for a one-image dataset.
 * @param {{base:string, ext:string, imageBytes:Uint8Array, detections:Array, classNames:string[], width:number, height:number}} opts
 * @returns {Array<{name:string, data:Uint8Array}>}
 */
export function buildDatasetFiles({ base, ext, imageBytes, detections, classNames, width, height }) {
  const lines = yoloLines(detections, classNames, width, height)
  return [
    { name: `images/${base}${ext}`, data: imageBytes },
    { name: `labels/${base}.txt`, data: encoder.encode(lines.length ? `${lines.join('\n')}\n` : '') },
    { name: 'classes.txt', data: encoder.encode(classesTxt(classNames)) },
    { name: 'data.yaml', data: encoder.encode(dataYaml(classNames)) },
  ]
}
