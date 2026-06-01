/**
 * Square-crop + downscale an image File into a sharp upload-ready JPEG Blob.
 *
 * Why: phone cameras and copy-pasted screenshots can produce non-square images
 * of arbitrary resolution. Uploading them as-is means the largest display
 * (e.g. dashboard hero avatar @ ~3x DPR) either has to upscale a tiny source
 * (blurry) or download a multi-megabyte file just to render at 96px.
 *
 * Output: square `outputSize`×`outputSize`, center-cropped, JPEG quality 0.92.
 * Defaults to 512px which is enough for every avatar slot in the app (≤ 128px
 * logical × 3x DPR = 384px actual) with headroom.
 */
export async function resizeAvatarToSquare(
  file: File,
  outputSize = 512,
  quality = 0.92,
): Promise<Blob> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Use the browser's best downscale quality.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img, sx, sy, side, side, 0, 0, outputSize, outputSize);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = src;
  });
}
