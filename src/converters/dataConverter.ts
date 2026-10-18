/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataFormat } from '../types/conversion';

/**
 * Parses CSV/TSV into array of objects
 */
function parseDelimited(text: string, delimiter = ','): any[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = parseLine(lines[0], delimiter);
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i], delimiter);
    if (values.length === 0) continue;
    const obj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      let val = values[idx] !== undefined ? values[idx] : '';
      if (!isNaN(Number(val)) && val.trim() !== '') {
        obj[header] = Number(val);
      } else if (val.toLowerCase() === 'true') {
        obj[header] = true;
      } else if (val.toLowerCase() === 'false') {
        obj[header] = false;
      } else {
        obj[header] = val;
      }
    });
    rows.push(obj);
  }
  return rows;
}

function parseLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  values.push(cur.trim());
  return values.map((v) => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
}

/**
 * Converts array of objects to CSV or TSV
 */
function arrayToDelimited(arr: any[], delimiter = ','): string {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const headers = Array.from(new Set(arr.flatMap((item) => Object.keys(item))));
  
  const escapeVal = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeVal).join(delimiter);
  const dataRows = arr.map((row) =>
    headers.map((key) => escapeVal(row[key])).join(delimiter)
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Converts array of objects to Markdown Table
 */
function arrayToMarkdownTable(arr: any[]): string {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const headers = Array.from(new Set(arr.flatMap((item) => Object.keys(item))));

  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = arr.map(
    (row) => `| ${headers.map((key) => String(row[key] ?? '')).join(' | ')} |`
  );

  return [headerRow, separatorRow, ...dataRows].join('\n');
}

/**
 * Converts JSON to XML
 */
function jsonToXml(data: any, rootTag = 'root'): string {
  function toXml(val: any, name: string): string {
    if (val === null || val === undefined) return `<${name}/>`;
    if (Array.isArray(val)) {
      return val.map((item) => toXml(item, 'item')).join('\n');
    }
    if (typeof val === 'object') {
      const children = Object.entries(val)
        .map(([k, v]) => toXml(v, k.replace(/[^a-zA-Z0-9_-]/g, '_')))
        .join('\n');
      return `<${name}>\n${children}\n</${name}>`;
    }
    const safeStr = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<${name}>${safeStr}</${name}>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${toXml(data, rootTag)}`;
}

/**
 * Simple JSON to YAML serializer
 */
function jsonToYaml(obj: any, indent = 0): string {
  const spaces = ' '.repeat(indent);
  if (obj === null || obj === undefined) return 'null\n';
  if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"\n`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return `${obj}\n`;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]\n';
    return obj
      .map((item) => `${spaces}- ${jsonToYaml(item, indent + 2).trimStart()}`)
      .join('');
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}\n';
    return keys
      .map((k) => {
        const val = obj[k];
        if (typeof val === 'object' && val !== null) {
          return `${spaces}${k}:\n${jsonToYaml(val, indent + 2)}`;
        }
        return `${spaces}${k}: ${jsonToYaml(val, indent).trimStart()}`;
      })
      .join('');
  }

  return `${spaces}${String(obj)}\n`;
}

export async function convertData(
  file: File,
  targetFormat: DataFormat,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  onProgress?.(20);
  const text = await file.text();
  const currentExt = file.name.split('.').pop()?.toLowerCase() || '';

  onProgress?.(40);
  let parsedJson: any;

  // 1. Ingest input format
  if (currentExt === 'json') {
    parsedJson = JSON.parse(text);
  } else if (currentExt === 'csv') {
    parsedJson = parseDelimited(text, ',');
  } else if (currentExt === 'tsv') {
    parsedJson = parseDelimited(text, '\t');
  } else if (currentExt === 'xml') {
    // Basic XML Parser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const root = xmlDoc.documentElement;

    function xmlNodeToJson(node: Element): any {
      const obj: Record<string, any> = {};
      const children = Array.from(node.children);
      if (children.length === 0) {
        return node.textContent || '';
      }
      for (const child of children) {
        const tag = child.tagName;
        const val = xmlNodeToJson(child);
        if (obj[tag]) {
          if (!Array.isArray(obj[tag])) obj[tag] = [obj[tag]];
          obj[tag].push(val);
        } else {
          obj[tag] = val;
        }
      }
      return obj;
    }
    parsedJson = xmlNodeToJson(root);
  } else {
    // Try parsing as JSON first, fallback CSV
    try {
      parsedJson = JSON.parse(text);
    } catch {
      parsedJson = parseDelimited(text, ',');
    }
  }

  onProgress?.(70);

  // 2. Export to target format
  if (targetFormat === 'json') {
    const formatted = JSON.stringify(parsedJson, null, 2);
    onProgress?.(100);
    return new Blob([formatted], { type: 'application/json' });
  }

  if (targetFormat === 'csv') {
    const list = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
    const csv = arrayToDelimited(list, ',');
    onProgress?.(100);
    return new Blob([csv], { type: 'text/csv' });
  }

  if (targetFormat === 'tsv') {
    const list = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
    const tsv = arrayToDelimited(list, '\t');
    onProgress?.(100);
    return new Blob([tsv], { type: 'text/tab-separated-values' });
  }

  if (targetFormat === 'xml') {
    const xml = jsonToXml(parsedJson);
    onProgress?.(100);
    return new Blob([xml], { type: 'application/xml' });
  }

  if (targetFormat === 'yaml') {
    const yaml = jsonToYaml(parsedJson);
    onProgress?.(100);
    return new Blob([yaml], { type: 'text/yaml' });
  }

  if (targetFormat === 'md-table') {
    const list = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
    const md = arrayToMarkdownTable(list);
    onProgress?.(100);
    return new Blob([md], { type: 'text/markdown' });
  }

  throw new Error(`Unsupported data format: ${targetFormat}`);
}
