import { NextResponse, after } from 'next/server';
import { getWorkspace } from '@/lib/server/workspace';
import { apiError } from '@/lib/server/http';
import { requireWorkspaceId } from '@/lib/server/auth';
import { isHosted } from '@/lib/server/hosting';
import { syncDueSubscriptions } from '@/lib/server/calendar-subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const workspace = await getWorkspace();
    if (isHosted()) {
      const workspaceId = await requireWorkspaceId();
      after(async () => {
        try {
          await syncDueSubscriptions(workspaceId);
        } catch {
          /* Never log private feeds. */
        }
      });
    }
    return NextResponse.json(workspace, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
