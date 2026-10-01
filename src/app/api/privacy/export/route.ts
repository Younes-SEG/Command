import { NextResponse } from 'next/server';
import { exportWorkspace } from '@/lib/server/privacy';
import { apiError } from '@/lib/server/http';
import { assertSameOrigin } from '@/lib/server/origin';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    return NextResponse.json(await exportWorkspace(), {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'attachment; filename="command-data.json"',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
