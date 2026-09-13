// ─────────────────────────────────────────────────────────────────────────────
// PRIVEX — Privacy Request Demo Processing Workflow
//
// Runs asynchronously after a request is sent. Simulates the real-world
// lifecycle of a data-removal request with realistic timing.
//
// CLEARLY LABELLED AS DEMO/SIMULATED — no real third-party data is deleted.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../utils/prisma';
import { emitToUser } from '../utils/socketEmitter';
import { logger } from '../utils/logger';

export interface ActivityEntry {
  ts: string;       // ISO timestamp
  stage: string;    // machine-readable stage key
  message: string;  // human-readable description
}

/**
 * Append an entry to the request's activityLog and update its status,
 * then emit a socket event to the owning user.
 */
async function advance(
  requestId: string,
  userId: string,
  stage: string,
  message: string,
  newStatus?: string
): Promise<void> {
  const entry: ActivityEntry = {
    ts: new Date().toISOString(),
    stage,
    message,
  };

  // Read current log, append new entry
  const current = await prisma.privacyRequest.findUnique({
    where: { id: requestId },
    select: { activityLog: true } as any,
  }) as { activityLog: unknown } | null;

  const log: ActivityEntry[] = (() => {
    try {
      const raw = (current as any)?.activityLog;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();
  log.push(entry);

  await prisma.privacyRequest.update({
    where: { id: requestId },
    data: {
      activityLog: JSON.stringify(log),
      ...(newStatus ? { status: newStatus as any } : {}),
    } as any,
  });

  // Notify the frontend via Socket.IO
  emitToUser(userId, 'request:update', {
    requestId,
    stage,
    message,
    status: newStatus,
    ts: entry.ts,
  });

  logger.debug('Request workflow advance', { requestId, stage, newStatus });
}

/**
 * Run the full demo processing lifecycle for a privacy request.
 * Call this in the background (do NOT await in the HTTP handler).
 *
 * Timeline (demo):
 *  0s   — SENT         (already set before this is called)
 *  5s   — ACKNOWLEDGED — [DEMO] Source acknowledged receipt
 * 20s   — PROCESSING   — [DEMO] Data removal processing started
 * 50s   — VERIFIED     — [DEMO] Removal verification in progress
 * 90s   — COMPLETED    — [DEMO] Privacy request completed
 */
export async function runDemoProcessingWorkflow(
  requestId: string,
  userId: string,
  targetOrg: string
): Promise<void> {
  try {
    logger.info('Demo workflow started', { requestId, targetOrg });

    // 5s — acknowledgement
    await sleep(5_000);
    await advance(
      requestId, userId,
      'ACKNOWLEDGED',
      `[DEMO] ${targetOrg} acknowledged receipt of your privacy request`,
      'ACKNOWLEDGED'
    );

    // 20s — processing
    await sleep(15_000);
    await advance(
      requestId, userId,
      'PROCESSING',
      `[DEMO] ${targetOrg} has started processing your data-removal request`,
      'PROCESSING'
    );

    // 50s — verification
    await sleep(30_000);
    await advance(
      requestId, userId,
      'VERIFIED',
      `[DEMO] PRIVEX is verifying that ${targetOrg} has removed your data`,
      'VERIFIED'
    );

    // 90s — completed
    await sleep(40_000);
    await advance(
      requestId, userId,
      'COMPLETED',
      `[DEMO] Privacy request completed. ${targetOrg} confirmed data removal.`,
      'COMPLETED'
    );

    // Update linked exposure to RESOLVED
    const req = await prisma.privacyRequest.findUnique({
      where: { id: requestId },
      select: { exposureId: true },
    });
    if (req) {
      await prisma.exposure.update({
        where: { id: req.exposureId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    }

    logger.info('Demo workflow completed', { requestId });
  } catch (err) {
    logger.error('Demo workflow failed', { requestId, err });
    try {
      await advance(
        requestId, userId,
        'FAILED',
        'Processing workflow encountered an error.',
        'FAILED'
      );
    } catch {}
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
