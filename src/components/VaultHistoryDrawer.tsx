/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Archive, ArrowDownToLine, Check, Eye, Trash2, X, HardDrive } from 'lucide-react';
import { QueuedFile } from '../types/conversion';
import { formatBytes } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  completedFiles: QueuedFile[];
  onOpenPreview: (file: QueuedFile) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export const VaultHistoryDrawer: React.FC<Props> = ({
  completedFiles,
  onOpenPreview,
  onClearHistory,
  onClose,
}) => {
  const totalSavedBytes = completedFiles.reduce((acc, f) => {
    if (f.resultSize && f.resultSize < f.size) {
      return acc + (f.size - f.resultSize);
    }
    return acc;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-gradient-to-b from-[#0e1428] to-[#140e28] border border-indigo-500/30 p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0c1020] rounded-[14px] flex items-center justify-center text-emerald-400">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Session Conversion Vault</h3>
              <p className="text-xs text-slate-300">
                {completedFiles.length} file{completedFiles.length === 1 ? '' : 's'} converted in memory
                {totalSavedBytes > 0 && ` · Saved ${formatBytes(totalSavedBytes)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of converted files */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
          {completedFiles.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-300">No completed conversions yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Converted files will appear here for rapid re-download and inspection.
              </p>
            </div>
          ) : (
            completedFiles.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-indigo-500/20 hover:border-indigo-400/50 transition gap-3 shadow-md"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {item.resultName || item.name}
                  </p>
                  <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                    {formatBytes(item.resultSize || item.size)} · Converted from .{item.extension.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onOpenPreview(item);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                    title="Preview file"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {item.resultUrl && (
                    <a
                      href={item.resultUrl}
                      download={item.resultName || `converted.${item.targetFormat}`}
                      onClick={() => triggerHaptic('success')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {completedFiles.length > 0 && (
          <div className="pt-3 border-t border-indigo-500/20 flex items-center justify-between">
            <button
              onClick={() => {
                triggerHaptic('warning');
                onClearHistory();
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Session History</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
