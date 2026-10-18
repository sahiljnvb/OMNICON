/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-lg animate-in slide-in-from-top duration-300">
        <WifiOff className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Offline Mode Active — 100% of Conversions Work Without Internet</span>
      </div>
    );
  }

  return null;
};

export const PrivacyBadge: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
      <span>Zero Server Traffic · 100% Local Sandbox</span>
    </div>
  );
};
