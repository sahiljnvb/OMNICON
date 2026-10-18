/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Removes spacing anomalies in Devanagari text caused by font positioning in PDFs or OCR noise
 * Uses horizontal whitespace [ \t]+ so vertical newlines (\n) are strictly preserved
 */
export function cleanDevanagariText(text: string): string {
  if (!text) return '';
  return text
    // Remove horizontal space between consonant/vowel and following matra/sign
    .replace(/([\u0900-\u097F])[ \t]+([\u093A-\u094F\u0962-\u0963\u0901-\u0903])/g, '$1$2')
    // Remove horizontal space after virama/halant before next consonant
    .replace(/([\u094D])[ \t]+([\u0900-\u097F])/g, '$1$2')
    // Remove horizontal space before or after nukta
    .replace(/([\u0900-\u097F])[ \t]+([\u093C])/g, '$1$2')
    .replace(/([\u093C])[ \t]+([\u0900-\u097F])/g, '$1$2')
    // Remove horizontal spaces within common broken Devanagari words
    .replace(/([क-ह])[ \t]+([ािीुूृेैोौ])/g, '$1$2')
    // Fix broken danda spacing (keep danda close to preceding word)
    .replace(/([^\s])[ \t]+([।॥])/g, '$1 $2')
    // Normalize multiple horizontal spaces to single space
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Detects whether a block of text is primarily Devanagari (Hindi, Sanskrit, Marathi, Nepali)
 */
export function isDevanagari(text: string): boolean {
  const devanagariMatches = text.match(/[\u0900-\u097F]/g);
  return devanagariMatches ? devanagariMatches.length > 5 : false;
}
