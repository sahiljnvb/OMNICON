/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createWorker } from 'tesseract.js';
import { cleanDevanagariText } from '../utils/devanagariUtils';

export type OcrLanguage = 'hin+eng' | 'hin' | 'eng';

/**
 * Checks if a PDF is an image-only / scanned PDF with negligible digital text
 */
export async function isScannedOrImagePdf(
  pdf: any,
  sampleMaxPages: number = 3
): Promise<boolean> {
  try {
    const numPages = Math.min(pdf.numPages || 1, sampleMaxPages);
    let totalTextChars = 0;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      if (textContent && textContent.items) {
        for (const item of textContent.items as any[]) {
          if (item?.str) {
            totalTextChars += item.str.trim().length;
          }
        }
      }
    }

    // If average characters per page is less than 20, it's almost certainly a scanned / image PDF
    return totalTextChars < numPages * 20;
  } catch (err) {
    console.warn('Error checking if PDF is scanned:', err);
    return false;
  }
}

/**
 * Renders a PDF page to a high-resolution HTML Canvas for OCR
 */
export async function renderPdfPageToCanvas(
  page: any,
  scale: number = 2.0
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Failed to obtain 2D canvas context for PDF OCR rendering');
  }

  // Paint solid white background first so transparent PDF backgrounds do not turn black
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}

/**
 * Perform Hindi and English OCR on all pages of a PDF
 */
export async function extractTextFromPdfWithOcr(
  pdf: any,
  lang: OcrLanguage = 'hin+eng',
  onProgress?: (progressPct: number, statusText?: string) => void
): Promise<{ text: string; pages: string[] }> {
  const numPages = pdf.numPages || 1;
  const ocrPages: string[] = [];

  // Determine language array for Tesseract
  const langs = lang === 'hin+eng' ? ['hin', 'eng'] : [lang];

  onProgress?.(5, 'Initializing Hindi & English OCR engine...');

  let worker: any = null;
  try {
    worker = await createWorker(langs, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // progress inside current page
        } else if (m.status?.includes('loading')) {
          onProgress?.(8, 'Loading Devanagari & Latin OCR models...');
        }
      },
    });

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const pageBasePct = 10 + Math.round(((pageNum - 1) / numPages) * 75);
      onProgress?.(
        pageBasePct,
        `Page ${pageNum}/${numPages}: Rendering high-res page for OCR...`
      );

      const page = await pdf.getPage(pageNum);
      const canvas = await renderPdfPageToCanvas(page, 2.0);

      onProgress?.(
        pageBasePct + Math.round(35 / numPages),
        `Page ${pageNum}/${numPages}: Reading Hindi & English text with OCR...`
      );

      const result = await worker.recognize(canvas);
      const rawText = result.data?.text || '';
      const cleaned = cleanDevanagariText(rawText);

      ocrPages.push(cleaned);

      onProgress?.(
        Math.round(10 + (pageNum / numPages) * 75),
        `Page ${pageNum}/${numPages}: OCR text extracted successfully.`
      );
    }
  } catch (err: any) {
    console.error('Tesseract OCR error:', err);
    throw new Error(`OCR processing failed: ${err?.message || 'unknown error'}`);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore terminate cleanup
      }
    }
  }

  const combinedText = ocrPages.join('\n\n').trim();
  return {
    text: combinedText,
    pages: ocrPages,
  };
}

/**
 * Performs Hindi & English OCR directly on an image file or blob
 */
export async function extractTextFromImageWithOcr(
  imageSource: Blob | File | HTMLCanvasElement,
  lang: OcrLanguage = 'hin+eng',
  onProgress?: (progressPct: number, statusText?: string) => void
): Promise<string> {
  const langs = lang === 'hin+eng' ? ['hin', 'eng'] : [lang];

  onProgress?.(10, 'Initializing Hindi & English OCR engine...');

  let worker: any = null;
  try {
    worker = await createWorker(langs, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const p = Math.round((m.progress || 0) * 80);
          onProgress?.(15 + p, `Recognizing text (${p}%)...`);
        } else if (m.status?.includes('loading')) {
          onProgress?.(12, 'Loading OCR models...');
        }
      },
    });

    onProgress?.(25, 'Scanning image for Hindi & English text...');
    const result = await worker.recognize(imageSource);
    const rawText = result.data?.text || '';
    onProgress?.(95, 'Polishing extracted text and verse structure...');
    return cleanDevanagariText(rawText);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
  }
}
