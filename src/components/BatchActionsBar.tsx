/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Archive, RefreshCw, Trash2, Zap } from 'lucide-react';
import { QueuedFile, SupportedFormat } from '../types/conversion';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  files: QueuedFile[];
  onConvertAll: () => void;
  onDownloadZip: () => void;
  onClearAll: () => void;
  onSetGlobalTargetFormat: (format: SupportedFormat) => void;
  isConverting: boolean;
}

export const BatchActionsBar: React.FC<Props> = ({
  files,
  onConvertAll,
  onDownloadZip,
  onClearAll,
  isConverting,
}) => {
  const [isZipping, setIsZipping] = useState(false);

  const totalFiles = files.length;
  const pendingFiles = files.filter((f) => f.status === 'idle').length;
  const completedFiles = files.filter((f) => f.status === 'completed').length;

  if (totalFiles === 0) return null;

  const handleZipDownload = async () => {
    triggerHaptic('medium');
    setIsZipping(true);
    try {
      await onDownloadZip();
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed bottom-16 lg:bottom-4 inset-x-0 z-30 px-3 sm:px-6 pointer-events-none">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-r from-[#0e1428]/95 via-[#18112e]/95 to-[#0e1428]/95 border border-indigo-500/30 p-2.5 sm:p-3.5 shadow-2xl shadow-purple-500/15 backdrop-blur-2xl flex items-center justify-between gap-3 pointer-events-auto">
          {/* Left: Status text with vibrant highlight */}
          <div className="flex items-center gap-2.5 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
            <span className="text-xs sm:text-sm font-bold text-white">
              <span className="text-pink-400">{completedFiles}</span> of {totalFiles} converted
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('warning');
                onClearAll();
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 transition cursor-pointer"
            >
              Clear
            </button>

            {completedFiles > 0 && (
              <button
                type="button"
                onClick={handleZipDownload}
                disabled={isZipping}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
              >
                <Archive className={`w-3.5 h-3.5 ${isZipping ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isZipping ? 'Zipping...' : 'Download ZIP'}</span>
                <span className="sm:hidden">ZIP</span>
              </button>
            )}

            {pendingFiles > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onConvertAll();
                }}
                disabled={isConverting}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-purple-500/30 active:scale-95 transition cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isConverting ? 'animate-spin' : ''}`} />
                <span>{isConverting ? 'Converting...' : `Convert All (${pendingFiles})`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
