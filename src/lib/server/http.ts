import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { ApiError } from './errors';
import { assertSameOrigin } from './origin';

export async function mutationBody(request: Request): Promise<Record<string, unknown>> {
  assertSameOrigin(request);
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new ApiError(415, 'Send application/json.');
  const body = await request.text();
  if (body.length > 100_000)
    throw new ApiError(413, 'This entry is too large. Keep it under 100 KB.');
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new ApiError(400, 'The request is not valid JSON.');
  }
  if (!data || Array.isArray(data) || typeof data !== 'object')
    throw new ApiError(400, 'Send a JSON object.');
  return data as Record<string, unknown>;
}

export function validateDeleteOrigin(request: Request) {
  assertSameOrigin(request);
}

export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? 'Check your entry.',
        fields: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025')
      return NextResponse.json(
        { error: 'This entry no longer exists. Refresh and try again.' },
        { status: 404 },
      );
    if (error.code === 'P2002')
      return NextResponse.json(
        { error: 'That entry already exists. Course codes must be unique within a semester.' },
        { status: 409 },
      );
    if (error.code === 'P2003')
      return NextResponse.json(
        { error: 'A linked entry is missing or still in use. Refresh and try again.' },
        { status: 409 },
      );
    if (error.code === 'P2034')
      return NextResponse.json(
        { error: 'Another change happened at the same time. Please try again.' },
        { status: 409 },
      );
  }
  console.error('Workspace request failed:', error);
  return NextResponse.json(
    { error: 'The database is unavailable or the change could not be saved. Please try again.' },
    { status: 500 },
  );
}
