// Profile photos are squared and shrunk in the browser before upload, so the bucket only ever
// holds small JPEGs.

export const AVATAR_SIZE = 256

// The largest centred square inside a w × h image.
export function coverCrop(w: number, h: number): { sx: number; sy: number; s: number } {
  const s = Math.min(w, h)
  return { sx: (w - s) / 2, sy: (h - s) / 2, s }
}

export async function squareJpeg(file: Blob, size = AVATAR_SIZE, quality = 0.86): Promise<Blob> {
  // imageOrientation honours the EXIF rotation phones write into photos.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { sx, sy, s } = coverCrop(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('photo_failed')
  ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, size, size)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('photo_failed'))), 'image/jpeg', quality)
  })
}
