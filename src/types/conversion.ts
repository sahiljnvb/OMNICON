/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConversionCategory = 'documents' | 'images' | 'audio' | 'data';

export type DocumentFormat = 'pdf' | 'docx' | 'epub' | 'txt' | 'md' | 'html';
export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp' | 'svg' | 'bmp' | 'ico' | 'gif' | 'pdf';
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac' | 'webm' | 'flac';
export type DataFormat = 'json' | 'csv' | 'xml' | 'yaml' | 'tsv' | 'md-table';

export type SupportedFormat = DocumentFormat | ImageFormat | AudioFormat | DataFormat;

export interface ImageOptions {
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  quality: number; // 0.1 to 1.0
  backgroundColor?: string; // e.g. '#ffffff' for transparent PNG -> JPG
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface AudioOptions {
  bitrate: 128 | 192 | 256 | 320; // kbps
  sampleRate: 44100 | 48000 | 22050; // Hz
  channels: 1 | 2; // 1 = mono, 2 = stereo
  normalizeVolume: boolean;
}

export interface DocumentOptions {
  title?: string;
  author?: string;
  fontSize: 10 | 12 | 14 | 16;
  pageSize: 'A4' | 'Letter';
  layoutMode?: 'auto' | 'poetry' | 'prose';
  language?: 'auto' | 'hi' | 'en';
  ocrMode?: 'auto' | 'always' | 'off';
  ocrLanguage?: 'hin+eng' | 'hin' | 'eng';
}

export interface ConversionOptions {
  image?: ImageOptions;
  audio?: AudioOptions;
  document?: DocumentOptions;
}

export interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  extension: string;
  category: ConversionCategory;
  availableFormats: SupportedFormat[];
  targetFormat: SupportedFormat;
  status: 'idle' | 'converting' | 'completed' | 'error';
  progress: number; // 0 to 100
  options: ConversionOptions;
  resultBlob?: Blob;
  resultUrl?: string;
  resultName?: string;
  resultSize?: number;
  error?: string;
  previewUrl?: string;
}

export interface FormatBadgeInfo {
  format: SupportedFormat;
  label: string;
  category: ConversionCategory;
  mimeType: string;
  iconColor: string;
}
