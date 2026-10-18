/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { QueuedFile } from '../types/conversion';
import { convertAudio } from './audioConverter';
import { convertData } from './dataConverter';
import { convertDocument, exportTextToDocumentFormat } from './documentConverter';
import { convertImage } from './imageConverter';
import { extractTextFromImageWithOcr } from '../services/ocrService';

export async function processFileConversion(
  item: QueuedFile,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; url: string; filename: string; size: number }> {
  let resultBlob: Blob;
  const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
  const targetExtension = item.targetFormat.toLowerCase();
  const filename = `${baseName}.${targetExtension}`;

  switch (item.category) {
    case 'documents':
      resultBlob = await convertDocument(
        item.file,
        item.targetFormat as any,
        item.options.document,
        onProgress
      );
      break;

    case 'images':
      if (['epub', 'docx', 'txt', 'md', 'html'].includes(targetExtension)) {
        const ocrLang = item.options.document?.ocrLanguage || 'hin+eng';
        const ocrText = await extractTextFromImageWithOcr(
          item.file,
          ocrLang,
          (pct) => onProgress?.(Math.round(pct * 0.7))
        );
        onProgress?.(75);
        resultBlob = await exportTextToDocumentFormat(
          baseName,
          ocrText,
          item.targetFormat as any,
          item.options.document,
          (p) => onProgress?.(75 + Math.round(p * 0.25))
        );
        break;
      }
      resultBlob = await convertImage(
        item.file,
        item.targetFormat as any,
        item.options.image,
        onProgress
      );
      break;

    case 'audio':
      resultBlob = await convertAudio(
        item.file,
        item.targetFormat as any,
        item.options.audio,
        onProgress
      );
      break;

    case 'data':
      resultBlob = await convertData(
        item.file,
        item.targetFormat as any,
        onProgress
      );
      break;

    default:
      throw new Error(`Unsupported category: ${item.category}`);
  }

  const url = URL.createObjectURL(resultBlob);
  return {
    blob: resultBlob,
    url,
    filename,
    size: resultBlob.size,
  };
}

/**
 * Creates a single ZIP archive containing all completed converted files
 */
export async function createZipArchive(
  items: QueuedFile[],
  zipFilename = 'converted_files.zip',
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  const completed = items.filter((i) => i.status === 'completed' && i.resultBlob);
  if (completed.length === 0) {
    throw new Error('No converted files to archive.');
  }

  // Avoid name collisions in zip
  const nameCounts: Record<string, number> = {};

  for (const item of completed) {
    let name = item.resultName || `${item.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat}`;
    if (nameCounts[name]) {
      nameCounts[name]++;
      const ext = name.substring(name.lastIndexOf('.'));
      const base = name.substring(0, name.lastIndexOf('.'));
      name = `${base}_(${nameCounts[name]})${ext}`;
    } else {
      nameCounts[name] = 1;
    }

    zip.file(name, item.resultBlob!);
  }

  return await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );
}
