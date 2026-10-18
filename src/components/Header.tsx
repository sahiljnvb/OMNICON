/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  onNavClick: (tab: 'queue' | 'presets' | 'vault' | 'formats') => void;
  activeNav: string;
}

export const Header: React.FC<Props> = ({ onNavClick, activeNav }) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-indigo-500/20 bg-[#090d16]/95 backdrop-blur-xl">
      {/* Top subtle iridescent glow line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title with colorful gradient mark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 p-0.5 shadow-md shadow-purple-500/25">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center text-white">
              <ArrowLeftRight className="w-4 h-4 text-cyan-400 stroke-[2.4]" />
            </div>
          </div>
          <span className="text-base font-extrabold tracking-tight text-white whitespace-nowrap">
            Omni<span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Convert</span>
          </span>
        </div>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavClick('queue');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeNav === 'queue' ? 'text-cyan-400' : 'hover:text-white text-slate-400'
            }`}
          >
            Converter Studio
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavClick('presets');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeNav === 'presets' ? 'text-pink-400' : 'hover:text-white text-slate-400'
            }`}
          >
            Direct Presets
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavClick('vault');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeNav === 'vault' ? 'text-emerald-400' : 'hover:text-white text-slate-400'
            }`}
          >
            Session Vault
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavClick('formats');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeNav === 'formats' ? 'text-amber-400' : 'hover:text-white text-slate-400'
            }`}
          >
            Formats Matrix
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
