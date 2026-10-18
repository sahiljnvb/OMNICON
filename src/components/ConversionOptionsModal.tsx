/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Sliders, X, RotateCw, FlipHorizontal, Volume2, FileText, Image as ImageIcon } from 'lucide-react';
import { ConversionOptions, QueuedFile } from '../types/conversion';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  file: QueuedFile;
  onSave: (updatedOptions: ConversionOptions) => void;
  onClose: () => void;
}

export const ConversionOptionsModal: React.FC<Props> = ({ file, onSave, onClose }) => {
  const [options, setOptions] = useState<ConversionOptions>({
    image: {
      quality: file.options.image?.quality ?? 0.92,
      maintainAspectRatio: file.options.image?.maintainAspectRatio ?? true,
      rotation: file.options.image?.rotation ?? 0,
      flipH: file.options.image?.flipH ?? false,
      flipV: file.options.image?.flipV ?? false,
      backgroundColor: file.options.image?.backgroundColor ?? '#ffffff',
      width: file.options.image?.width,
      height: file.options.image?.height,
    },
    audio: {
      bitrate: file.options.audio?.bitrate ?? 192,
      sampleRate: file.options.audio?.sampleRate ?? 44100,
      channels: file.options.audio?.channels ?? 2,
      normalizeVolume: file.options.audio?.normalizeVolume ?? true,
    },
    document: {
      fontSize: file.options.document?.fontSize ?? 12,
      pageSize: file.options.document?.pageSize ?? 'A4',
      title: file.options.document?.title ?? file.name.replace(/\.[^/.]+$/, ''),
      author: file.options.document?.author ?? 'OmniConvert User',
    },
  });

  const handleSave = () => {
    triggerHaptic('success');
    onSave(options);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/[0.08] p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base leading-tight">Conversion Settings</h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px] sm:max-w-xs">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5">
          {/* IMAGE SETTINGS */}
          {file.category === 'images' && options.image && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <ImageIcon className="w-4 h-4" />
                <span>Image Transformation Controls</span>
              </div>

              {/* Quality Slider */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-800">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="font-medium text-slate-300">Export Quality</span>
                  <span className="font-mono text-indigo-400 font-semibold">{Math.round(options.image.quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={options.image.quality}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      image: { ...options.image!, quality: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Smaller File (Low)</span>
                  <span>Balanced</span>
                  <span>Maximum Fidelity</span>
                </div>
              </div>

              {/* Rotation & Flip */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    const nextRot = ((options.image!.rotation + 90) % 360) as 0 | 90 | 180 | 270;
                    setOptions({ ...options, image: { ...options.image!, rotation: nextRot } });
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 transition text-xs font-medium"
                >
                  <RotateCw className="w-4 h-4 text-cyan-400" />
                  <span>Rotate {options.image.rotation}°</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setOptions({
                      ...options,
                      image: { ...options.image!, flipH: !options.image!.flipH },
                    });
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition text-xs font-medium ${
                    options.image.flipH
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700/80 text-slate-300'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Flip Horizontal</span>
                </button>
              </div>

              {/* Background Color */}
              {(file.targetFormat === 'jpg' || file.targetFormat === 'jpeg') && (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="block text-xs font-medium text-slate-300 mb-2">
                    Background Color (replaces transparency):
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={options.image.backgroundColor || '#ffffff'}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          image: { ...options.image!, backgroundColor: e.target.value },
                        })
                      }
                      className="w-10 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-400">{options.image.backgroundColor}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUDIO SETTINGS */}
          {file.category === 'audio' && options.audio && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <Volume2 className="w-4 h-4" />
                <span>Audio Encoding Profiles</span>
              </div>

              {/* Bitrate Selector */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-800">
                <label className="block text-xs font-medium text-slate-300 mb-2">MP3 / Audio Bitrate</label>
                <div className="grid grid-cols-4 gap-2">
                  {[128, 192, 256, 320].map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setOptions({ ...options, audio: { ...options.audio!, bitrate: br as any } });
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        options.audio!.bitrate === br
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {br} kbps
                    </button>
                  ))}
                </div>
              </div>

              {/* Channels (Stereo / Mono) */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-800">
                <label className="block text-xs font-medium text-slate-300 mb-2">Channels</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setOptions({ ...options, audio: { ...options.audio!, channels: 2 } });
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      options.audio.channels === 2
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Stereo (2 Channels)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setOptions({ ...options, audio: { ...options.audio!, channels: 1 } });
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      options.audio.channels === 1
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Mono (1 Channel)
                  </button>
                </div>
              </div>

              {/* Normalize Volume */}
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-slate-200">Volume Peak Normalization</span>
                  <p className="text-xs text-slate-400">Boosts quiet audio without distortion or clipping</p>
                </div>
                <input
                  type="checkbox"
                  checked={options.audio.normalizeVolume}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      audio: { ...options.audio!, normalizeVolume: e.target.checked },
                    })
                  }
                  className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* DOCUMENT SETTINGS */}
          {file.category === 'documents' && options.document && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                <FileText className="w-4 h-4" />
                <span>Document & E-Book Layout</span>
              </div>

              <div className="space-y-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Document Title</label>
                  <input
                    type="text"
                    value={options.document.title || ''}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        document: { ...options.document!, title: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Author / Metadata</label>
                  <input
                    type="text"
                    value={options.document.author || ''}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        document: { ...options.document!, author: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Page Format</label>
                    <select
                      value={options.document.pageSize}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          document: { ...options.document!, pageSize: e.target.value as any },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="Letter">US Letter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Base Font Size</label>
                    <select
                      value={options.document.fontSize}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          document: { ...options.document!, fontSize: parseInt(e.target.value, 10) as any },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value={10}>10 pt (Compact)</option>
                      <option value={12}>12 pt (Standard)</option>
                      <option value={14}>14 pt (Large)</option>
                      <option value={16}>16 pt (Reading)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Layout Mode</label>
                    <select
                      value={options.document.layoutMode || 'auto'}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          document: { ...options.document!, layoutMode: e.target.value as any },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-purple-950/40 border border-purple-500/40 text-sm text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                    >
                      <option value="auto">Auto Detect</option>
                      <option value="poetry">Poetry (Verses & Couplets)</option>
                      <option value="prose">Prose (Paragraphs)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-indigo-300 mb-1">Language / Script</label>
                    <select
                      value={options.document.language || 'auto'}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          document: { ...options.document!, language: e.target.value as any },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-sm text-white focus:outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      <option value="auto">Auto Detect</option>
                      <option value="hi">Hindi (हिन्दी / देवनागरी)</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                {/* Hindi & English OCR Controls for Scanned / Image PDF */}
                <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-950/30 via-purple-950/30 to-indigo-950/30 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                      <span>⚡</span> Hindi & English OCR
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold">
                      For Scanned & Image PDFs
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Extracts Devanagari Hindi and English text directly from image-based or scanned PDFs into EPUB.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">OCR Trigger</label>
                      <select
                        value={options.document.ocrMode || 'auto'}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            document: { ...options.document!, ocrMode: e.target.value as any },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="auto">Auto (If Scanned / Image)</option>
                        <option value="always">Always Run OCR</option>
                        <option value="off">Off (Digital Only)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">OCR Languages</label>
                      <select
                        value={options.document.ocrLanguage || 'hin+eng'}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            document: { ...options.document!, ocrLanguage: e.target.value as any },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="hin+eng">Hindi + English (Bilingual)</option>
                        <option value="hin">Hindi Only (हिन्दी)</option>
                        <option value="eng">English Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2.5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
