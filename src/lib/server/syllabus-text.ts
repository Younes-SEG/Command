import { getDocumentProxy } from 'unpdf';
import { ApiError } from './errors';

export const MAX_SYLLABUS_BYTES = 8 * 1024 * 1024;
const MAX_TEXT = 100_000;

/** Validate the original PDF without extracting its text; image-only pages are supported. */
export async function inspectSyllabusUpload(bytes: Uint8Array, kind: 'pdf' | 'text') {
  if (!bytes.length || bytes.length > MAX_SYLLABUS_BYTES)
    throw new ApiError(413, 'Choose a non-empty file smaller than 8 MB.');
  if (kind === 'text') {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new ApiError(400, 'Choose a UTF-8 text file or a PDF.');
    }
    if (!text.trim() || text.includes('\0'))
      throw new ApiError(400, 'The syllabus text is empty or unreadable.');
    if (text.length > MAX_TEXT) throw new ApiError(413, 'Use fewer than 100,000 text characters.');
    return { pages: null, text };
  }
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-')
    throw new ApiError(400, 'This file is not a PDF. Choose a PDF or paste its text.');
  let pdf;
  try {
    // The parser may transfer its input buffer; retain the original bytes for the AI request.
    pdf = await getDocumentProxy(new Uint8Array(bytes), {
      verbosity: 0,
      useSystemFonts: false,
      disableFontFace: true,
    });
    if (pdf.numPages > 60) throw new ApiError(413, 'Use a syllabus with 60 pages or fewer.');
    return { pages: pdf.numPages };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      'This PDF could not be opened. Choose an unlocked PDF or paste the syllabus text.',
    );
  } finally {
    await pdf?.loadingTask.destroy();
  }
}
