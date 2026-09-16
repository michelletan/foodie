const DEFAULT_MAX_DIMENSION = 1000
const DEFAULT_QUALITY = 0.75
const DEFAULT_TYPE = 'image/jpeg'

/**
 * Resizes and re-encodes an image file/blob client-side before it's stored
 * or uploaded. Keeps a 3-5MB phone photo down to roughly 100-300KB.
 * @param {File|Blob} file
 * @param {{ maxDimension?: number, quality?: number, type?: string }} [options]
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    type = DEFAULT_TYPE,
  } = options

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))), type, quality)
  )
  return blob
}
