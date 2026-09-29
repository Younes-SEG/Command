import { NextResponse } from 'next/server';
import { apiError, mutationBody } from '@/lib/server/http';
import { saveEntity } from '@/lib/server/mutations';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ entity: string }> }) {
  try {
    const { entity } = await context.params;
    const data = await saveEntity(entity, await mutationBody(request));
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
