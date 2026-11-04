// Reduce fotos grandes antes de guardarlas: ocupan menos y las copias pesan menos.
// No se analiza el contenido de la foto ni se estima ninguna medida a partir de ella.

export async function preparePhoto(file, maxSide = 1600, quality = 0.85) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba con otra foto (JPG o PNG).');
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close && bitmap.close();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('No se pudo preparar la foto.');
  return { blob, width: w, height: h, mime: 'image/jpeg' };
}

export async function blobToBytes(blob) { return new Uint8Array(await blob.arrayBuffer()); }
