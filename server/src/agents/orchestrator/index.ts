// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR AGENT — plans workflow, decides routing, handles failures
// Uses Ollama LLM for reasoning when available; falls back to deterministic logic
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../utils/prisma';
import { emitAgentEvent } from '../../utils/socketEmitter';
import { logger } from '../../utils/logger';
import { PrivacyWorkflowState } from '../../types';
import { callOllama } from '../../services/ollamaService';

export async function orchestratorAgent(
  state: PrivacyWorkflowState
): Promise<PrivacyWorkflowState> {
  const { userId, scanId, userProfile } = state;

  logger.info('OrchestratorAgent started', { scanId });

  emitAgentEvent({
    scanId,
    agentName: 'ORCHESTRATOR',
    status: 'RUNNING',
    message: 'Orchestrator is analysing your profile and planning the privacy workflow',
    timestamp: new Date().toISOString(),
  });

  const run = await prisma.agentRun.create({
    data: {
      userId, scanId,
      agentName: 'ORCHESTRATOR',
      task: 'Plan and coordinate the privacy protection workflow',
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  try {
    // Ask LLM to reason about the workflow plan
    const prompt = `You are the Orchestrator for PRIVEX, an AI privacy guardian.

User profile:
- Name: ${userProfile.name}
- Email: ${userProfile.email}
${userProfile.additionalContext ? `- Additional context: ${userProfile.additionalContext}` : ''}

Your job is to create a concise execution plan for a privacy protection workflow.
The available agents are: SCOUT, RISK, RIGHTS, GUARDIAN.

Reply with a single short paragraph (2-3 sentences) explaining the plan. Be direct.`;

    const { text: planReasoning, usedLLM } = await callOllama(
      prompt,
      `Planning full privacy scan for ${userProfile.name}. Will run SCOUT → RISK → RIGHTS → GUARDIAN to discover exposures, assess risk, generate removal requests, and set up follow-up tracking.`
    );

    const plan = ['SCOUT', 'RISK', 'RIGHTS', 'GUARDIAN'];

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        result: `Plan created: ${plan.join(' → ')}`,
        metadata: JSON.stringify({ plan, planReasoning, usedLLM }),
        completedAt: new Date(),
      },
    });

    emitAgentEvent({
      scanId,
      agentName: 'ORCHESTRATOR',
      status: 'COMPLETED',
      message: planReasoning.substring(0, 120),
      timestamp: new Date().toISOString(),
      metadata: { plan, usedLLM },
    });

    return { ...state, plan, currentStep: 'SCOUT' };
  } catch (error) {
    logger.error('OrchestratorAgent failed', { scanId, error });

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', result: 'Orchestrator failed during planning', completedAt: new Date() },
    });

    emitAgentEvent({
      scanId, agentName: 'ORCHESTRATOR', status: 'FAILED',
      message: 'Orchestrator encountered an error during planning',
      timestamp: new Date().toISOString(),
    });

    return { ...state, status: 'FAILED', errors: [...state.errors, 'Orchestrator failed'] };
  }
}
