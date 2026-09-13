// ─────────────────────────────────────────────────────────────────────────────
// PRIVEX — LangGraph Privacy Workflow
//
// Graph:
//   START → orchestrator → scout → risk → [conditional] → rights? → guardian → END
//
// Conditional: if risk results contain HIGH/CRITICAL → rights
//              otherwise skip rights → guardian
// ─────────────────────────────────────────────────────────────────────────────

import { StateGraph, END, START } from '@langchain/langgraph';
import { orchestratorAgent } from '../agents/orchestrator';
import { scoutAgent } from '../agents/scout';
import { riskAgent } from '../agents/risk';
import { rightsAgent } from '../agents/rights';
import { guardianAgent } from '../agents/guardian';
import { PrivacyWorkflowState } from '../types';
import { emitAgentEvent } from '../utils/socketEmitter';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// ── State annotation for LangGraph
// Using plain object pattern compatible with @langchain/langgraph ^0.2
const workflowChannels = {
  userId: { value: (x: string, y: string) => y ?? x, default: () => '' },
  scanId: { value: (x: string, y: string) => y ?? x, default: () => '' },
  userProfile: { value: (x: any, y: any) => y ?? x, default: () => ({}) },
  plan: { value: (_x: string[], y: string[]) => y, default: () => [] },
  currentStep: { value: (_x: string, y: string) => y, default: () => 'START' },
  findings: { value: (_x: any[], y: any[]) => y, default: () => [] },
  riskResults: { value: (_x: any[], y: any[]) => y, default: () => [] },
  privacyRequests: { value: (_x: any[], y: any[]) => y, default: () => [] },
  errors: { value: (x: string[], y: string[]) => [...x, ...y], default: () => [] },
  status: { value: (_x: string, y: string) => y, default: () => 'RUNNING' },
  completedAt: { value: (_x: any, y: any) => y ?? _x, default: () => undefined },
};

// ── Conditional routing after Risk Agent
function routeAfterRisk(state: PrivacyWorkflowState): string {
  if (state.status === 'FAILED') return 'guardian';
  const needsAction = state.riskResults.some((r) =>
    ['HIGH', 'CRITICAL'].includes(r.riskLevel)
  );
  return needsAction ? 'rights' : 'guardian';
}

// ── Build and compile the graph
function buildPrivacyGraph() {
  const graph: any = new StateGraph({ channels: workflowChannels as any });

  graph.addNode('orchestrator', orchestratorAgent as any);
  graph.addNode('scout', scoutAgent as any);
  graph.addNode('risk', riskAgent as any);
  graph.addNode('rights', rightsAgent as any);
  graph.addNode('guardian', guardianAgent as any);

  // Edges
  graph.addEdge(START, 'orchestrator');
  graph.addEdge('orchestrator', 'scout');
  graph.addEdge('scout', 'risk');

  // Conditional: risk → rights OR guardian
  graph.addConditionalEdges('risk', routeAfterRisk, {
    rights: 'rights',
    guardian: 'guardian',
  });

  graph.addEdge('rights', 'guardian');
  graph.addEdge('guardian', END);

  return graph.compile();
}

const compiledGraph = buildPrivacyGraph();

// ── Public entry point called by the privacy controller
export async function runPrivacyWorkflow(
  initialState: PrivacyWorkflowState
): Promise<PrivacyWorkflowState> {
  const { userId, scanId } = initialState;

  logger.info('Privacy workflow started', { scanId });

  try {
    const finalState = await compiledGraph.invoke(initialState);

    // Emit final completion event
    emitAgentEvent({
      scanId,
      agentName: 'ORCHESTRATOR',
      status: 'COMPLETED',
      message: `Privacy scan complete. ${finalState.findings?.length ?? 0} exposures found, ${finalState.privacyRequests?.length ?? 0} requests prepared.`,
      timestamp: new Date().toISOString(),
      metadata: {
        findings: finalState.findings?.length ?? 0,
        requests: finalState.privacyRequests?.length ?? 0,
        errors: finalState.errors,
      },
    });

    logger.info('Privacy workflow completed', { scanId });
    return finalState as PrivacyWorkflowState;
  } catch (error) {
    logger.error('Privacy workflow threw unhandled error', { scanId, error });

    emitAgentEvent({
      scanId,
      agentName: 'ORCHESTRATOR',
      status: 'FAILED',
      message: 'Privacy workflow encountered a critical error',
      timestamp: new Date().toISOString(),
    });

    return { ...initialState, status: 'FAILED', errors: ['Workflow critical failure'] };
  }
}
