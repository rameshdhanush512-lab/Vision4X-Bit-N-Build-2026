// ─────────────────────────────────────────────────────────────────────────────
// RISK AGENT
// Responsibilities: analyse each exposure, assign severity, explain WHY it's
// risky in plain language, prioritise actions.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../utils/prisma';
import { emitAgentEvent } from '../../utils/socketEmitter';
import { logger } from '../../utils/logger';
import { PrivacyWorkflowState, RiskResult, RiskLevel, ScoutFinding } from '../../types';

// ── Deterministic risk logic (no LLM needed for core scoring)
function assessRisk(finding: ScoutFinding): RiskResult {
  const types = new Set(finding.dataTypes);
  const factors: string[] = [];
  let score = 0;

  if (types.has('password_hash')) { score += 40; factors.push('Credential data exposed'); }
  if (types.has('address'))       { score += 25; factors.push('Physical address disclosed'); }
  if (types.has('email'))         { score += 15; factors.push('Email address exposed'); }
  if (types.has('phone'))         { score += 15; factors.push('Phone number exposed'); }
  if (types.has('name'))          { score += 10; factors.push('Full name disclosed'); }
  if (types.has('purchase_history')) { score += 15; factors.push('Purchase behaviour tracked'); }
  if (types.has('demographics'))  { score += 10; factors.push('Demographic profile available'); }
  if (types.has('employer'))      { score += 8;  factors.push('Employer information disclosed'); }
  if (types.has('location'))      { score += 8;  factors.push('Location data available'); }
  if (types.has('username'))      { score += 5;  factors.push('Username exposed'); }

  // Correlation bonus — more data types = higher combined risk
  if (types.size >= 4) { score += 15; factors.push('Multiple identifiers can be correlated'); }
  else if (types.size >= 3) { score += 8; factors.push('Cross-referencing risk from 3+ data types'); }

  // Confidence modifier
  score = Math.round(score * finding.confidence);
  score = Math.min(100, score);

  let riskLevel: RiskLevel;
  let explanation: string;
  let recommendation: string;

  if (score >= 75) {
    riskLevel = 'CRITICAL';
    explanation = `This exposure is critical. ${factors.join(', ')}. An attacker with this data could perform identity theft, account takeover, or targeted phishing with high probability of success.`;
    recommendation = 'Submit an urgent data-erasure request immediately and consider changing related passwords.';
  } else if (score >= 50) {
    riskLevel = 'HIGH';
    explanation = `This exposure is high risk. ${factors.join(', ')}. The combination of exposed data makes you significantly more vulnerable to phishing, spam, and social engineering.`;
    recommendation = 'Request data removal and monitor your accounts for suspicious activity.';
  } else if (score >= 25) {
    riskLevel = 'MEDIUM';
    explanation = `This exposure is a moderate risk. ${factors.join(', ')}. The data could be used to build a profile or target you with personalised marketing or scams.`;
    recommendation = 'Consider submitting an opt-out request to limit further use of your data.';
  } else {
    riskLevel = 'LOW';
    explanation = `This exposure is low risk. ${factors.join(', ')}. Minimal direct harm, but it contributes to your overall data footprint.`;
    recommendation = 'Monitor for changes. An opt-out request is optional but recommended.';
  }

  return { riskLevel, riskScore: score, explanation, factors, recommendation };
}

export async function riskAgent(state: PrivacyWorkflowState): Promise<PrivacyWorkflowState> {
  const { userId, scanId, findings } = state;

  logger.info('RiskAgent started', { scanId, findingCount: findings.length });

  emitAgentEvent({
    scanId,
    agentName: 'RISK',
    status: 'RUNNING',
    message: `Risk Agent is analysing ${findings.length} exposures`,
    timestamp: new Date().toISOString(),
  });

  const runRecord = await prisma.agentRun.create({
    data: {
      userId,
      scanId,
      agentName: 'RISK',
      task: `Analyse ${findings.length} exposures and assign risk levels`,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  try {
    await new Promise((r) => setTimeout(r, 800));

    const riskResults: Array<RiskResult & { findingIndex: number }> = [];

    // Fetch the persisted exposures for this scan
    const exposures = await prisma.exposure.findMany({
      where: { userId, status: 'DETECTED' },
      orderBy: { createdAt: 'desc' },
      take: findings.length,
    });

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i];
      const result = assessRisk(finding);
      riskResults.push({ ...result, findingIndex: i });

      // Persist risk assessment
      if (exposures[i]) {
        await prisma.riskAssessment.create({
          data: {
            exposureId: exposures[i].id,
            riskLevel: result.riskLevel as any,
            riskScore: result.riskScore,
            explanation: result.explanation,
            factors: result.factors,
            recommendation: result.recommendation,
          },
        });

        await prisma.exposure.update({
          where: { id: exposures[i].id },
          data: { status: 'ACTION_REQUIRED', severityCandidate: result.riskLevel },
        });
      }
    }

    const criticalCount = riskResults.filter((r) => r.riskLevel === 'CRITICAL').length;
    const highCount = riskResults.filter((r) => r.riskLevel === 'HIGH').length;

    await prisma.agentRun.update({
      where: { id: runRecord.id },
      data: {
        status: 'COMPLETED',
        result: `${criticalCount} critical, ${highCount} high-risk exposures identified`,
        metadata: { criticalCount, highCount, total: findings.length },
        completedAt: new Date(),
      },
    });

    emitAgentEvent({
      scanId,
      agentName: 'RISK',
      status: 'COMPLETED',
      message: `Risk analysis complete: ${criticalCount} critical, ${highCount} high-risk`,
      timestamp: new Date().toISOString(),
      metadata: { criticalCount, highCount },
    });

    // Determine next step based on risk results
    const needsAction = riskResults.some((r) => ['CRITICAL', 'HIGH'].includes(r.riskLevel));
    const nextStep = needsAction ? 'RIGHTS' : 'GUARDIAN';

    return { ...state, riskResults, currentStep: nextStep };
  } catch (error) {
    logger.error('RiskAgent failed', { scanId, error });

    await prisma.agentRun.update({
      where: { id: runRecord.id },
      data: { status: 'FAILED', result: 'Risk analysis failed', completedAt: new Date() },
    });

    emitAgentEvent({
      scanId,
      agentName: 'RISK',
      status: 'FAILED',
      message: 'Risk Agent encountered an error',
      timestamp: new Date().toISOString(),
    });

    return { ...state, errors: [...state.errors, 'Risk agent failed'], currentStep: 'GUARDIAN' };
  }
}
