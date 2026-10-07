import { SYLLABUS_SERVICE_URL } from '../syllabus-service-config';
import { syllabusPreviewSchema } from '../syllabus-result';
import type { SyllabusAiInput } from './syllabus-ai';
import { ApiError } from './errors';

const unavailable =
  'Syllabus reading is unavailable right now. Please try again later. Your courses and grades are still available.';

function serviceUrl(path: string) {
  const value = process.env.COMMAND_SYLLABUS_SERVICE_URL?.trim() || SYLLABUS_SERVICE_URL;
  if (!value) throw new ApiError(503, unavailable);
  try {
    const url = new URL(value);
    const local =
      process.env.NODE_ENV !== 'production' &&
      url.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (
      (!local && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error();
    return new URL(path, url);
  } catch {
    throw new ApiError(503, unavailable);
  }
}

export async function isSyllabusServiceAvailable() {
  try {
    const response = await fetch(serviceUrl('/health'), {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    const ok = response.ok;
    await response.body?.cancel();
    return ok;
  } catch {
    return false;
  }
}

let reading = false;
export async function readSyllabusThroughService(input: SyllabusAiInput, signal?: AbortSignal) {
  const url = serviceUrl('/v1/syllabus');
  if (reading) throw new ApiError(429, 'A syllabus is already being read. Wait for it to finish.');
  reading = true;
  const timeout = AbortSignal.timeout(140_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      // No workspace IDs, grades, feed URLs, local credentials or file names leave the app.
      body: JSON.stringify({
        kind: input.kind,
        document: Buffer.from(input.bytes).toString('base64'),
        course: input.course,
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      // Never echo upstream HTML, credentials, document content or arbitrary error strings.
      if (response.status === 429)
        throw new ApiError(
          429,
          'The syllabus reader is busy or its usage allowance has been reached. Please try again later. Nothing was saved.',
        );
      if (response.status === 413)
        throw new ApiError(413, 'This syllabus is too large. Try fewer pages or a smaller file.');
      if (response.status === 400 || response.status === 422)
        throw new ApiError(
          422,
          'The syllabus could not be read. Try an unlocked PDF or paste its text.',
        );
      throw new ApiError(503, unavailable);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new Error();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return syllabusPreviewSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw new ApiError(499, 'Syllabus reading was cancelled.');
    if (timeout.aborted)
      throw new ApiError(504, 'Reading took too long. Try a shorter syllabus. Nothing was saved.');
    throw new ApiError(
      502,
      'Command could not reach the syllabus reader or received an incomplete response. Check your connection and try again. Nothing was saved.',
    );
  } finally {
    reading = false;
  }
}
