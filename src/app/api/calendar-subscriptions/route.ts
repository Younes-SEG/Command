import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, mutationBody } from '@/lib/server/http';
import {
  connectSubscription,
  listSubscriptions,
  previewSubscription,
  subscriptionInput,
  syncSubscription,
} from '@/lib/server/calendar-subscriptions';
import { db } from '@/lib/server/db';
import { ApiError } from '@/lib/server/errors';
import { calendarNoticeVersion } from '@/lib/legal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await listSubscriptions(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return privateError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await mutationBody(request);
    const action = z
      .enum(['preview', 'connect', 'sync', 'disconnect', 'forget'])
      .parse(body.action);
    if (action === 'preview' || action === 'connect') {
      const input = subscriptionInput.parse(body);
      if (action === 'preview')
        return NextResponse.json(await previewSubscription(input), {
          headers: { 'Cache-Control': 'no-store' },
        });
      z.literal(
        calendarNoticeVersion,
        'Review the current connection notice before connecting.',
      ).parse(body.consentVersion);
      await connectSubscription(input);
    } else {
      const id = z.string().min(1).max(200).parse(body.id);
      if (action === 'sync') await syncSubscription(id);
      else if (action === 'forget') await db.calendarSubscription.delete({ where: { id } });
      else await db.calendarSubscription.update({ where: { id }, data: { enabled: false } });
    }
    return NextResponse.json(await listSubscriptions(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return privateError(error);
  }
}

function privateError(error: unknown) {
  if (error instanceof ApiError || error instanceof z.ZodError) return apiError(error);
  // Database/network error objects can embed subscription secrets.
  return NextResponse.json(
    { error: 'The calendar change could not be saved. Please try again.' },
    { status: 500 },
  );
}
