// ─────────────────────────────────────────────────────────────────────────────
// SCOUT AGENT
// Responsibilities: search approved/demo sources, identify exposed PII,
// normalise findings, deduplicate, return structured exposure records.
// Safety: uses only controlled demo dataset — no real scraping.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../utils/prisma';
import { emitAgentEvent } from '../../utils/socketEmitter';
import { logger } from '../../utils/logger';
import { PrivacyWorkflowState, ScoutFinding } from '../../types';
import { getDemoFindings } from '../../tools/demoDataset';

function deduplicateFindings(findings: ScoutFinding[]): ScoutFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.source}:${f.dataTypes.sort().join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scoutAgent(state: PrivacyWorkflowState): Promise<PrivacyWorkflowState> {
  const { userId, scanId } = state;

  logger.info('ScoutAgent started', { scanId });

  emitAgentEvent({
    scanId,
    agentName: 'SCOUT',
    status: 'RUNNING',
    message: 'Scout is searching approved data sources for exposed information',
    timestamp: new Date().toISOString(),
  });

  const runRecord = await prisma.agentRun.create({
    data: {
      userId,
      scanId,
      agentName: 'SCOUT',
      task: 'Discover exposed personal information across data sources',
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  try {
    // Simulate a search delay for realistic demo
    await new Promise((r) => setTimeout(r, 1200));

    const rawFindings = getDemoFindings();
    const findings = deduplicateFindings(rawFindings);

    // Persist exposures to the database
    for (const finding of findings) {
      await prisma.exposure.create({
        data: {
          userId,
          source: finding.source,
          dataTypes: finding.dataTypes,
          severityCandidate: finding.severityCandidate,
          confidence: finding.confidence,
          evidence: finding.evidence,
          rawData: finding.rawData as any,
          status: 'DETECTED',
        },
      });
    }

    await prisma.agentRun.update({
      where: { id: runRecord.id },
      data: {
        status: 'COMPLETED',
        result: `${findings.length} exposures discovered`,
        metadata: { count: findings.length },
        completedAt: new Date(),
      },
    });

    emitAgentEvent({
      scanId,
      agentName: 'SCOUT',
      status: 'COMPLETED',
      message: `Scout found ${findings.length} potential exposures`,
      timestamp: new Date().toISOString(),
      metadata: { count: findings.length },
    });

    return { ...state, findings, currentStep: 'RISK' };
  } catch (error) {
    logger.error('ScoutAgent failed', { scanId, error });

    await prisma.agentRun.update({
      where: { id: runRecord.id },
      data: { status: 'FAILED', result: 'Scout failed to complete search', completedAt: new Date() },
    });

    emitAgentEvent({
      scanId,
      agentName: 'SCOUT',
      status: 'FAILED',
      message: 'Scout encountered an error — skipping to next available step',
      timestamp: new Date().toISOString(),
    });

    return { ...state, errors: [...state.errors, 'Scout agent failed'], currentStep: 'END' };
  }
}
