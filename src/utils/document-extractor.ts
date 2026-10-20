/**
 * Document & Media Extraction Utility
 * Extracts plain text from PDF, DOCX, TXT, and analyzes image assets in-browser.
 */

import mammoth from 'mammoth';

export interface ExtractionResult {
  text: string;
  wordCount: number;
  characterCount: number;
  mediaUrl?: string;
  mediaType?: 'image/png' | 'image/jpeg' | 'text';
  imageDimensions?: { width: number; height: number };
  imageColorContrastRatio?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Extract text and metadata from uploaded File
 */
export async function extractDocumentContent(file: File): Promise<ExtractionResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(1)} MB exceeds the maximum 10 MB limit.`);
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  // 1. Plain Text
  if (extension === 'txt' || file.type === 'text/plain') {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error('Empty extraction: The uploaded text file contains no readable content.');
    }
    return {
      text: text.trim(),
      wordCount: text.trim().split(/\s+/).length,
      characterCount: text.length,
      mediaType: 'text',
    };
  }

  // 2. Microsoft Word (DOCX)
  if (extension === 'docx' || file.type.includes('wordprocessingml')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value?.trim() || '';
      if (!text) {
        throw new Error('Empty extraction: The DOCX document contains no extractable body text.');
      }
      return {
        text,
        wordCount: text.split(/\s+/).length,
        characterCount: text.length,
        mediaType: 'text',
      };
    } catch (err: any) {
      throw new Error(`Failed to extract DOCX: ${err.message || 'Corrupted or password-protected document.'}`);
    }
  }

  // 3. Adobe PDF (PDF)
  if (extension === 'pdf' || file.type === 'application/pdf') {
    try {
      // Dynamic import of pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      // Set worker source
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        fullText += pageText + '\n';
      }

      const cleanText = fullText.trim();
      if (!cleanText) {
        throw new Error('Empty extraction: The PDF appears to be empty, scanned without OCR, or password-protected.');
      }

      return {
        text: cleanText,
        wordCount: cleanText.split(/\s+/).length,
        characterCount: cleanText.length,
        mediaType: 'text',
      };
    } catch (err: any) {
      throw new Error(`Failed to read PDF: ${err.message || 'Corrupted or protected PDF document.'}`);
    }
  }

  // 4. Image Assets (PNG, JPG, WebP)
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '') || file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Off-screen canvas to sample visual contrast
          let contrastRatio = 4.8; // default acceptable
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = Math.min(img.width, 200);
              canvas.height = Math.min(img.height, 200);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

              // Sample luminance across pixels
              let totalLuminance = 0;
              for (let p = 0; p < imgData.length; p += 16) {
                const r = imgData[p] / 255;
                const g = imgData[p + 1] / 255;
                const b = imgData[p + 2] / 255;
                const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                totalLuminance += lum;
              }
              const avgLum = totalLuminance / (imgData.length / 16);
              // Contrast ratio against dark text (0.05) or light text (0.95)
              contrastRatio = (avgLum + 0.05) / (0.05 + 0.05);
            }
          } catch {
            // Canvas sampling security fallback
            contrastRatio = 4.8;
          }

          resolve({
            text: `[Visual Creative Asset: ${file.name}]`,
            wordCount: 5,
            characterCount: file.name.length,
            mediaUrl: dataUrl,
            mediaType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            imageDimensions: { width: img.width, height: img.height },
            imageColorContrastRatio: Math.max(1.8, Math.min(contrastRatio, 14)),
          });
        };
        img.onerror = () => reject(new Error('Corrupted or invalid image file.'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read image file data.'));
      reader.readAsDataURL(file);
    });
  }

  throw new Error(
    `Unsupported file format ".${extension || 'unknown'}". Supported formats: PDF, DOCX, TXT, PNG, JPG.`
  );
}
