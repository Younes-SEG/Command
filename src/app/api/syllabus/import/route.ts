import { NextResponse } from 'next/server';
import { apiError, mutationBody } from '@/lib/server/http';
import { importSyllabus } from '@/lib/server/syllabus-import';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    return NextResponse.json(await importSyllabus(await mutationBody(request)), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
