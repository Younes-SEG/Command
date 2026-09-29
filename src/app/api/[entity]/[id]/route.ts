import { NextResponse } from 'next/server';
import { apiError, mutationBody, validateDeleteOrigin } from '@/lib/server/http';
import { deleteEntity, saveEntity } from '@/lib/server/mutations';

export const runtime = 'nodejs';
type Context = { params: Promise<{ entity: string; id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { entity, id } = await context.params;
    return NextResponse.json(await saveEntity(entity, await mutationBody(request), id));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    validateDeleteOrigin(request);
    const { entity, id } = await context.params;
    return NextResponse.json(await deleteEntity(entity, id));
  } catch (error) {
    return apiError(error);
  }
}
