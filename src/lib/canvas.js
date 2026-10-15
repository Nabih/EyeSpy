/**
 * Draw an HTMLImageElement (or canvas) into a new canvas at its natural size.
 * Used by the ONNX backend, which works on raw pixel data.
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
