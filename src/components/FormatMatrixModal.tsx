/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, FileSpreadsheet, FileText, Image as ImageIcon, Volume2, X, ShieldCheck } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const FormatMatrixModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/[0.08] p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Supported Offline Formats</h3>
              <p className="text-xs text-slate-400">All conversions run 100% locally on device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Documents */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-400 mb-2">
              <FileText className="w-4 h-4" />
              <span>Documents & E-Books (Two-Way)</span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-1.5">
              PDF · Word (.docx) · EPUB (.epub) · Plain Text (.txt) · Markdown (.md) · HTML (.html)
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Direct two-way conversion between PDF, DOCX, and EPUB e-readers with extracted text, headings, and standard chapters.
            </p>
          </div>

          {/* Images */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400 mb-2">
              <ImageIcon className="w-4 h-4" />
              <span>Images & Vector Graphics</span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-1.5">
              PNG · JPEG / JPG · WebP · SVG Vector · BMP · Windows ICO · GIF · Image to PDF
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hardware-accelerated canvas transforms, quality compression sliders, custom dimensions, transparency filling, and icon packing.
            </p>
          </div>

          {/* Audio */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-2">
              <Volume2 className="w-4 h-4" />
              <span>Audio Formats</span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-1.5">
              MP3 · WAV (16-bit PCM) · OGG Vorbis · AAC / M4A · WebM Opus · FLAC
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decoded via Web Audio API and encoded offline via LAME MP3 / PCM WAV with bitrate controls (128–320 kbps) and mono/stereo mixdown.
            </p>
          </div>

          {/* Data */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Standard Data & Spreadsheets</span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-1.5">
              CSV · JSON · TSV · XML · YAML · Markdown Table
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Two-way serialization between tabular delimited data, nested JSON objects, XML schemas, and YAML documents.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Server Latency · Private Sandbox</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
