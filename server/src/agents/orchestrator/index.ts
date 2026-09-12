// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR AGENT
// Responsibilities: plan the workflow, decide next step, handle failures,
// pass structured state, produce final status.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../utils/prisma';
import { emitAgentEvent } from '../../utils/socketEmitter';
import { logger } from '../../utils/logger';
import { PrivacyWorkflowState } from '../../types';

export async function orchestratorAgent(
  state: PrivacyWorkflowState
): Promise<PrivacyWorkflowState> {
  const { userId, scanId } = state;
  const ts = new Date().toISOString();

  logger.info('OrchestratorAgent started', { scanId });

  emitAgentEvent({
    scanId,
    agentName: 'ORCHESTRATOR',
    status: 'RUNNING',
    message: 'Orchestrator is planning your privacy protection workflow',
    timestamp: ts,
  });

  try {
    // Log this agent run
    await prisma.agentRun.create({
      data: {
        userId,
        scanId,
        agentName: 'ORCHESTRATOR',
        task: 'Plan and coordinate the privacy workflow',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Build the execution plan
    const plan = ['SCOUT', 'RISK', 'RIGHTS', 'GUARDIAN'];

    const nextState: PrivacyWorkflowState = {
      ...state,
      plan,
      currentStep: 'SCOUT',
    };

    await prisma.agentRun.updateMany({
      where: { userId, scanId, agentName: 'ORCHESTRATOR' },
      data: {
        status: 'COMPLETED',
        result: `Plan created: ${plan.join(' → ')}`,
        metadata: { plan },
        completedAt: new Date(),
      },
    });

    emitAgentEvent({
      scanId,
      agentName: 'ORCHESTRATOR',
      status: 'COMPLETED',
      message: `Workflow planned: ${plan.join(' → ')}`,
      timestamp: new Date().toISOString(),
      metadata: { plan },
    });

    return nextState;
  } catch (error) {
    logger.error('OrchestratorAgent failed', { scanId, error });

    emitAgentEvent({
      scanId,
      agentName: 'ORCHESTRATOR',
      status: 'FAILED',
      message: 'Orchestrator encountered an error during planning',
      timestamp: new Date().toISOString(),
    });

    return { ...state, status: 'FAILED', errors: [...state.errors, 'Orchestrator failed'] };
  }
}
