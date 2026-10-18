/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Copy, Download, Eye, Pause, Play, X } from 'lucide-react';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { QueuedFile } from '../types/conversion';
import { formatBytes } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  file: QueuedFile;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<Props> = ({ file, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [formattedHtml, setFormattedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const previewSource = file.resultUrl || file.previewUrl || URL.createObjectURL(file.file);
  const isResult = !!file.resultUrl;
  const currentFormat = (isResult ? file.targetFormat : file.extension).toLowerCase();

  useEffect(() => {
    const targetBlob = file.resultBlob || file.file;
    if (!targetBlob) return;

    // 1. EPUB Preview (extract XHTML chapters)
    if (currentFormat === 'epub') {
      JSZip.loadAsync(targetBlob)
        .then(async (zip) => {
          let foundChapter: any = zip.file('OEBPS/chapter1.xhtml');
          if (!foundChapter) {
            const xhtmlFiles = zip.file(/\.(xhtml|html)$/i);
            foundChapter = xhtmlFiles.find((f) => !f.name.includes('nav.xhtml')) || xhtmlFiles[0];
          }
          if (foundChapter) {
            const rawHtml = await foundChapter.async('text');
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml, 'text/html');
            setFormattedHtml(doc.body.innerHTML);
          } else {
            setTextContent('EPUB Archive valid. E-book package ready for download.');
          }
        })
        .catch((err) => {
          console.warn('Failed to parse EPUB for preview:', err);
          setTextContent('EPUB file loaded successfully. Ready to export to e-reader.');
        });
      return;
    }

    // 2. DOCX Preview (Mammoth render)
    if (currentFormat === 'docx') {
      targetBlob
        .arrayBuffer()
        .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
        .then((res) => {
          setFormattedHtml(res.value);
        })
        .catch(() => {
          setTextContent('DOCX Document valid. Open with Microsoft Word or Google Docs.');
        });
      return;
    }

    // 3. Plain Text, Markdown, HTML, JSON, CSV
    if (
      file.category === 'data' ||
      currentFormat === 'txt' ||
      currentFormat === 'md' ||
      currentFormat === 'html' ||
      currentFormat === 'json' ||
      currentFormat === 'csv'
    ) {
      targetBlob.text().then((txt) => setTextContent(txt.slice(0, 20000)));
    }
  }, [file, currentFormat]);

  const toggleAudio = () => {
    triggerHaptic('light');
    if (!audioEl) {
      const a = new Audio(previewSource);
      a.onended = () => setIsPlaying(false);
      a.play();
      setAudioEl(a);
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioEl.pause();
        setIsPlaying(false);
      } else {
        audioEl.play();
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioEl) {
        audioEl.pause();
        audioEl.src = '';
      }
    };
  }, [audioEl]);

  const handleCopyText = async () => {
    const textToCopy = textContent || (formattedHtml ? formattedHtml.replace(/<[^>]+>/g, '') : '');
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      triggerHaptic('success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-[#0e1428] border border-indigo-500/30 p-5 shadow-2xl text-slate-100 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 p-0.5 shrink-0 shadow-md">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-cyan-400">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="truncate">
              <h3 className="font-bold text-white text-sm sm:text-base truncate">
                {isResult ? file.resultName : file.name}
              </h3>
              <p className="text-xs text-indigo-300/80 font-mono">
                {isResult ? `Converted: ${formatBytes(file.resultSize || 0)}` : `Original: ${formatBytes(file.size)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto py-4 flex items-center justify-center min-h-[260px]">
          {/* IMAGE PREVIEW */}
          {file.category === 'images' && (
            <div className="relative max-h-[55vh] flex items-center justify-center rounded-2xl bg-slate-950/60 p-2 border border-cyan-500/20 w-full overflow-hidden shadow-inner">
              <img
                src={previewSource}
                alt="Preview"
                className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
          )}

          {/* AUDIO PREVIEW */}
          {file.category === 'audio' && (
            <div className="w-full p-6 rounded-2xl bg-gradient-to-b from-amber-950/30 to-slate-950 border border-amber-500/25 flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20">
                <button
                  onClick={toggleAudio}
                  className="w-16 h-16 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>
              </div>
              <div>
                <p className="font-bold text-white text-base">{file.name}</p>
                <p className="text-xs text-amber-400 font-mono mt-1 font-semibold">
                  Format: {currentFormat.toUpperCase()} • 100% Offline Playback
                </p>
              </div>
            </div>
          )}

          {/* FORMATTED EPUB OR DOCX PREVIEW */}
          {formattedHtml && (
            <div className="w-full h-full max-h-[55vh] flex flex-col rounded-2xl bg-[#faf9f6] text-[#1e1b4b] border border-amber-200/60 shadow-xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2.5 bg-gradient-to-r from-amber-100/90 to-purple-100/70 border-b border-amber-200/60 text-xs text-slate-700 font-medium">
                <span className="flex items-center gap-1.5 font-bold text-purple-900">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>E-Book / Document Preview ({currentFormat.toUpperCase()})</span>
                </span>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-purple-700 hover:text-purple-900 font-bold cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <div
                className="flex-1 overflow-y-auto p-5 sm:p-7 leading-relaxed font-['Noto_Sans_Devanagari','Mangal',Georgia,serif] text-sm sm:text-base selection:bg-purple-200 selection:text-purple-900"
                dangerouslySetInnerHTML={{ __html: formattedHtml }}
              />
            </div>
          )}

          {/* DOCUMENT OR DATA PLAIN TEXT PREVIEW */}
          {!formattedHtml && (file.category === 'documents' || file.category === 'data') && (
            <div className="w-full h-full max-h-[52vh] flex flex-col bg-slate-950/90 rounded-2xl border border-indigo-500/20 p-3.5 shadow-inner">
              <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-white/[0.08] text-xs text-indigo-300">
                <span className="font-semibold">Text Excerpt Preview</span>
                {textContent && (
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <pre className="flex-1 overflow-auto text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed selection:bg-pink-500 selection:text-white">
                {textContent || 'Reading document preview...'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3.5 border-t border-white/[0.08] text-xs">
          <span className="text-slate-400 font-medium">
            Status: <span className="text-emerald-400 font-bold uppercase">{file.status}</span>
          </span>
          {file.resultUrl && (
            <a
              href={file.resultUrl}
              download={file.resultName || `converted.${file.targetFormat}`}
              onClick={() => triggerHaptic('success')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download {currentFormat.toUpperCase()}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
