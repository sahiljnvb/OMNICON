/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  FileSpreadsheet,
  FileText,
  FileUp,
  Image as ImageIcon,
  Scan,
  Sparkles,
  Upload,
  Volume2,
  Zap,
} from 'lucide-react';
import { SupportedFormat } from '../types/conversion';
import { triggerHaptic } from '../utils/haptics';
import {
  createSampleAudio,
  createSampleCsv,
  createSampleHindiPoemPdf,
  createSampleImage,
  createSamplePdf,
  createSampleScannedHindiPoemPdf,
} from '../utils/sampleFiles';

interface Props {
  onFilesAdded: (files: File[], overrideTarget?: SupportedFormat, overrideOptions?: any) => void;
}

export const DropZone: React.FC<Props> = ({ onFilesAdded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    triggerHaptic('medium');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      triggerHaptic('medium');
      onFilesAdded(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleSampleClick = async (type: 'hindi-poem' | 'scanned-ocr' | 'pdf' | 'image' | 'audio' | 'csv') => {
    triggerHaptic('light');
    if (type === 'hindi-poem') {
      const sampleFile = await createSampleHindiPoemPdf();
      onFilesAdded([sampleFile], 'epub', {
        title: 'कालिदास से चैटजीपीटी तक',
        author: 'आफताब अहमद',
        layoutMode: 'poetry',
        language: 'hi',
        fontSize: 12,
        pageSize: 'A4',
      });
      return;
    }

    if (type === 'scanned-ocr') {
      const sampleFile = await createSampleScannedHindiPoemPdf();
      onFilesAdded([sampleFile], 'epub', {
        title: 'कालिदास से चैटजीपीटी तक',
        author: 'आफताब अहमद',
        layoutMode: 'poetry',
        language: 'hi',
        ocrMode: 'auto',
        ocrLanguage: 'hin+eng',
        fontSize: 12,
        pageSize: 'A4',
      });
      return;
    }

    let sampleFile: File;
    if (type === 'pdf') sampleFile = await createSamplePdf();
    else if (type === 'image') sampleFile = await createSampleImage();
    else if (type === 'audio') sampleFile = await createSampleAudio();
    else sampleFile = createSampleCsv();

    onFilesAdded([sampleFile]);
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Drag & Drop Zone with Iridescent Gradient Border & Glow */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group rounded-3xl p-6 sm:p-9 text-center flex flex-col items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden ${
          isDragOver
            ? 'bg-gradient-to-br from-indigo-950/80 via-purple-950/80 to-pink-950/80 ring-2 ring-pink-500 scale-[0.995] shadow-2xl shadow-indigo-500/20'
            : 'bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-purple-950/30 border border-indigo-500/20 hover:border-pink-500/40 hover:shadow-xl hover:shadow-purple-500/10'
        }`}
      >
        {/* Colorful background ambient orbs */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/25 transition-all" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-pink-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-pink-500/25 transition-all" />

        {/* Central Luminous Logo Badge */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-purple-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-3.5">
          <div className="w-full h-full bg-[#0c1020] rounded-[14px] flex items-center justify-center text-white">
            <FileUp className="w-7 h-7 text-transparent bg-clip-text bg-gradient-to-tr from-cyan-300 via-indigo-200 to-pink-300 stroke-[2.2]" />
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
          Drop files to convert or{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-400 bg-clip-text text-transparent underline decoration-pink-500/60 underline-offset-4">
            browse device
          </span>
        </h3>
        <p className="mt-1.5 text-xs text-indigo-200/80 max-w-sm sm:max-w-md font-medium">
          PDF, Word (.docx), EPUB, Images (PNG, JPG, WebP, SVG, ICO), Audio (MP3, WAV, OGG) & Data
        </p>

        {/* Action button triggers with vibrant styling */}
        <div className="mt-4 flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              cameraInputRef.current?.click();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 border border-cyan-500/30 hover:border-cyan-400 text-xs font-bold text-cyan-300 shadow-md shadow-cyan-500/10 hover:bg-cyan-950/40 transition active:scale-95 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Choose Files</span>
          </button>
        </div>
      </div>

      {/* Colorful Instant Test Samples Row */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900/95 via-indigo-950/60 to-purple-950/40 border border-indigo-500/30 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />
            <span className="text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-300 via-pink-300 to-indigo-200 bg-clip-text text-transparent">
              Instant 1-Click Test Samples
            </span>
          </div>
          <span className="text-[11px] text-indigo-300/80 font-medium hidden sm:inline">Loads instantly in device memory</span>
        </div>

        {/* Featured Test Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
          {/* Hero Hindi Poem Test Card */}
          <button
            type="button"
            onClick={() => handleSampleClick('hindi-poem')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/70 via-indigo-900/60 to-pink-900/70 border border-purple-400/50 hover:border-pink-400 text-left shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-md">
                <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-extrabold text-white truncate font-['Noto_Sans_Devanagari','Mangal',sans-serif]">
                    कालिदास से चैटजीपीटी तक
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/30 text-pink-200 border border-pink-400/40 shrink-0">
                    PDF ➔ EPUB
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/80 truncate mt-0.5 font-medium">
                  Hindi couplets, centered verse styling & author metadata
                </p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold shrink-0 border border-white/15">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Load</span>
            </div>
          </button>

          {/* Scanned Image PDF OCR Test Card */}
          <button
            type="button"
            onClick={() => handleSampleClick('scanned-ocr')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-orange-950/60 to-purple-950/70 border border-amber-500/50 hover:border-amber-400 text-left shadow-lg shadow-amber-500/15 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-md">
                <Scan className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-extrabold text-amber-200 truncate">
                    Scanned Image PDF
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 shrink-0">
                    Hindi+Eng OCR ➔ EPUB
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 truncate mt-0.5 font-medium">
                  Rasterized image PDF with 0 font data; extracted via OCR to EPUB
                </p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 text-xs font-bold shrink-0 border border-amber-500/30">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>OCR</span>
            </div>
          </button>
        </div>

        {/* 4 Other Fast Samples */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSampleClick('pdf')}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/80 border border-indigo-500/30 hover:border-indigo-400 text-xs font-semibold text-indigo-300 shadow-sm transition hover:scale-[1.02] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Sample Report (PDF)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSampleClick('image')}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400 text-xs font-semibold text-cyan-300 shadow-sm transition hover:scale-[1.02] cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Artwork PNG</span>
          </button>

          <button
            type="button"
            onClick={() => handleSampleClick('audio')}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 text-xs font-semibold text-amber-300 shadow-sm transition hover:scale-[1.02] cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Audio Chime (WAV)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSampleClick('csv')}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400 text-xs font-semibold text-emerald-300 shadow-sm transition hover:scale-[1.02] cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Dataset CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
