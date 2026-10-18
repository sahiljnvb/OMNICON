/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Archive, Cpu, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import { QueuedFile, SupportedFormat } from '../types/conversion';
import { formatBytes } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  files: QueuedFile[];
  completedFiles: QueuedFile[];
  onDownloadZip: () => void;
  onSetGlobalTargetFormat: (fmt: SupportedFormat) => void;
}

export const StudioInspector: React.FC<Props> = ({
  files,
  completedFiles,
  onDownloadZip,
  onSetGlobalTargetFormat,
}) => {
  const totalOriginalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalPending = files.filter((f) => f.status === 'idle').length;

  const getFormatBadgeStyle = (fmt: string) => {
    switch (fmt) {
      case 'docx':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30';
      case 'pdf':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30';
      case 'epub':
        return 'bg-violet-500/20 text-violet-300 border-violet-500/40 hover:bg-violet-500/30';
      case 'webp':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30';
      case 'mp3':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30';
      case 'json':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <aside className="space-y-4">
      {/* Studio Metrics Panel with colorful gradients */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 to-[#0e1428]/95 border border-indigo-500/20 p-4 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Studio Inspector
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-cyan-400">
            {completedFiles.length}/{files.length} Done
          </span>
        </div>

        {/* 2-column KPI stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/20">
            <span className="text-[11px] text-cyan-300 font-medium">Total Size</span>
            <p className="text-sm font-bold text-white font-mono mt-0.5">
              {formatBytes(totalOriginalBytes)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/30 to-teal-950/30 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-300 font-medium">Queue State</span>
            <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {totalPending === 0 && files.length > 0 ? 'All Ready' : `${totalPending} Pending`}
            </p>
          </div>
        </div>

        {/* Global Format Quick Overrides with colorful badges */}
        {files.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-slate-300">
              Set All Target Formats:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['docx', 'pdf', 'epub', 'webp', 'mp3', 'json'] as SupportedFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onSetGlobalTargetFormat(fmt);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold uppercase transition cursor-pointer shadow-sm ${getFormatBadgeStyle(fmt)}`}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ZIP Batch Archiver Button */}
        {completedFiles.length > 0 && (
          <button
            type="button"
            onClick={onDownloadZip}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            <span>Download All as ZIP ({completedFiles.length})</span>
          </button>
        )}
      </div>

      {/* Local Engine Security & Privacy Spec with emerald glow */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-teal-950/30 border border-emerald-500/20 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>100% Offline Local Engine</span>
        </div>
        <p className="text-slate-300/80 leading-relaxed text-[11px]">
          Conversions occur strictly on your CPU using browser Canvas, Web Audio API, and JSZip. Zero server uploads, zero latency, complete offline privacy.
        </p>
      </div>
    </aside>
  );
};
