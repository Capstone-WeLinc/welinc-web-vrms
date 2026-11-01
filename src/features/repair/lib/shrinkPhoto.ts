import { jpegName, SHRINK_QUALITY, shrinkSize } from './photoUpload';

/**
 * Spec 0017, AC-22: a photo the browser can decode goes up as a JPEG with its longest edge at
 * most 2560 px, turned upright from its EXIF orientation. If decoding fails (HEIC on desktop
 * Chrome, for one) or the result is not smaller, the original is sent and the server converts it.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const { width, height } = shrinkSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    // JPEG has no transparency: paint white first, the way the server flattens it (AC-6)
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', SHRINK_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
