/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, BookOpen, FileSpreadsheet, FileText, Image as ImageIcon, Volume2, Sparkles } from 'lucide-react';
import { SupportedFormat } from '../types/conversion';
import { triggerHaptic } from '../utils/haptics';

interface Preset {
  id: string;
  sourceLabel: string;
  targetLabel: string;
  targetFormat: SupportedFormat;
  accept: string;
  description: string;
  icon: React.ElementType;
  gradientBg: string;
  borderColor: string;
  badgeBg: string;
  accentText: string;
}

const PRESETS: Preset[] = [
  {
    id: 'pdf-to-docx',
    sourceLabel: 'PDF',
    targetLabel: 'DOCX',
    targetFormat: 'docx',
    accept: '.pdf,application/pdf',
    description: 'Extract layout & text to Microsoft Word',
    icon: FileText,
    gradientBg: 'from-violet-900/40 via-purple-900/30 to-indigo-950/50',
    borderColor: 'border-violet-500/30 hover:border-violet-400/60',
    badgeBg: 'bg-violet-500/20 text-violet-300',
    accentText: 'text-violet-300',
  },
  {
    id: 'docx-to-epub',
    sourceLabel: 'DOCX',
    targetLabel: 'EPUB',
    targetFormat: 'epub',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'Format Word documents into e-books',
    icon: BookOpen,
    gradientBg: 'from-emerald-900/40 via-teal-900/30 to-slate-950/50',
    borderColor: 'border-emerald-500/30 hover:border-emerald-400/60',
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    accentText: 'text-emerald-300',
  },
  {
    id: 'pdf-to-epub',
    sourceLabel: 'PDF',
    targetLabel: 'EPUB',
    targetFormat: 'epub',
    accept: '.pdf,application/pdf',
    description: 'Convert PDF poems, couplets & books to EPUB',
    icon: BookOpen,
    gradientBg: 'from-pink-900/40 via-purple-900/40 to-indigo-950/60',
    borderColor: 'border-pink-500/40 hover:border-pink-400/80',
    badgeBg: 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border-pink-400/30',
    accentText: 'text-pink-300',
  },
  {
    id: 'img-to-webp',
    sourceLabel: 'IMAGE',
    targetLabel: 'WEBP',
    targetFormat: 'webp',
    accept: 'image/*',
    description: 'Compress PNG / JPG with zero quality loss',
    icon: ImageIcon,
    gradientBg: 'from-fuchsia-900/40 via-pink-900/30 to-slate-950/50',
    borderColor: 'border-fuchsia-500/30 hover:border-fuchsia-400/60',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300',
    accentText: 'text-fuchsia-300',
  },
  {
    id: 'audio-to-mp3',
    sourceLabel: 'AUDIO',
    targetLabel: 'MP3',
    targetFormat: 'mp3',
    accept: 'audio/*',
    description: 'Encode WAV / OGG / AAC to 192k MP3',
    icon: Volume2,
    gradientBg: 'from-amber-900/40 via-orange-900/30 to-rose-950/50',
    borderColor: 'border-amber-500/30 hover:border-amber-400/60',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    accentText: 'text-amber-300',
  },
  {
    id: 'csv-to-json',
    sourceLabel: 'CSV',
    targetLabel: 'JSON',
    targetFormat: 'json',
    accept: '.csv,text/csv',
    description: 'Parse tabular datasets to JSON schemas',
    icon: FileSpreadsheet,
    gradientBg: 'from-emerald-950/50 via-teal-900/30 to-cyan-950/50',
    borderColor: 'border-teal-500/30 hover:border-teal-400/60',
    badgeBg: 'bg-teal-500/20 text-teal-300',
    accentText: 'text-teal-300',
  },
];

interface Props {
  onPresetSelect: (preset: Preset) => void;
}

export const ConversionPresets: React.FC<Props> = ({ onPresetSelect }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            One-Tap Quick Workflows
          </h3>
        </div>
        <span className="text-[11px] text-indigo-300/80 font-medium">Click to select file</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onPresetSelect(preset);
              }}
              className={`flex flex-col text-left p-3.5 rounded-2xl bg-gradient-to-br ${preset.gradientBg} border ${preset.borderColor} transition-all duration-200 group active:scale-[0.98] cursor-pointer shadow-lg shadow-black/30 hover:shadow-indigo-500/10 hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <span className="px-1.5 py-0.5 rounded bg-black/40 text-slate-200 font-mono text-[10px]">{preset.sourceLabel}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                  <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${preset.badgeBg}`}>
                    {preset.targetLabel}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center">
                  <Icon className={`w-3.5 h-3.5 ${preset.accentText}`} />
                </div>
              </div>
              <p className="text-[11px] text-slate-300/90 font-medium line-clamp-1 leading-normal">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
