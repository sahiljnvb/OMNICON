/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Sliders,
  Trash2,
  Volume2,
} from 'lucide-react';
import { QueuedFile, SupportedFormat } from '../types/conversion';
import { formatBytes } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  item: QueuedFile;
  onTargetFormatChange: (id: string, newFormat: SupportedFormat) => void;
  onOpenSettings: (item: QueuedFile) => void;
  onOpenPreview: (item: QueuedFile) => void;
  onConvertSingle: (item: QueuedFile) => void;
  onRemove: (id: string) => void;
}

export const FileItemCard: React.FC<Props> = ({
  item,
  onTargetFormatChange,
  onOpenSettings,
  onOpenPreview,
  onConvertSingle,
  onRemove,
}) => {
  // Vibrant category theme
  const getCategoryTheme = () => {
    switch (item.category) {
      case 'documents':
        return {
          icon: FileText,
          iconColor: 'text-purple-400',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          cardBorder: 'border-purple-500/25 hover:border-purple-400/50',
          glowBg: 'from-purple-950/20 to-indigo-950/20',
        };
      case 'images':
        return {
          icon: ImageIcon,
          iconColor: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          cardBorder: 'border-cyan-500/25 hover:border-cyan-400/50',
          glowBg: 'from-cyan-950/20 to-blue-950/20',
        };
      case 'audio':
        return {
          icon: Volume2,
          iconColor: 'text-amber-400',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          cardBorder: 'border-amber-500/25 hover:border-amber-400/50',
          glowBg: 'from-amber-950/20 to-orange-950/20',
        };
      case 'data':
        return {
          icon: FileSpreadsheet,
          iconColor: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          cardBorder: 'border-emerald-500/25 hover:border-emerald-400/50',
          glowBg: 'from-emerald-950/20 to-teal-950/20',
        };
    }
  };

  const theme = getCategoryTheme();
  const CategoryIcon = theme.icon;

  let sizeDelta: string | null = null;
  if (item.status === 'completed' && item.resultSize) {
    const diff = item.resultSize - item.size;
    const pct = Math.round((diff / item.size) * 100);
    if (pct < 0) {
      sizeDelta = `${pct}% smaller`;
    } else {
      sizeDelta = `+${pct}%`;
    }
  }

  return (
    <div className={`rounded-2xl bg-gradient-to-r ${theme.glowBg} bg-slate-900/90 border ${theme.cardBorder} transition-all p-4 shadow-lg shadow-black/20 hover:shadow-xl`}>
      {/* Top row: Thumbnail, clean unboxed metadata, and action triggers */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* File Thumbnail or Icon */}
          <div className="relative w-12 h-12 rounded-xl bg-slate-800/90 border border-white/[0.12] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <CategoryIcon className={`w-6 h-6 ${theme.iconColor}`} />
            )}
            <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[8px] font-mono font-bold text-center uppercase tracking-wider py-0.5 text-slate-200">
              {item.extension}
            </span>
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate pr-2">
              {item.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-300 font-mono">
              <span>{formatBytes(item.size)}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border ${theme.badgeBg}`}>
                {item.category}
              </span>
              {item.status === 'completed' && item.resultSize && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-emerald-400 font-bold">
                    {formatBytes(item.resultSize)} ({sizeDelta})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center -mr-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenPreview(item);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition cursor-pointer"
            title="Preview file"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings(item);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition cursor-pointer"
            title="Conversion options"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('warning');
              onRemove(item.id);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="Remove from queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle row: Target Selector & Action Trigger */}
      <div className="mt-3 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">Convert to:</span>
          <div className="relative">
            <select
              value={item.targetFormat}
              disabled={item.status === 'converting'}
              onChange={(e) => {
                triggerHaptic('light');
                onTargetFormatChange(item.id, e.target.value as SupportedFormat);
              }}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-800/95 border border-indigo-500/40 text-xs font-bold text-white uppercase tracking-wider focus:outline-none focus:border-pink-500 cursor-pointer disabled:opacity-50 shadow-inner"
            >
              {item.availableFormats.map((fmt) => (
                <option key={fmt} value={fmt} className="bg-slate-900 text-white font-semibold">
                  .{fmt.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {((item.extension === 'pdf' && item.targetFormat === 'epub') ||
            (item.category === 'images' && ['epub', 'docx', 'txt'].includes(item.targetFormat))) && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ⚡ Hindi/Eng OCR
            </span>
          )}
        </div>

        {/* Action button based on status */}
        <div className="flex items-center gap-2">
          {item.status === 'idle' && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onConvertSingle(item);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Convert</span>
            </button>
          )}

          {item.status === 'converting' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
              <span>{item.progress}%</span>
            </div>
          )}

          {item.status === 'completed' && item.resultUrl && (
            <a
              href={item.resultUrl}
              download={item.resultName || `converted.${item.targetFormat}`}
              onClick={() => triggerHaptic('success')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 active:scale-95 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          )}

          {item.status === 'error' && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onConvertSingle(item);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition cursor-pointer"
              title={item.error || 'Conversion error'}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>

      {/* Animated Gradient Progress bar */}
      {item.status === 'converting' && (
        <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-300 animate-pulse"
            style={{ width: `${Math.max(5, item.progress)}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {item.status === 'error' && item.error && (
        <p className="mt-2 text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800/60 font-medium">
          {item.error}
        </p>
      )}
    </div>
  );
};
