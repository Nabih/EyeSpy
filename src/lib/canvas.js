/**
 * Draw an HTMLImageElement (or canvas) into a new canvas at its natural size.
 * Used to feed detectors that expect a canvas / RawImage rather than an <img>.
 */
export function imageToCanvas(image) {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(image, 0, 0, width, height)
  return canvas
}
