/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { BatchActionsBar } from './components/BatchActionsBar';
import { ConversionOptionsModal } from './components/ConversionOptionsModal';
import { ConversionPresets } from './components/ConversionPresets';
import { DropZone } from './components/DropZone';
import { FileItemCard } from './components/FileItemCard';
import { FilePreviewModal } from './components/FilePreviewModal';
import { FormatMatrixModal } from './components/FormatMatrixModal';
import { Header } from './components/Header';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { OfflineIndicator, PrivacyBadge } from './components/OfflineIndicator';
import { StudioInspector } from './components/StudioInspector';
import { VaultHistoryDrawer } from './components/VaultHistoryDrawer';
import { createZipArchive, processFileConversion } from './converters';
import {
  ConversionCategory,
  ConversionOptions,
  QueuedFile,
  SupportedFormat,
} from './types/conversion';
import {
  detectCategory,
  getAvailableTargetFormats,
  getFileExtension,
} from './utils/formatters';
import { triggerHaptic } from './utils/haptics';

export default function App() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [completedVault, setCompletedVault] = useState<QueuedFile[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | ConversionCategory>('all');
  const [isConverting, setIsConverting] = useState(false);
  const [optionsModalFile, setOptionsModalFile] = useState<QueuedFile | null>(null);
  const [previewModalFile, setPreviewModalFile] = useState<QueuedFile | null>(null);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showVaultDrawer, setShowVaultDrawer] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('queue');

  const presetFileInputRef = useRef<HTMLInputElement>(null);
  const activePresetTargetRef = useRef<SupportedFormat | null>(null);

  // Add files to queue with intelligent target format and options
  const handleFilesAdded = useCallback(
    (newRawFiles: File[], overrideTargetFormat?: SupportedFormat, overrideOptions?: any) => {
      const newItems: QueuedFile[] = newRawFiles.map((file) => {
        const ext = getFileExtension(file.name);
        const category = detectCategory(file.name, file.type);
        const available = getAvailableTargetFormats(category, ext);

        const isPoemOrHindi = /poem|hindi|कालिदास|कविता|kalidas|scanned|ocr/i.test(file.name);

        // Intelligent default target selection
        let defaultTarget: SupportedFormat =
          overrideTargetFormat ||
          (isPoemOrHindi && available.includes('epub') ? 'epub' : available[0] || 'txt');

        if (!overrideTargetFormat) {
          if (isPoemOrHindi && available.includes('epub')) defaultTarget = 'epub';
          else if (ext === 'pdf') defaultTarget = 'docx';
          else if (ext === 'docx') defaultTarget = 'epub';
          else if (ext === 'epub') defaultTarget = 'pdf';
          else if (['png', 'bmp', 'svg'].includes(ext)) defaultTarget = 'webp';
          else if (['jpg', 'jpeg'].includes(ext)) defaultTarget = 'png';
          else if (['wav', 'aac', 'ogg', 'm4a'].includes(ext)) defaultTarget = 'mp3';
          else if (ext === 'mp3') defaultTarget = 'wav';
          else if (ext === 'csv') defaultTarget = 'json';
          else if (ext === 'json') defaultTarget = 'csv';
        }

        let previewUrl: string | undefined;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }

        return {
          id: 'file-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          extension: ext,
          category,
          availableFormats: available,
          targetFormat: defaultTarget,
          status: 'idle',
          progress: 0,
          previewUrl,
          options: {
            image: {
              quality: 0.92,
              maintainAspectRatio: true,
              rotation: 0,
              flipH: false,
              flipV: false,
            },
            audio: {
              bitrate: 192,
              sampleRate: 44100,
              channels: 2,
              normalizeVolume: true,
            },
            document: {
              fontSize: 12,
              pageSize: 'A4',
              title: overrideOptions?.title || file.name.replace(/\.[^/.]+$/, ''),
              author: overrideOptions?.author || (isPoemOrHindi ? 'आफताब अहमद' : 'OmniConvert User'),
              layoutMode: overrideOptions?.layoutMode || (isPoemOrHindi ? 'poetry' : 'auto'),
              language: overrideOptions?.language || (isPoemOrHindi ? 'hi' : 'auto'),
              ocrMode: overrideOptions?.ocrMode || 'auto',
              ocrLanguage: overrideOptions?.ocrLanguage || 'hin+eng',
              ...overrideOptions,
            },
          },
        };
      });

      setFiles((prev) => [...prev, ...newItems]);
      setMobileTab('queue');
      triggerHaptic('success');
    },
    []
  );

  const handlePresetSelect = (preset: any) => {
    activePresetTargetRef.current = preset.targetFormat;
    if (presetFileInputRef.current) {
      presetFileInputRef.current.accept = preset.accept;
      presetFileInputRef.current.click();
    }
  };

  const handlePresetFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files), activePresetTargetRef.current || undefined);
      e.target.value = '';
    }
  };

  const handleTargetFormatChange = (id: string, newFormat: SupportedFormat) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, targetFormat: newFormat, status: 'idle', progress: 0 } : item
      )
    );
  };

  const handleSaveOptions = (updatedOptions: ConversionOptions) => {
    if (!optionsModalFile) return;
    setFiles((prev) =>
      prev.map((item) =>
        item.id === optionsModalFile.id ? { ...item, options: updatedOptions } : item
      )
    );
    setOptionsModalFile(null);
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      if (f.resultUrl) URL.revokeObjectURL(f.resultUrl);
    });
    setFiles([]);
  };

  // Convert a single file
  const handleConvertSingle = async (targetItem: QueuedFile) => {
    setFiles((prev) =>
      prev.map((i) => (i.id === targetItem.id ? { ...i, status: 'converting', progress: 10, error: undefined } : i))
    );

    try {
      const result = await processFileConversion(targetItem, (pct) => {
        setFiles((prev) =>
          prev.map((i) => (i.id === targetItem.id ? { ...i, progress: pct } : i))
        );
      });

      const completedItem: QueuedFile = {
        ...targetItem,
        status: 'completed',
        progress: 100,
        resultBlob: result.blob,
        resultUrl: result.url,
        resultName: result.filename,
        resultSize: result.size,
      };

      setFiles((prev) =>
        prev.map((i) => (i.id === targetItem.id ? completedItem : i))
      );

      setCompletedVault((prev) => [completedItem, ...prev.filter((p) => p.id !== completedItem.id)]);

      triggerHaptic('success');
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setFiles((prev) =>
        prev.map((i) =>
          i.id === targetItem.id
            ? { ...i, status: 'error', progress: 0, error: err.message || 'Conversion failed.' }
            : i
        )
      );
      triggerHaptic('error');
    }
  };

  // Convert all pending files
  const handleConvertAll = async () => {
    const pending = files.filter((f) => f.status === 'idle');
    if (pending.length === 0) return;

    setIsConverting(true);
    triggerHaptic('medium');

    for (const item of pending) {
      await handleConvertSingle(item);
    }

    setIsConverting(false);
    triggerHaptic('success');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Download all completed files as ZIP
  const handleDownloadZip = async () => {
    try {
      const completedFiles = files.filter((f) => f.status === 'completed');
      const zipBlob = await createZipArchive(completedFiles, 'omni_converted_files.zip');
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `OmniConvert_Batch_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);
      triggerHaptic('success');
    } catch (err: any) {
      console.error('ZIP failed:', err);
      triggerHaptic('error');
    }
  };

  const filteredFiles = files.filter((f) => {
    if (activeFilter === 'all') return true;
    return f.category === activeFilter;
  });

  const completedFiles = files.filter((f) => f.status === 'completed');

  const handleNavClick = (tab: 'queue' | 'presets' | 'vault' | 'formats') => {
    if (tab === 'formats') {
      setShowMatrixModal(true);
    } else if (tab === 'vault') {
      setShowVaultDrawer(true);
    } else {
      setMobileTab(tab);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',system-ui,sans-serif] selection:bg-pink-500 selection:text-white pb-28 lg:pb-16 overflow-x-hidden">
      {/* Radiant ambient colorful background orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hidden preset file input */}
      <input
        ref={presetFileInputRef}
        type="file"
        multiple
        onChange={handlePresetFileInputChange}
        className="hidden"
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Strict 3-Zone Header */}
      <Header onNavClick={handleNavClick} activeNav={mobileTab} />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Colourful Welcome Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-pink-950/60 border border-indigo-500/25 shadow-xl shadow-purple-500/10">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />
              <h2 className="text-sm sm:text-base font-extrabold bg-gradient-to-r from-white via-indigo-100 to-pink-200 bg-clip-text text-transparent">
                Universal Offline Conversion Studio
              </h2>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1 font-medium">
              Convert PDF to Word DOCX, EPUB, images, audio, and datasets locally with zero server upload.
            </p>
          </div>
          <PrivacyBadge />
        </div>

        {/* Desktop Dual-Column Studio Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* Main Left Studio Workspace (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Direct 1-Tap Workflows */}
            {(mobileTab === 'presets' || mobileTab === 'queue') && (
              <ConversionPresets onPresetSelect={handlePresetSelect} />
            )}

            {/* Main Interactive Dropzone */}
            <DropZone onFilesAdded={(f, target, opts) => handleFilesAdded(f, target, opts)} />

            {/* Conversion Queue */}
            {files.length > 0 && (
              <section className="space-y-4 pt-2">
                {/* Segmented Filter Control with vibrant colours */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                  <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-indigo-500/20 rounded-2xl shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveFilter('all');
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        activeFilter === 'all'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({files.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveFilter('documents');
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        activeFilter === 'documents'
                          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-500/25'
                          : 'text-slate-400 hover:text-purple-300'
                      }`}
                    >
                      Docs ({files.filter((f) => f.category === 'documents').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveFilter('images');
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        activeFilter === 'images'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                          : 'text-slate-400 hover:text-cyan-300'
                      }`}
                    >
                      Images ({files.filter((f) => f.category === 'images').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveFilter('audio');
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        activeFilter === 'audio'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25'
                          : 'text-slate-400 hover:text-amber-300'
                      }`}
                    >
                      Audio ({files.filter((f) => f.category === 'audio').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveFilter('data');
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        activeFilter === 'data'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                          : 'text-slate-400 hover:text-emerald-300'
                      }`}
                    >
                      Data ({files.filter((f) => f.category === 'data').length})
                    </button>
                  </div>

                  <span className="text-xs font-mono text-indigo-300 font-semibold hidden sm:inline">
                    {filteredFiles.length} item{filteredFiles.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* File Cards List */}
                <div className="space-y-3">
                  {filteredFiles.map((item) => (
                    <FileItemCard
                      key={item.id}
                      item={item}
                      onTargetFormatChange={handleTargetFormatChange}
                      onOpenSettings={(i) => setOptionsModalFile(i)}
                      onOpenPreview={(i) => setPreviewModalFile(i)}
                      onConvertSingle={handleConvertSingle}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Feature Capability Overview when empty */}
            {files.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-purple-950/20 border border-purple-500/25 shadow-lg">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-2.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">PDF ↔ Word ↔ EPUB</h4>
                  <p className="text-xs text-purple-200/70 mt-1 leading-relaxed">
                    Convert PDF files into editable Word .docx files, e-reader EPUB books, and formatted text documents.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-cyan-950/20 border border-cyan-500/25 shadow-lg">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-2.5">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Image Studio</h4>
                  <p className="text-xs text-cyan-200/70 mt-1 leading-relaxed">
                    Client-side transcoding between PNG, JPG, WebP, SVG, BMP, and ICO with custom compression and dimensions.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-amber-950/20 border border-amber-500/25 shadow-lg">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-2.5">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Audio Transcoding</h4>
                  <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                    LAME MP3 & 16-bit PCM WAV encoding with custom bitrates (128–320 kbps) and volume peak normalization.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Inspector (4 cols on desktop) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-20">
            <StudioInspector
              files={files}
              completedFiles={completedFiles}
              onDownloadZip={handleDownloadZip}
              onSetGlobalTargetFormat={(fmt) => {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.availableFormats.includes(fmt)
                      ? { ...f, targetFormat: fmt, status: 'idle', progress: 0 }
                      : f
                  )
                );
              }}
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating Action Bar */}
      <BatchActionsBar
        files={files}
        onConvertAll={handleConvertAll}
        onDownloadZip={handleDownloadZip}
        onClearAll={handleClearAll}
        onSetGlobalTargetFormat={(fmt) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.availableFormats.includes(fmt)
                ? { ...f, targetFormat: fmt, status: 'idle', progress: 0 }
                : f
            )
          );
        }}
        isConverting={isConverting}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={mobileTab}
        onTabChange={(tab) => {
          if (tab === 'vault') {
            setShowVaultDrawer(true);
          } else if (tab === 'formats') {
            setShowMatrixModal(true);
          } else {
            setMobileTab(tab);
          }
        }}
        queueCount={files.length}
        vaultCount={completedVault.length}
      />

      {/* Modals & Drawers */}
      {optionsModalFile && (
        <ConversionOptionsModal
          file={optionsModalFile}
          onSave={handleSaveOptions}
          onClose={() => setOptionsModalFile(null)}
        />
      )}

      {previewModalFile && (
        <FilePreviewModal
          file={previewModalFile}
          onClose={() => setPreviewModalFile(null)}
        />
      )}

      {showMatrixModal && (
        <FormatMatrixModal onClose={() => setShowMatrixModal(false)} />
      )}

      {showVaultDrawer && (
        <VaultHistoryDrawer
          completedFiles={completedVault}
          onOpenPreview={(f) => setPreviewModalFile(f)}
          onClearHistory={() => setCompletedVault([])}
          onClose={() => setShowVaultDrawer(false)}
        />
      )}
    </div>
  );
}
