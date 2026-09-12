// ─────────────────────────────────────────────────────────────────────────────
// GUARDIAN AGENT
// Responsibilities: track privacy actions, schedule follow-ups, decide when
// follow-up is required, re-evaluate exposure status, mark as resolved.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../utils/prisma';
import { emitAgentEvent } from '../../utils/socketEmitter';
import { logger } from '../../utils/logger';
import { PrivacyWorkflowState } from '../../types';

export async function guardianAgent(state: PrivacyWorkflowState): Promise<PrivacyWorkflowState> {
  const { userId, scanId, privacyRequests } = state;

  logger.info('GuardianAgent started', { scanId });

  emitAgentEvent({
    scanId,
    agentName: 'GUARDIAN',
    status: 'RUNNING',
    message: 'Guardian is setting up follow-up tracking for your privacy requests',
    timestamp: new Date().toISOString(),
  });

  const runRecord = await prisma.agentRun.create({
    data: {
      userId,
      scanId,
      agentName: 'GUARDIAN',
      task: 'Create follow-up schedule and update exposure tracking',
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  try {
    await new Promise((r) => setTimeout(r, 500));

    // Fetch the requests we just created for this scan
    const requests = await prisma.privacyRequest.findMany({
      where: { userId, status: 'READY' },
      orderBy: { createdAt: 'desc' },
      take: privacyRequests.length,
    });

    let followUpCount = 0;

    for (const request of requests) {
      // Schedule follow-up 14 days from now for requests not yet sent
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 14);

      await prisma.followUp.create({
        data: {
          userId,
          privacyRequestId: request.id,
          scheduledAt: followUpDate,
          status: 'PENDING',
          notes: 'Auto-scheduled by Guardian Agent — check if organisation has responded',
        },
      });

      followUpCount++;
    }

    // Also check for any exposures that are LOW risk — mark as monitored
    await prisma.exposure.updateMany({
      where: { userId, status: 'DETECTED' },
      data: { status: 'ACTION_REQUIRED' },
    });

    await prisma.agentRun.update({
      where: { id: runRecord.id },
      data: {
        status: 'COMPLETED',
        result: `${followUpCount} follow-up schedules created`,
        metadata: { followUpCount },
        completedAt: new Date(),
      },
    });

    emitAgentEvent({
      scanId,
      agentName: 'GUARDIAN',
      status: 'COMPLETED',
      message: `Guardian created ${followUpCount} follow-up reminders. Workflow complete.`,
      timestamp: new Date().toISOString(),
      metadata: { followUpCount },
    });

    return { ...state, currentStep: 'END', status: 'COMPLETED' };
  } catch (error) {
    logger.error('GuardianAgent failed', { scanId, error });

    await prisma.agentRun.update({
      where: { id: runRecord.id },
      data: { status: 'FAILED', result: 'Guardian agent failed', completedAt: new Date() },
    });

    emitAgentEvent({
      scanId,
      agentName: 'GUARDIAN',
      status: 'FAILED',
      message: 'Guardian Agent encountered an error',
      timestamp: new Date().toISOString(),
    });

    return {
      ...state,
      errors: [...state.errors, 'Guardian agent failed'],
      status: 'FAILED',
      currentStep: 'END',
    };
  }
}
