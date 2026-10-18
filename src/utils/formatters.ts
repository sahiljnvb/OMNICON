/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConversionCategory, SupportedFormat } from '../types/conversion';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return (parts.pop() || '').toLowerCase();
  }
  return '';
}

export function detectCategory(filename: string, mimeType: string): ConversionCategory {
  const ext = getFileExtension(filename);

  if (['pdf', 'docx', 'doc', 'epub', 'txt', 'md', 'html', 'rtf'].includes(ext)) {
    return 'documents';
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'avif', 'tiff'].includes(ext)) {
    return 'images';
  }
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm', 'flac', 'opus'].includes(ext)) {
    return 'audio';
  }
  if (['json', 'csv', 'tsv', 'xml', 'yaml', 'yml'].includes(ext)) {
    return 'data';
  }

  // Fallback check mime
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) return 'documents';
  if (mimeType.includes('json') || mimeType.includes('csv') || mimeType.includes('xml')) return 'data';

  return 'documents';
}

export function getAvailableTargetFormats(category: ConversionCategory, currentExt: string): SupportedFormat[] {
  const cleanExt = currentExt.toLowerCase();

  switch (category) {
    case 'documents': {
      const docFormats: SupportedFormat[] = ['pdf', 'docx', 'epub', 'txt', 'html', 'md'];
      return docFormats.filter((f) => f !== cleanExt);
    }
    case 'images': {
      const imgFormats: SupportedFormat[] = ['png', 'jpg', 'webp', 'svg', 'bmp', 'ico', 'gif', 'pdf', 'epub', 'docx', 'txt'];
      return imgFormats.filter((f) => f !== cleanExt);
    }
    case 'audio': {
      const audioFormats: SupportedFormat[] = ['mp3', 'wav', 'ogg', 'aac', 'webm', 'flac'];
      return audioFormats.filter((f) => f !== cleanExt);
    }
    case 'data': {
      const dataFormats: SupportedFormat[] = ['json', 'csv', 'tsv', 'xml', 'yaml', 'md-table'];
      return dataFormats.filter((f) => f !== cleanExt);
    }
  }
}

export function getFormatMimeType(format: SupportedFormat): string {
  switch (format) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'epub': return 'application/epub+zip';
    case 'txt': return 'text/plain';
    case 'md': return 'text/markdown';
    case 'html': return 'text/html';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'bmp': return 'image/bmp';
    case 'ico': return 'image/x-icon';
    case 'gif': return 'image/gif';
    case 'mp3': return 'audio/mp3';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'aac': return 'audio/aac';
    case 'webm': return 'audio/webm';
    case 'flac': return 'audio/flac';
    case 'json': return 'application/json';
    case 'csv': return 'text/csv';
    case 'tsv': return 'text/tab-separated-values';
    case 'xml': return 'application/xml';
    case 'yaml': return 'text/yaml';
    case 'md-table': return 'text/markdown';
    default: return 'application/octet-stream';
  }
}
