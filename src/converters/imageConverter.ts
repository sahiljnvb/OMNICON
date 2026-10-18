/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument } from 'pdf-lib';
import { ImageFormat, ImageOptions } from '../types/conversion';

/**
 * Creates an uncompressed 24-bit or 32-bit BMP file from an ImageData
 */
function createBmpBlob(imageData: ImageData): Blob {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // BMP Header
  view.setUint16(0, 0x424d, false); // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true);
  
  // DIB Header
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);
  
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    let rowStart = offset;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      view.setUint8(rowStart++, b);
      view.setUint8(rowStart++, g);
      view.setUint8(rowStart++, r);
    }
    while ((rowStart - offset) % 4 !== 0) {
      view.setUint8(rowStart++, 0);
    }
    offset = rowStart;
  }
  
  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Creates a Windows ICO file containing PNG data
 */
async function createIcoBlob(sourceCanvas: HTMLCanvasElement): Promise<Blob> {
  const iconCanvas = document.createElement('canvas');
  const size = Math.min(64, Math.max(16, sourceCanvas.width));
  iconCanvas.width = size;
  iconCanvas.height = size;
  const ctx = iconCanvas.getContext('2d')!;
  ctx.drawImage(sourceCanvas, 0, 0, size, size);

  const pngBlob = await new Promise<Blob>((resolve) => {
    iconCanvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
  const pngArrayBuffer = await pngBlob.arrayBuffer();
  const pngBytes = new Uint8Array(pngArrayBuffer);

  const headerSize = 6 + 16;
  const icoSize = headerSize + pngBytes.length;
  const buffer = new ArrayBuffer(icoSize);
  const view = new DataView(buffer);

  // ICONDIR
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);

  // ICONDIRENTRY
  view.setUint8(6, size >= 256 ? 0 : size);
  view.setUint8(7, size >= 256 ? 0 : size);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, headerSize, true);

  const result = new Uint8Array(buffer);
  result.set(pngBytes, headerSize);

  return new Blob([result as any], { type: 'image/x-icon' });
}

export async function convertImage(
  file: File,
  targetFormat: ImageFormat,
  options: ImageOptions = {
    quality: 0.92,
    maintainAspectRatio: true,
    rotation: 0,
    flipH: false,
    flipV: false,
  },
  onProgress?: (pct: number) => void
): Promise<Blob> {
  onProgress?.(15);

  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image file. Check file format.'));
    img.src = objectUrl;
  });

  onProgress?.(35);

  const naturalW = img.naturalWidth || 800;
  const naturalH = img.naturalHeight || 600;

  let targetWidth = options.width || naturalW;
  let targetHeight = options.height || naturalH;

  if (options.maintainAspectRatio && options.width && !options.height) {
    targetHeight = Math.round((naturalH / naturalW) * targetWidth);
  } else if (options.maintainAspectRatio && options.height && !options.width) {
    targetWidth = Math.round((naturalW / naturalH) * targetHeight);
  }

  targetWidth = Math.max(1, targetWidth);
  targetHeight = Math.max(1, targetHeight);

  const isRotated90or270 = options.rotation === 90 || options.rotation === 270;
  const canvasWidth = isRotated90or270 ? targetHeight : targetWidth;
  const canvasHeight = isRotated90or270 ? targetWidth : targetHeight;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Fill background if converting from transparent to JPG or user requested color
  if (targetFormat === 'jpg' || targetFormat === 'jpeg' || options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Apply transformations
  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);

  if (options.rotation) {
    ctx.rotate((options.rotation * Math.PI) / 180);
  }
  if (options.flipH || options.flipV) {
    ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
  }

  ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();

  URL.revokeObjectURL(objectUrl);
  onProgress?.(65);

  // Target format processing
  if (targetFormat === 'pdf') {
    const pdfDoc = await PDFDocument.create();
    const jpegBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.95);
    });
    const jpegBytes = await jpegBlob.arrayBuffer();
    const pdfImage = await pdfDoc.embedJpg(jpegBytes);

    const page = pdfDoc.addPage([canvasWidth, canvasHeight]);
    page.drawImage(pdfImage, {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
    });

    onProgress?.(90);
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
  }

  if (targetFormat === 'bmp') {
    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    onProgress?.(90);
    return createBmpBlob(imgData);
  }

  if (targetFormat === 'ico') {
    onProgress?.(90);
    return await createIcoBlob(canvas);
  }

  if (targetFormat === 'svg') {
    const pngDataUrl = canvas.toDataURL('image/png');
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
  <image href="${pngDataUrl}" width="${canvasWidth}" height="${canvasHeight}" />
</svg>`;
    onProgress?.(95);
    return new Blob([svgContent], { type: 'image/svg+xml' });
  }

  // Standard web canvas export (png, jpg, webp, gif)
  let mimeType = 'image/png';
  if (targetFormat === 'jpg' || targetFormat === 'jpeg') mimeType = 'image/jpeg';
  if (targetFormat === 'webp') mimeType = 'image/webp';
  if (targetFormat === 'gif') mimeType = 'image/gif';

  onProgress?.(85);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onProgress?.(100);
          resolve(blob);
        } else {
          // Fallback to image/png if requested mime is unsupported
          canvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) {
                onProgress?.(100);
                resolve(fallbackBlob);
              } else {
                reject(new Error('Canvas export failed.'));
              }
            },
            'image/png'
          );
        }
      },
      mimeType,
      options.quality
    );
  });
}
