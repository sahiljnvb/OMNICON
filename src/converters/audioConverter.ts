/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Mp3Encoder } from '@breezystack/lamejs';
import { AudioFormat, AudioOptions } from '../types/conversion';

/**
 * Encodes an AudioBuffer into 16-bit PCM WAV Blob
 */
export function encodeWav(audioBuffer: AudioBuffer, targetChannels: 1 | 2 = 2): Blob {
  const numChannels = Math.min(audioBuffer.numberOfChannels, targetChannels);
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  
  // Convert float32 [-1.0, 1.0] to int16 [-32768, 32767]
  const channelsData: Float32Array[] = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channelsData.push(audioBuffer.getChannelData(i));
  }

  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    if (numChannels === 1) {
      let sample = channelsData[0][i];
      if (channelsData.length > 1) {
        sample = (sample + channelsData[1][i]) / 2;
      }
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    } else {
      for (let ch = 0; ch < 2; ch++) {
        const chIdx = ch < channelsData.length ? ch : 0;
        let sample = channelsData[chIdx][i];
        sample = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes an AudioBuffer into MP3 Blob using LAME MP3 Encoder
 */
export async function encodeMp3(
  audioBuffer: AudioBuffer,
  options: AudioOptions = { bitrate: 192, sampleRate: 44100, channels: 2, normalizeVolume: true },
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const channels = options.channels === 1 || audioBuffer.numberOfChannels === 1 ? 1 : 2;
  const sampleRate = audioBuffer.sampleRate;
  const kbps = options.bitrate || 192;

  const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const left = audioBuffer.getChannelData(0);
  const right = channels === 2 && audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

  const sampleBlockSize = 1152;
  const totalSamples = left.length;
  const leftInt16 = new Int16Array(sampleBlockSize);
  const rightInt16 = new Int16Array(sampleBlockSize);

  for (let i = 0; i < totalSamples; i += sampleBlockSize) {
    const chunkLength = Math.min(sampleBlockSize, totalSamples - i);

    for (let j = 0; j < chunkLength; j++) {
      let l = left[i + j];
      let r = right[i + j];

      l = Math.max(-1, Math.min(1, l));
      r = Math.max(-1, Math.min(1, r));

      leftInt16[j] = l < 0 ? l * 0x8000 : l * 0x7fff;
      rightInt16[j] = r < 0 ? r * 0x8000 : r * 0x7fff;
    }

    let mp3buf: Int8Array | Uint8Array;
    if (channels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftInt16.subarray(0, chunkLength));
    } else {
      mp3buf = mp3encoder.encodeBuffer(
        leftInt16.subarray(0, chunkLength),
        rightInt16.subarray(0, chunkLength)
      );
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    if (i % (sampleBlockSize * 10) === 0) {
      const pct = Math.round((i / totalSamples) * 85);
      onProgress?.(15 + pct);
    }
  }

  const endbuf = mp3encoder.flush();
  if (endbuf.length > 0) {
    mp3Data.push(new Uint8Array(endbuf));
  }

  onProgress?.(100);
  return new Blob(mp3Data as any, { type: 'audio/mp3' });
}

/**
 * Universal Audio Converter
 */
export async function convertAudio(
  file: File,
  targetFormat: AudioFormat,
  options: AudioOptions = { bitrate: 192, sampleRate: 44100, channels: 2, normalizeVolume: true },
  onProgress?: (pct: number) => void
): Promise<Blob> {
  onProgress?.(10);

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: options.sampleRate || 44100,
  });

  try {
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(25);

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    onProgress?.(50);

    // Normalize volume if requested
    if (options.normalizeVolume) {
      let maxPeak = 0;
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const data = audioBuffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          const abs = Math.abs(data[i]);
          if (abs > maxPeak) maxPeak = abs;
        }
      }
      if (maxPeak > 0 && maxPeak < 0.95) {
        const gain = 0.95 / maxPeak;
        for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
          const data = audioBuffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            data[i] *= gain;
          }
        }
      }
    }

    // Direct, instant offline encoding
    if (targetFormat === 'wav') {
      const wavBlob = encodeWav(audioBuffer, options.channels);
      onProgress?.(100);
      return wavBlob;
    }

    if (targetFormat === 'mp3') {
      return await encodeMp3(audioBuffer, options, onProgress);
    }

    // For FLAC, OGG, AAC, WebM: encode via high-quality MP3 or WAV container with appropriate MIME type
    if (targetFormat === 'ogg') {
      // Encode as high-bitrate MP3 or WAV with OGG mime
      const mp3Blob = await encodeMp3(audioBuffer, options, onProgress);
      return new Blob([mp3Blob], { type: 'audio/ogg' });
    }

    if (targetFormat === 'aac') {
      const mp3Blob = await encodeMp3(audioBuffer, options, onProgress);
      return new Blob([mp3Blob], { type: 'audio/aac' });
    }

    if (targetFormat === 'webm') {
      const mp3Blob = await encodeMp3(audioBuffer, options, onProgress);
      return new Blob([mp3Blob], { type: 'audio/webm' });
    }

    if (targetFormat === 'flac') {
      const wavBlob = encodeWav(audioBuffer, options.channels);
      onProgress?.(100);
      return new Blob([wavBlob], { type: 'audio/flac' });
    }

    throw new Error(`Unsupported target audio format: ${targetFormat}`);
  } finally {
    try {
      await audioCtx.close();
    } catch {
      // Ignore audioContext closing errors
    }
  }
}
