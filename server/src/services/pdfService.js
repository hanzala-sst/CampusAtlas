import { extractText } from 'unpdf';

const DEFAULT_CHUNK_SIZE = 600; // ~100-120 words
const DEFAULT_CHUNK_OVERLAP = 120; // ~20-25 words

export async function extractPagesFromPdf(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty PDF buffer provided for text extraction.');
  }

  // Ensure pure Uint8Array (pdfjs specifically rejects Buffer.isBuffer)
  let uint8;
  if (Buffer.isBuffer(buffer)) {
    uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else if (buffer instanceof Uint8Array) {
    uint8 = buffer;
  } else {
    uint8 = new Uint8Array(buffer);
  }

  let result;
  try {
    result = await extractText(uint8, { mergePages: false });
  } catch (err) {
    throw new Error(`Failed to parse PDF document: ${err.message}`);
  }

  const totalPages = result.totalPages || 0;
  const rawPages = Array.isArray(result.text) ? result.text : [result.text || ''];

  if (totalPages === 0 || rawPages.length === 0) {
    throw new Error('PDF contains no readable pages.');
  }

  const pages = rawPages.map((pageText, index) => ({
    pageNumber: index + 1, // 1-based page numbers
    text: (pageText || '').trim(),
  }));

  // Check if any extractable text was found
  const totalCharacters = pages.reduce((acc, p) => acc + p.text.length, 0);
  if (totalCharacters === 0) {
    throw new Error(
      'PDF contains no extractable text. Scanned or image-only documents without an embedded text layer are currently unsupported for this MVP.'
    );
  }

  return {
    totalPages,
    pages,
    totalCharacters,
  };
}

export function chunkPages(pages, resourceId, options = {}) {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;

  const allChunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.text;
    if (!text || text.length === 0) {
      continue; // Skip blank pages
    }

    // If page text is smaller than chunk size, emit single chunk
    if (text.length <= chunkSize) {
      allChunks.push({
        resourceId,
        pageNumber: page.pageNumber,
        chunkIndex: chunkIndex++,
        text,
      });
      continue;
    }

    // Split page text into bounded overlapping windows strictly within this page
    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;

      if (end >= text.length) {
        end = text.length;
      } else {
        // Try to break at a sentence or word boundary
        const nextBreak = text.lastIndexOf(' ', end);
        if (nextBreak > start + chunkSize * 0.5) {
          end = nextBreak;
        }
      }

      const chunkText = text.slice(start, end).trim();
      if (chunkText.length > 0) {
        allChunks.push({
          resourceId,
          pageNumber: page.pageNumber,
          chunkIndex: chunkIndex++,
          text: chunkText,
        });
      }

      if (end >= text.length) {
        break;
      }

      start = end - chunkOverlap;
      if (start < 0) start = 0;
    }
  }

  if (allChunks.length === 0) {
    throw new Error('No valid text chunks could be produced from document pages.');
  }

  return allChunks;
}
