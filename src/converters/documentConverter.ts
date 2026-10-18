/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Polyfills for browser compatibility
if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function (fn: any, ...args: any[]) {
    return new Promise((resolve) => resolve(fn(...args)));
  };
}
if (typeof (Promise as any).withResolvers !== 'function') {
  (Promise as any).withResolvers = function () {
    let resolve: any, reject: any;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { extractTextFromPdfWithOcr } from '../services/ocrService';
import { DocumentFormat, DocumentOptions } from '../types/conversion';
import { cleanDevanagariText } from '../utils/devanagariUtils';
export { cleanDevanagariText };

// Configure pdfjs worker to use local offline worker asset
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface TextPositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Reconstructs visual lines and detects stanza/paragraph breaks from positioned PDF text items
 */
function processPageItemsToLines(rawItems: any[]): string[] {
  const items: TextPositionedItem[] = rawItems
    .filter((it: any) => it.str && it.str.length > 0)
    .map((it: any) => ({
      str: it.str,
      x: it.transform ? it.transform[4] : 0,
      y: it.transform ? it.transform[5] : 0,
      width: it.width || 0,
      height: it.height || 14,
    }));

  if (items.length === 0) return [];

  // Group items on the same vertical baseline (tolerance: 5.5pt)
  const lineTolerance = 5.5;
  const lineBuckets: { y: number; items: TextPositionedItem[] }[] = [];

  for (const item of items) {
    let bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) <= lineTolerance);
    if (!bucket) {
      bucket = { y: item.y, items: [] };
      lineBuckets.push(bucket);
    }
    bucket.items.push(item);
  }

  // Sort lines from top to bottom (descending y in PDF coordinates)
  lineBuckets.sort((a, b) => b.y - a.y);

  const linesWithMeta: { y: number; text: string }[] = [];

  for (const bucket of lineBuckets) {
    bucket.items.sort((a, b) => a.x - b.x);

    let lineText = '';
    for (let i = 0; i < bucket.items.length; i++) {
      const cur = bucket.items[i];
      if (i > 0) {
        const prev = bucket.items[i - 1];
        const gap = cur.x - (prev.x + prev.width);
        const isCombiningMark = /^[\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962-\u0963\u094D\u093C]/.test(cur.str);
        const isPrevCombining = /[\u094D\u093C]$/.test(lineText);
        const minGap = Math.max(3.8, (cur.height || 14) * 0.22);

        if (gap > minGap && !isCombiningMark && !isPrevCombining && !lineText.endsWith(' ') && !cur.str.startsWith(' ')) {
          lineText += ' ';
        }
      }
      lineText += cur.str;
    }

    const cleaned = cleanDevanagariText(lineText.trim());
    if (cleaned.length > 0) {
      linesWithMeta.push({ y: bucket.y, text: cleaned });
    }
  }

  if (linesWithMeta.length === 0) return [];

  // Calculate median line gap to detect stanza breaks accurately
  const gaps: number[] = [];
  for (let i = 1; i < linesWithMeta.length; i++) {
    const diff = linesWithMeta[i - 1].y - linesWithMeta[i].y;
    if (diff > 6 && diff < 90) {
      gaps.push(diff);
    }
  }
  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 18;
  const stanzaGapThreshold = Math.max(24, medianGap * 1.3);

  const resultLines: string[] = [];
  for (let i = 0; i < linesWithMeta.length; i++) {
    if (i > 0) {
      const prevY = linesWithMeta[i - 1].y;
      const currY = linesWithMeta[i].y;
      const verticalDistance = prevY - currY;

      // Vertical distance significantly larger than regular line spacing => Stanza Break!
      if (verticalDistance >= stanzaGapThreshold) {
        resultLines.push('');
      }
    }
    resultLines.push(linesWithMeta[i].text);
  }

  return resultLines;
}

/**
 * Fallback to extract readable text directly from PDF binary stream with linebreaks
 */
function extractFallbackTextFromPdfBytes(bytes: Uint8Array): string {
  try {
    const latin = new TextDecoder('latin1').decode(bytes);
    const lines: string[] = [];

    const btEtRegex = /BT[\s\S]*?ET/g;
    let match;
    while ((match = btEtRegex.exec(latin)) !== null) {
      const block = match[0];
      const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
      let tjMatch;
      let blockText = '';
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const unescaped = tjMatch[1]
          .replace(/\\([()\\])/g, '$1')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t');
        blockText += unescaped + ' ';
      }
      if (blockText.trim()) {
        lines.push(blockText.trim());
      }
    }

    if (lines.length > 0) {
      return cleanDevanagariText(lines.join('\n'));
    }
  } catch {
    // Ignore fallback extraction failure
  }
  return '';
}

/**
 * Extract plain text from PDF file preserving exact verse lines and stanzas
 */
/**
 * Extract plain text from PDF file preserving exact verse lines and stanzas
 * If PDF contains scanned/image pages without text, runs Hindi & English OCR
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (pct: number, status?: string) => void,
  docOptions?: DocumentOptions
): Promise<{ title: string; text: string; pages: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Data = new Uint8Array(arrayBuffer);
  let title = docOptions?.title || file.name.replace(/\.[^/.]+$/, '');
  const pagesText: string[] = [];

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Data,
      useSystemFonts: true,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/',
    });
    const pdf = await loadingTask.promise;

    // Check if embedded metadata has lossless source text (e.g. from OmniConvert or standard PDF generators)
    try {
      const metadata = await pdf.getMetadata();
      const info = metadata?.info as any;
      if (info?.Title && typeof info.Title === 'string' && info.Title.trim().length > 0) {
        title = info.Title.trim();
      }
      const candidateText = info?.Subject || info?.subject || info?.Description || info?.description;
      if (candidateText && typeof candidateText === 'string') {
        let decoded = candidateText;
        if (candidateText.includes('%')) {
          try {
            decoded = decodeURIComponent(candidateText);
          } catch {
            decoded = candidateText;
          }
        }
        if (decoded && decoded.trim().length > 15 && decoded.includes('\n')) {
          const cleanText = cleanDevanagariText(decoded.trim());
          return {
            title,
            text: cleanText,
            pages: [cleanText],
          };
        }
      }
    } catch {
      // Continue to page extraction
    }

    const numPages = pdf.numPages;

    // If user has not forced OCR 'always', attempt digital text extraction first
    if (docOptions?.ocrMode !== 'always') {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageLines = processPageItemsToLines(textContent.items);
        const pageFormatted = pageLines.join('\n');
        if (pageFormatted.trim()) {
          pagesText.push(pageFormatted);
        }
        onProgress?.(Math.round((i / numPages) * 35), `Reading PDF page ${i}/${numPages}...`);
      }
    }

    const fullText = pagesText.join('\n\n').trim();
    const nonWhitespaceCharCount = fullText.replace(/\s+/g, '').length;

    // Detect if this PDF is an image / scanned document (negligible text items)
    const isImagePdf =
      docOptions?.ocrMode === 'always' ||
      (docOptions?.ocrMode !== 'off' && nonWhitespaceCharCount < Math.max(15, numPages * 8));

    if (isImagePdf) {
      onProgress?.(38, 'Scanned/image PDF detected. Initializing Hindi & English OCR...');
      try {
        const ocrLang = docOptions?.ocrLanguage || 'hin+eng';
        const ocrResult = await extractTextFromPdfWithOcr(pdf, ocrLang, (pct, status) => {
          onProgress?.(38 + Math.round(pct * 0.58), status);
        });

        if (ocrResult.text.trim().length > 0) {
          return {
            title,
            text: ocrResult.text,
            pages: ocrResult.pages,
          };
        }
      } catch (ocrErr) {
        console.warn('OCR processing encountered error, attempting fallback:', ocrErr);
      }
    }

    if (fullText.length > 0) {
      return { title, text: fullText, pages: pagesText };
    }
  } catch (err) {
    console.warn('pdfjs extraction failed or timed out, trying fallback stream extractor:', err);
  }

  // Fallback direct parser
  const fallbackText = extractFallbackTextFromPdfBytes(uint8Data);
  const resolvedText =
    fallbackText.length > 0
      ? fallbackText
      : `Document: ${title}\n\nProcessed via OmniConvert.`;

  return { title, text: resolvedText, pages: [resolvedText] };
}

/**
 * Extract text from DOCX file using Mammoth
 */
export async function extractFromDocx(file: File): Promise<{ text: string; html: string }> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const resultText = await mammoth.extractRawText({ arrayBuffer });
    const resultHtml = await mammoth.convertToHtml({ arrayBuffer });
    return { text: cleanDevanagariText(resultText.value || ''), html: resultHtml.value || '' };
  } catch (err) {
    console.warn('Mammoth extraction warning:', err);
    return { text: file.name.replace(/\.[^/.]+$/, ''), html: '' };
  }
}

/**
 * Extract text and chapters from an EPUB file using JSZip
 */
export async function extractFromEpub(file: File): Promise<{ title: string; text: string; html: string }> {
  const zip = await JSZip.loadAsync(file);
  let title = file.name.replace(/\.[^/.]+$/, '');
  let fullHtml = '';
  let fullText = '';

  const htmlFiles: string[] = [];
  zip.forEach((relativePath) => {
    if (/\.(xhtml|html|htm)$/i.test(relativePath) && !relativePath.includes('nav.xhtml')) {
      htmlFiles.push(relativePath);
    }
  });

  htmlFiles.sort();

  for (const path of htmlFiles) {
    const content = await zip.file(path)?.async('text');
    if (content) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const bodyText = doc.body.textContent || '';
      fullText += bodyText + '\n\n';
      fullHtml += doc.body.innerHTML + '<hr/>';

      if (!title || title === file.name.replace(/\.[^/.]+$/, '')) {
        const titleTag = doc.querySelector('title, h1');
        if (titleTag && titleTag.textContent) {
          title = titleTag.textContent.trim();
        }
      }
    }
  }

  return { title, text: cleanDevanagariText(fullText.trim()), html: fullHtml };
}

/**
 * Detects if a text document is poetry (short rhythmic verse lines, stanzas, or couplets)
 */
export function isPoetry(text: string, options?: DocumentOptions): boolean {
  if (options?.layoutMode === 'poetry') return true;
  if (options?.layoutMode === 'prose') return false;

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length < 2) return false;

  // 1. Check for Hindi / Sanskrit poetry danda markers ('।' or '॥')
  const dandaCount = (text.match(/[।॥]/g) || []).length;
  if (dandaCount >= 2 && rawLines.length >= 3) {
    return true;
  }

  // 2. Stanza breaks exist and lines are typical verse lengths
  const hasStanzas = /\n\s*\n/.test(text);
  const totalLength = rawLines.reduce((acc, l) => acc + l.length, 0);
  const avgLength = totalLength / rawLines.length;

  if (hasStanzas && avgLength < 110) {
    return true;
  }

  // 3. Short rhythmic lines typical of poems / couplets / ghazals
  if (avgLength < 80 && rawLines.length >= 4) {
    return true;
  }

  // 4. Couplet structure (even number of lines with uniform length)
  if (rawLines.length >= 4 && avgLength < 95) {
    return true;
  }

  // 5. Hindi / Indic verse structure: Hindi text with line lengths typical of verse
  const isHindi = /[\u0900-\u097F]/.test(text);
  if (isHindi && rawLines.length >= 2 && avgLength < 95) {
    return true;
  }

  return false;
}

/**
 * Formats poem lines into stanzas even if extracted without empty lines
 */
function organizePoemStanzas(text: string): string[][] {
  const rawStanzas = text.split(/\n\s*\n/).filter((s) => s.trim().length > 0);

  if (rawStanzas.length > 1) {
    return rawStanzas.map((s) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  }

  // If text came in as one continuous block without blank lines, chunk into couplets (2 lines per stanza)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const grouped: string[][] = [];

  // Exclude title if first line
  let startIndex = 0;
  if (lines.length > 3 && lines[0].length < 60 && !lines[0].includes('।') && !lines[0].includes(',')) {
    grouped.push([lines[0]]);
    startIndex = 1;
  }

  let currentChunk: string[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const isAuthor = /^[-—~]/.test(line);

    if (isAuthor) {
      if (currentChunk.length > 0) {
        grouped.push(currentChunk);
        currentChunk = [];
      }
      grouped.push([line]);
      continue;
    }

    currentChunk.push(line);
    // Typical Hindi poem couplet has 2 lines per stanza
    if (currentChunk.length === 2) {
      grouped.push(currentChunk);
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    grouped.push(currentChunk);
  }

  return grouped;
}

/**
 * Generate a Microsoft Word DOCX file with poetry layout preservation
 */
export async function createDocxFromText(
  title: string,
  text: string,
  options?: DocumentOptions
): Promise<Blob> {
  const safeText = text && text.trim().length > 0 ? text : `Document: ${title}\nGenerated with OmniConvert.`;
  const isPoemDoc = isPoetry(safeText, options);

  const docParagraphs: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: isPoemDoc ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 360 },
    }),
  ];

  if (isPoemDoc) {
    const stanzas = organizePoemStanzas(safeText);

    for (let sIdx = 0; sIdx < stanzas.length; sIdx++) {
      const lines = stanzas[sIdx];
      if (lines.length === 0) continue;

      // Check if this stanza is an author attribution
      const isAuthorStanza = lines.length === 1 && (/^[-—~]/.test(lines[0]) || lines[0].toLowerCase().includes('author'));

      if (isAuthorStanza) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: lines[0],
                italics: true,
                bold: true,
                size: 24, // 12pt
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 140 },
          })
        );
        continue;
      }

      // Check if first line is a duplicate of title
      if (sIdx === 0 && lines.length === 1 && lines[0].trim().toLowerCase() === title.trim().toLowerCase()) {
        continue;
      }

      // Emit stanza lines
      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        const line = lines[lIdx];
        const isLastInStanza = lIdx === lines.length - 1;

        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24, // 12pt
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: {
              line: 276, // 1.15 line spacing
              after: isLastInStanza ? 220 : 60, // Extra spacing at end of stanza
            },
          })
        );
      }
    }
  } else {
    // Prose document
    const paragraphs = safeText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const p of paragraphs) {
      if (p.length < 80 && (p.startsWith('#') || /^(chapter|section|part)\s+\d+/i.test(p))) {
        docParagraphs.push(
          new Paragraph({
            text: p.replace(/^#+\s*/, ''),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );
      } else {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: p,
                size: 24,
              }),
            ],
            spacing: { line: 276, after: 140 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generate a valid EPUB 3.0 file with dedicated poetry styling and full Hindi Devanagari support
 */
export async function createEpub(
  title: string,
  content: string,
  author = 'OmniConvert User',
  options?: DocumentOptions
): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype (Must be first and uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const safeTitle = (title || 'Book').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bookId = 'omni-epub-' + Date.now();
  const safeContent = content && content.trim().length > 0 ? content : `Book: ${safeTitle}\nConverted via OmniConvert.`;

  // Detect Hindi / Devanagari Unicode characters (U+0900 to U+097F)
  const isHindi = /[\u0900-\u097F]/.test(safeContent);
  const langCode = options?.language && options.language !== 'auto' ? options.language : isHindi ? 'hi' : 'en';

  const isPoemDoc = isPoetry(safeContent, options);
  let resolvedAuthor = author;

  // Extract author if present at bottom (e.g. "- आफताब अहमद" or "— आफताब अहमद")
  const linesAll = safeContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lastLine = linesAll[linesAll.length - 1] || '';
  if (/^[-—~]/.test(lastLine)) {
    resolvedAuthor = lastLine.replace(/^[-—~]\s*/, '');
  }
  const safeAuthor = resolvedAuthor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // HTML Body Generation
  let bodyHtml = '';

  if (isPoemDoc) {
    const stanzas = organizePoemStanzas(safeContent);
    const htmlBlocks: string[] = [];

    for (let i = 0; i < stanzas.length; i++) {
      const lines = stanzas[i];
      if (lines.length === 0) continue;

      // Check if first block is just the title
      if (i === 0 && lines.length === 1 && lines[0].length < 60) {
        htmlBlocks.push(`<h1 class="poem-title">${lines[0].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>\n<div class="poem-divider"><span>❦</span></div>`);
        continue;
      }

      // Check if last stanza is author attribution
      if (i === stanzas.length - 1 && lines.length === 1 && /^[-—~]/.test(lines[0])) {
        htmlBlocks.push(`<p class="poem-author">${lines[0].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`);
        continue;
      }

      // Standard poem stanza
      const verseLines = lines
        .map((l) => `<p class="verse">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
        .join('\n      ');

      htmlBlocks.push(`<div class="stanza">\n      ${verseLines}\n    </div>`);
    }

    bodyHtml = `<div class="poem-container">\n    ${htmlBlocks.join('\n\n    ')}\n  </div>`;
  } else {
    // Standard Prose Document
    const paragraphs = safeContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((p) => `<p class="prose-p">${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
      .join('\n');

    bodyHtml = `<div class="prose-container">\n<h1>${safeTitle}</h1>\n${paragraphs}\n</div>`;
  }

  // 3. OEBPS/style.css with Devanagari font support & poetry layout
  const css = `
@charset "utf-8";
@page {
  margin: 1.5cm 1.2cm;
}

body {
  font-family: "Noto Sans Devanagari", "Mangal", "Nirmala UI", "Kohinoor Devanagari", "Devanagari Sangam MN", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif;
  margin: 0;
  padding: 2.5rem 1.8rem;
  line-height: 1.85;
  color: #1f2937;
  background-color: #fafaf9;
}

/* Typography for Poetry */
.poem-container {
  max-width: 680px;
  margin: 0 auto;
  text-align: center;
}

.poem-title {
  text-align: center;
  font-size: 2.1em;
  font-weight: 800;
  margin-top: 0.5em;
  margin-bottom: 0.3em;
  color: #1e1b4b;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.poem-divider {
  text-align: center;
  font-size: 1.3em;
  color: #6366f1;
  margin-bottom: 2.2em;
  opacity: 0.85;
}

.stanza {
  margin-bottom: 2.2em;
  page-break-inside: avoid;
  break-inside: avoid;
  text-align: center;
}

.verse {
  margin: 0.35em 0;
  padding: 0;
  font-size: 1.25em;
  line-height: 1.9;
  color: #1e1b4b;
  text-indent: 0 !important;
  word-break: break-word;
}

.poem-author {
  text-align: right;
  font-size: 1.2em;
  font-weight: 700;
  font-style: italic;
  color: #4338ca;
  margin-top: 3.5em;
  margin-bottom: 2em;
  padding-top: 1.2em;
  border-top: 1.5px dashed #cbd5e1;
}

/* Prose Styles */
.prose-container {
  max-width: 740px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  font-size: 1.8em;
  margin-bottom: 1.5em;
  color: #0f172a;
}

.prose-p {
  margin-bottom: 1.2em;
  text-align: justify;
  text-indent: 1.5em;
}
`;
  zip.file('OEBPS/style.css', css);

  // 4. OEBPS/chapter1.xhtml
  const chapter1Xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${langCode}" lang="${langCode}">
<head>
  <meta charset="utf-8"/>
  <title>${safeTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
  zip.file('OEBPS/chapter1.xhtml', chapter1Xhtml);

  // 5. OEBPS/toc.ncx (EPUB 2 backward compatibility)
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${safeTitle}</text>
  </docTitle>
  <docAuthor>
    <text>${safeAuthor}</text>
  </docAuthor>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel>
        <text>${safeTitle}</text>
      </navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', tocNcx);

  // 6. OEBPS/nav.xhtml (EPUB 3 navigation)
  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${langCode}" lang="${langCode}">
<head>
  <meta charset="utf-8"/>
  <title>${safeTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${safeTitle}</h1>
    <ol>
      <li><a href="chapter1.xhtml">${safeTitle}</a></li>
    </ol>
  </nav>
</body>
</html>`;
  zip.file('OEBPS/nav.xhtml', navXhtml);

  // 7. OEBPS/content.opf
  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:language>${langCode}</dc:language>
    <dc:creator>${safeAuthor}</dc:creator>
    <dc:publisher>OmniConvert</dc:publisher>
    <meta property="dcterms:modified">${new Date().toISOString().slice(0, 19)}Z</meta>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css" />
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml" />
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1" />
  </spine>
</package>`;
  zip.file('OEBPS/content.opf', contentOpf);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

/**
 * Generate a PDF document from plain text or markdown with embedded Subject metadata for lossless conversion
 */
export async function createPdfFromText(
  title: string,
  text: string,
  options: DocumentOptions = { fontSize: 12, pageSize: 'A4' }
): Promise<Blob> {
  const safeText = text && text.trim().length > 0 ? text : `Document: ${title}\nConverted via OmniConvert.`;
  const isHindi = /[\u0900-\u097F]/.test(safeText);

  // If Hindi/Devanagari text, render via high-resolution canvas with embedded Subject metadata
  if (isHindi && typeof document !== 'undefined') {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(title);
    pdfDoc.setAuthor(options.author || 'OmniConvert User');
    pdfDoc.setSubject(encodeURIComponent(safeText));

    const pageWidth = options.pageSize === 'A4' ? 595.28 : 612.0;
    const pageHeight = options.pageSize === 'A4' ? 841.89 : 792.0;

    // Render pages onto 2x canvas
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = pageWidth * scale;
    canvas.height = pageHeight * scale;
    const ctx = canvas.getContext('2d')!;

    const lines = safeText.split(/\r?\n/);
    const linesPerPage = 32;
    const totalPages = Math.ceil(lines.length / linesPerPage);

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 28px "Noto Sans Devanagari", "Mangal", "Nirmala UI", sans-serif';

      let y = 80;
      if (pageIdx === 0) {
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, y);
        y += 60;
      }

      ctx.textAlign = 'left';
      ctx.font = '22px "Noto Sans Devanagari", "Mangal", "Nirmala UI", sans-serif';

      const pageStart = pageIdx * linesPerPage;
      const pageEnd = Math.min(lines.length, (pageIdx + 1) * linesPerPage);

      for (let l = pageStart; l < pageEnd; l++) {
        const line = lines[l];
        if (line.trim()) {
          ctx.fillText(line, 100, y);
        }
        y += 38;
      }

      const jpegBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95));
      const jpegBytes = await jpegBlob.arrayBuffer();
      const pdfImage = await pdfDoc.embedJpg(jpegBytes);

      const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pdfPage.drawImage(pdfImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
  }

  // Standard Latin PDF generation using Helvetica
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);
  pdfDoc.setAuthor(options.author || 'OmniConvert User');
  pdfDoc.setSubject(encodeURIComponent(safeText));

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = options.pageSize === 'A4' ? 595.28 : 612.0;
  const pageHeight = options.pageSize === 'A4' ? 841.89 : 792.0;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const fontSize = options.fontSize || 12;
  const lineHeight = fontSize * 1.45;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  currentPage.drawText(title || 'Document', {
    x: margin,
    y: y,
    size: fontSize + 6,
    font: boldFont,
    color: rgb(0.1, 0.12, 0.18),
  });
  y -= (fontSize + 6) * 1.8;

  function wrapText(str: string, maxW: number, customFont = font, size: number = fontSize): string[] {
    const words = str.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = customFont.widthOfTextAtSize(testLine, size);
      if (width <= maxW) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  const paragraphs = safeText
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  for (const para of paragraphs) {
    const isHeading = para.length < 80 && (para.startsWith('#') || /^(chapter|section)\s+\d+/i.test(para));
    const cleanPara = para.replace(/^#+\s*/, '');
    const currentParaFont = isHeading ? boldFont : font;
    const currentParaSize = isHeading ? fontSize + 2 : fontSize;
    const currentLineHeight = currentParaSize * 1.45;

    const lines = wrapText(cleanPara, contentWidth, currentParaFont, currentParaSize);

    for (const line of lines) {
      if (y - currentLineHeight < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      currentPage.drawText(line, {
        x: margin,
        y: y,
        size: currentParaSize,
        font: currentParaFont,
        color: isHeading ? rgb(0.1, 0.12, 0.2) : rgb(0.15, 0.17, 0.23),
      });

      y -= currentLineHeight;
    }

    y -= lineHeight * 0.4;
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

/**
 * Universal Document Converter Orchestrator
 */
export async function convertDocument(
  file: File,
  targetFormat: DocumentFormat,
  options: DocumentOptions = { fontSize: 12, pageSize: 'A4' },
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const currentExt = file.name.split('.').pop()?.toLowerCase() || '';
  const title = options.title || file.name.replace(/\.[^/.]+$/, '');

  onProgress?.(15);
  let rawText = '';
  let rawHtml = '';

  // 1. Ingest input file format
  if (currentExt === 'pdf') {
    const extracted = await extractTextFromPdf(file, (p) => onProgress?.(15 + p * 0.45), options);
    rawText = extracted.text;
  } else if (currentExt === 'docx') {
    const extracted = await extractFromDocx(file);
    rawText = extracted.text;
    rawHtml = extracted.html;
  } else if (currentExt === 'epub') {
    const extracted = await extractFromEpub(file);
    rawText = extracted.text;
    rawHtml = extracted.html;
  } else {
    rawText = await file.text();
    if (currentExt === 'html') rawHtml = rawText;
  }

  onProgress?.(60);

  return exportTextToDocumentFormat(title, rawText, targetFormat, options, onProgress, rawHtml);
}

/**
 * Exports arbitrary text into target document format (EPUB, DOCX, PDF, etc.)
 */
export async function exportTextToDocumentFormat(
  title: string,
  rawText: string,
  targetFormat: DocumentFormat,
  options: DocumentOptions = { fontSize: 12, pageSize: 'A4' },
  onProgress?: (pct: number) => void,
  rawHtml?: string
): Promise<Blob> {
  const resolvedText =
    !rawText || rawText.trim().length === 0
      ? `Document: ${title}\n\nConverted using OmniConvert.`
      : rawText;

  // 2. Export to target format
  if (targetFormat === 'docx') {
    const blob = await createDocxFromText(title, resolvedText, options);
    onProgress?.(100);
    return blob;
  }

  if (targetFormat === 'epub') {
    const blob = await createEpub(title, resolvedText, options.author, options);
    onProgress?.(100);
    return blob;
  }

  if (targetFormat === 'pdf') {
    const blob = await createPdfFromText(title, resolvedText, options);
    onProgress?.(100);
    return blob;
  }

  if (targetFormat === 'txt') {
    onProgress?.(100);
    return new Blob([resolvedText], { type: 'text/plain;charset=utf-8' });
  }

  if (targetFormat === 'md') {
    const md = `# ${title}\n\n${resolvedText}`;
    onProgress?.(100);
    return new Blob([md], { type: 'text/markdown;charset=utf-8' });
  }

  if (targetFormat === 'html') {
    const safeTitle = (title || 'Document').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const isPoemDoc = isPoetry(resolvedText, options);

    let bodyContent = '';
    if (isPoemDoc) {
      const stanzas = organizePoemStanzas(resolvedText);
      bodyContent = stanzas
        .map((lines) => {
          const inner = lines.map((l) => `<p style="margin:4px 0;line-height:1.8;">${l}</p>`).join('\n');
          return `<div style="margin-bottom:1.6em;">${inner}</div>`;
        })
        .join('\n');
    } else {
      bodyContent = rawHtml || resolvedText
        .split(/\r?\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => `<p style="margin-bottom:1em;">${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
        .join('\n');
    }

    const htmlDoc = `<!DOCTYPE html>
<html lang="${/[\u0900-\u097F]/.test(resolvedText) ? 'hi' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: "Noto Sans Devanagari", "Mangal", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #1e293b; background: #fafaf9; }
    h1 { color: #0f172a; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 1.5em; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  ${bodyContent}
</body>
</html>`;
    onProgress?.(100);
    return new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  }

  throw new Error(`Unsupported target document format: ${targetFormat}`);
}
