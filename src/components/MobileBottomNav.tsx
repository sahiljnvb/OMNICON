/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, HardDrive, Layers, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export type MobileTab = 'queue' | 'presets' | 'vault' | 'formats';

interface Props {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  queueCount: number;
  vaultCount: number;
}

export const MobileBottomNav: React.FC<Props> = ({
  activeTab,
  onTabChange,
  queueCount,
  vaultCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c1020]/95 backdrop-blur-2xl border-t border-indigo-500/20 lg:hidden px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="grid grid-cols-4 items-center h-15">
        {/* Tab 1: Queue */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onTabChange('queue');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center relative transition-colors ${
            activeTab === 'queue' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 stroke-[2.2]" />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-[9px] font-bold text-white flex items-center justify-center font-mono shadow-sm">
                {queueCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-semibold tracking-tight">Queue</span>
        </button>

        {/* Tab 2: Presets */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onTabChange('presets');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'presets' ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-1 font-semibold tracking-tight">Presets</span>
        </button>

        {/* Tab 3: Vault / Converted */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onTabChange('vault');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center relative transition-colors ${
            activeTab === 'vault' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <HardDrive className="w-5 h-5 stroke-[2.2]" />
            {vaultCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[9px] font-bold text-white flex items-center justify-center font-mono shadow-sm">
                {vaultCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-semibold tracking-tight">Vault</span>
        </button>

        {/* Tab 4: Formats */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onTabChange('formats');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'formats' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-1 font-semibold tracking-tight">Formats</span>
        </button>
      </div>
    </nav>
  );
};
