/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument } from 'pdf-lib';
import { encodeWav } from '../converters/audioConverter';
import { createPdfFromText } from '../converters/documentConverter';

export const HINDI_POEM_TEXT = `कालिदास से चैटजीपीटी तक

छूट गईं सब पोथी-पाती, हाथ आ गया मोबाइल,
दादी माँ के नुस्खे बिसरे, खुली ज्ञान की नव फाइल।

वैद्य-हकीमी व्यर्थ हुई सब, सिर के दर्द-बुखारों में,
सारे रोग शिफा पाते हैं, इंटरनेट-दरबारों में!

पूछा जब कंप्यूटर से तो, बोला— "हम अवतारी हैं,
कालिदासों की छुट्टी है, अब एआई की बारी है!"

पहले गुरुजी पिंगल-व्याकरण, घोट-घोट सिखलाते थे,
संधि, समास, रसों के फेरे, सबके पसीने छुड़ाते थे।

मात्रा का अनुपात डिगा तो, सीधी बेंत बरसती थी,
बिना साधना काव्य-सुधा की, बूंद-बूंद तरसती थी।

अब तो बच्चा आँख मूँदकर, केवल 'प्रॉम्प्ट' लगाता है,
छंद-अलंकारों का गट्ठर, चैटजीपीटी लाता है!

हमने भी कौतुक में आकर, दी परीक्षा की थाती,
बोले— "ऐ मशीन! दिखला दे, क्या तू भी विरह सजाती?"

अल्गोरिदम के चश्मे से जब, उसने काव्य उछाला था,
रस, करुणा और मर्यादा का, रूप बिगाड़ने वाला था!

बोला— "कालिदास के मेघों पर, क्लाउड सर्वर लाऊँगा,
यक्ष-प्रिया के विरह-संदेशा, ब्लूटूथ से पहुँचाऊँगा!"

सुनकर ऐसा ज्ञान विकृत सा, चौंक उठा अंतर्मन था,

संस्कृति का रस-कुंभ चुराकर, करता यह कैसा छल था!

श्रीमद्भगवद्गीता में भी, कोडिंग का मंत्र चलाता है,
दादी माँ की अमर थपकी में, 'सिस्टम एरर' बताता है!

कहता— "छोड़ो भाव-जगत को, मैं तो कोड सिखाऊँगा,
काव्य-गोष्ठियों के सारे रस, अब सर्वर से बरसाऊँगा!"

हमने डाँट कहा कि मूरख! तू चाहे जितना इतरा,
सुपर-कंप्यूटर से रचवा ले, महाकाव्य का हर पन्ना!

किंतु बता दे मन की पीरा, नयनों का जल लाएगा?
रसगुल्ले की फोटो देगा, पर क्या स्वाद चखाएगा?

शब्द चुरा लेगा भाषा के, भाव कहाँ से लाएगा?
जो न हृदय से उपजा विह्वल, वो रस कहाँ समाएगा?

तकनीकी विकास युग का है, यह भी सत्य सहारा है,
मानव की मेधा का ही तो, यह अद्भुत विस्तारा है।

किंतु नियंत्रण रहे हाथ में, साधन मात्र रहे साधन,
भाव-जगत का अमर विधाता, बना रहेगा मानव-मन!

जब तक स्पंदन शेष देह में, अमर चेतना जागेगी,
कालिदास की अमर लेखनी, कंप्यूटर से आगे ही रहेगी!

- आफताब अहमद`;

/**
 * Creates an in-memory sample Hindi poem PDF with exact stanzas from screenshot
 */
export async function createSampleHindiPoemPdf(): Promise<File> {
  try {
    const res = await fetch('/samples/kalidas_se_chatgpt_tak.pdf');
    if (res.ok) {
      const blob = await res.blob();
      return new File([blob], 'kalidas_se_chatgpt_tak.pdf', { type: 'application/pdf' });
    }
  } catch {
    // Fall back to runtime generation
  }
  const blob = await createPdfFromText('कालिदास से चैटजीपीटी तक', HINDI_POEM_TEXT, {
    title: 'कालिदास से चैटजीपीटी तक',
    author: 'आफताब अहमद',
    fontSize: 12,
    pageSize: 'A4',
    layoutMode: 'poetry',
  });
  return new File([blob], 'kalidas_se_chatgpt_tak.pdf', { type: 'application/pdf' });
}

/**
 * Creates an image-only / scanned PDF with rasterized Hindi poem verses & English subtitle
 * Contains zero digital text streams to test OCR extraction to EPUB
 */
export async function createSampleScannedHindiPoemPdf(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d')!;

  // Paper background
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, 1000, 1350);

  // Decorative border
  ctx.strokeStyle = '#d4c5b9';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, 920, 1270);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(48, 48, 904, 1254);

  // Title in Devanagari
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 36px "Noto Sans Devanagari", "Mangal", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('कालिदास से चैटजीपीटी तक', 500, 140);

  // English Subtitle
  ctx.fillStyle = '#4f46e5';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('Hindi Poetry & Modern AI — Scanned Image PDF', 500, 185);

  // Ornamental divider
  ctx.fillStyle = '#ec4899';
  ctx.font = '24px serif';
  ctx.fillText('❦ ❦ ❦', 500, 230);

  // Verses
  const verses = [
    'छूट गईं सब पोथी-पाती, हाथ आ गया मोबाइल,',
    'दादी माँ के नुस्खे बिसरे, खुली ज्ञान की नव फाइल।',
    '',
    'वैद्य-हकीमी व्यर्थ हुई सब, सिर के दर्द-बुखारों में,',
    'सारे रोग शिफा पाते हैं, इंटरनेट-दरबारों में!',
    '',
    'पूछा जब कंप्यूटर से तो, बोला— "हम अवतारी हैं,',
    'कालिदासों की छुट्टी है, अब एआई की बारी है!"',
    '',
    'किंतु बता दे मन की पीरा, नयनों का जल लाएगा?',
    'रसगुल्ले की फोटो देगा, पर क्या स्वाद चखाएगा?',
    '',
    'शब्द चुरा लेगा भाषा के, भाव कहाँ से लाएगा?',
    'जो न हृदय से उपजा विह्वल, वो रस कहाँ समाएगा?'
  ];

  ctx.fillStyle = '#111827';
  ctx.font = '22px "Noto Sans Devanagari", "Mangal", system-ui, sans-serif';
  let y = 300;
  for (const line of verses) {
    if (line === '') {
      y += 24;
    } else {
      ctx.fillText(line, 500, y);
      y += 42;
    }
  }

  // Author Credit (Hindi & English)
  ctx.fillStyle = '#374151';
  ctx.font = 'italic bold 20px "Noto Sans Devanagari", "Mangal", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('— आफताब अहमद (Aftab Ahmad)', 860, y + 60);

  // Bottom caption
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Scanned Document Image (Zero Embedded Font Data) • OmniConvert OCR', 500, 1260);

  // Convert canvas to image bytes and embed into pure image PDF
  const imgBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const imgBuffer = await imgBlob.arrayBuffer();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const embeddedImg = await pdfDoc.embedPng(new Uint8Array(imgBuffer));
  page.drawImage(embeddedImg, {
    x: 0,
    y: 0,
    width: 595,
    height: 842,
  });

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes as any], 'scanned_image_poem.pdf', { type: 'application/pdf' });
}

/**
 * Creates an in-memory sample PDF file
 */
export async function createSamplePdf(): Promise<File> {
  const content = `# Annual Quarterly Overview
OmniConvert Mobile is an offline-first file conversion utility designed for zero-latency local document and media operations.

## Key Performance Metrics
- 100% Client-Side Processing
- Offline PWA Support
- Real-time Audio Encoding
- Zero Server Uploads

All documents and media files stay strictly within your device's browser memory sandbox.`;

  const blob = await createPdfFromText('Sample Document', content, { fontSize: 12, pageSize: 'A4' });
  return new File([blob], 'sample_report.pdf', { type: 'application/pdf' });
}

/**
 * Creates an in-memory sample high-res image file
 */
export async function createSampleImage(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 640, 640);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(0.5, '#ec4899');
  grad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 640);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(320, 320, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OmniConvert', 320, 310);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Offline Image Sample', 320, 355);

  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
  return new File([blob], 'geometric_artwork.png', { type: 'image/png' });
}

/**
 * Creates an in-memory pleasant audio chime file (440Hz / 880Hz harmonized)
 */
export async function createSampleAudio(): Promise<File> {
  const sampleRate = 44100;
  const duration = 2.5;
  const totalSamples = Math.floor(sampleRate * duration);

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const audioBuffer = audioCtx.createBuffer(2, totalSamples, sampleRate);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 2.2);
    const note1 = Math.sin(2 * Math.PI * 523.25 * t);
    const note2 = Math.sin(2 * Math.PI * 659.25 * t);
    const note3 = Math.sin(2 * Math.PI * 783.99 * t);
    const sample = (note1 * 0.4 + note2 * 0.3 + note3 * 0.3) * envelope * 0.6;

    left[i] = sample;
    right[i] = sample * 0.95;
  }

  const wavBlob = encodeWav(audioBuffer, 2);
  await audioCtx.close();
  return new File([wavBlob], 'chime_audio.wav', { type: 'audio/wav' });
}

/**
 * Creates an in-memory sample CSV data file
 */
export function createSampleCsv(): File {
  const csvContent = `id,product,category,price,inStock,rating
1,E-Reader Touch,Electronics,129.99,true,4.8
2,Noise Cancelling Headphones,Audio,199.50,true,4.7
3,Ultra HD Monitor,Displays,349.00,false,4.6
4,Ergonomic Mechanical Keyboard,Accessories,89.95,true,4.9
5,Portable SSD 1TB,Storage,115.00,true,4.8`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  return new File([blob], 'inventory_data.csv', { type: 'text/csv' });
}
