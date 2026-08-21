const TARGET_IMAGE_SIZE = 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2400;

function replaceExtension(fileName: string) {
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '') || 'image';
  return `${nameWithoutExtension}.webp`;
}

export async function resizeImageFile(file: File, maxBytes = TARGET_IMAGE_SIZE) {
  if (!file.type.startsWith('image/')) {
    throw new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น');
  }

  if (file.size <= maxBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('ไม่สามารถอ่านไฟล์รูปภาพนี้ได้ กรุณาเลือกไฟล์ JPG, PNG หรือ WebP');
  }

  const initialScale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * initialScale));
  let height = Math.max(1, Math.round(bitmap.height * initialScale));
  let quality = 0.88;
  let result: Blob | null = null;

  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');

      if (!context) throw new Error('เบราว์เซอร์ไม่รองรับการย่อรูปภาพ');

      context.drawImage(bitmap, 0, 0, width, height);
      result = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', quality)
      );

      if (result && result.size <= maxBytes) break;

      if (quality > 0.5) {
        quality -= 0.08;
      } else {
        width = Math.max(1, Math.round(width * 0.85));
        height = Math.max(1, Math.round(height * 0.85));
      }
    }
  } finally {
    bitmap.close();
  }

  if (!result || result.size > maxBytes) {
    throw new Error('ไม่สามารถย่อรูปให้ต่ำกว่า 1 MB ได้ กรุณาใช้รูปที่มีขนาดเล็กลง');
  }

  return new File([result], replaceExtension(file.name), {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}
