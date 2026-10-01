import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eraseWorkspace } from '@/lib/server/privacy';
import { apiError, mutationBody } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    const body = await mutationBody(request);
    z.literal('DELETE MY DATA', 'Type DELETE MY DATA to confirm erasure.').parse(body.confirmation);
    await eraseWorkspace();
    return NextResponse.json({ erased: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
