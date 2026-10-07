import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/server/origin';
import { ApiError } from '@/lib/server/errors';
import { apiError } from '@/lib/server/http';
import { inspectSyllabusUpload, MAX_SYLLABUS_BYTES } from '@/lib/server/syllabus-text';
import {
  isSyllabusServiceAvailable,
  readSyllabusThroughService,
} from '@/lib/server/syllabus-service';
import { db } from '@/lib/server/db';
import { requireWorkspaceId } from '@/lib/server/auth';
import { isHosted } from '@/lib/server/hosting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    await requireWorkspaceId();
    return NextResponse.json(
      { configured: await isSyllabusServiceAvailable() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspaceId();
    const uploadLimit = isHosted() ? 4 * 1024 * 1024 : MAX_SYLLABUS_BYTES;
    assertSameOrigin(request);
    const type = request.headers.get('content-type')?.split(';')[0];
    if (type !== 'application/pdf' && type !== 'text/plain')
      throw new ApiError(415, 'Choose a PDF or plain text file.');
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, 'Choose a file first.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > uploadLimit) {
          await reader.cancel();
          throw new ApiError(413, `Choose a file smaller than ${isHosted() ? 4 : 8} MB.`);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(Buffer.concat(chunks));
    const kind = type === 'application/pdf' ? 'pdf' : 'text';
    const document = await inspectSyllabusUpload(bytes, kind);
    const courseId = request.headers.get('x-command-course');
    if (!courseId || courseId.length > 200)
      throw new ApiError(400, 'Choose a course before uploading your syllabus.');
    const course = await db.course.findUnique({
      where: { id: courseId, semester: { workspaceId } },
      select: { code: true, name: true, semester: { select: { startDate: true, endDate: true } } },
    });
    if (!course) throw new ApiError(404, 'This course no longer exists. Choose another course.');
    const preview = await readSyllabusThroughService(
      {
        bytes,
        kind,
        ...document,
        course: {
          code: course.code,
          name: course.name,
          startDate: course.semester.startDate.toISOString().slice(0, 10),
          endDate: course.semester.endDate.toISOString().slice(0, 10),
        },
      },
      request.signal,
    );
    return NextResponse.json(preview, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ApiError) return apiError(error);
    // Parser errors can include document contents. Never log or return them.
    return NextResponse.json(
      { error: 'The syllabus could not be read. Nothing was saved. Please try again.' },
      { status: 500 },
    );
  }
}
