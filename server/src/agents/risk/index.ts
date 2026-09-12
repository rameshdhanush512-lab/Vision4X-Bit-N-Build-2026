// ─────────────────────────────────────────────────────────────────────────────
// RISK AGENT — scores exposures, explains risk in plain language
// Deterministic scoring + optional LLM explanation enrichment
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../utils/prisma';
import { emitAgentEvent } from '../../utils/socketEmitter';
import { logger } from '../../utils/logger';
import { PrivacyWorkflowState, RiskResult, RiskLevel, ScoutFinding } from '../../types';
import { callOllama } from '../../services/ollamaService';

// ── Deterministic risk scoring (always runs, never fails)
function scoreRisk(finding: ScoutFinding): Omit<RiskResult, 'explanation'> & { baseExplanation: string } {
  const types = new Set(finding.dataTypes);
  const factors: string[] = [];
  let score = 0;

  if (types.has('password_hash'))    { score += 40; factors.push('Credential data exposed'); }
  if (types.has('address'))          { score += 25; factors.push('Physical address disclosed'); }
  if (types.has('email'))            { score += 15; factors.push('Email address exposed'); }
  if (types.has('phone'))            { score += 15; factors.push('Phone number exposed'); }
  if (types.has('name'))             { score += 10; factors.push('Full name disclosed'); }
  if (types.has('purchase_history')) { score += 15; factors.push('Purchase behaviour tracked'); }
  if (types.has('demographics'))     { score += 10; factors.push('Demographic profile available'); }
  if (types.has('employer'))         { score +=  8; factors.push('Employer information disclosed'); }
  if (types.has('location'))         { score +=  8; factors.push('Location data available'); }
  if (types.has('username'))         { score +=  5; factors.push('Username exposed'); }

  if (types.size >= 4) { score += 15; factors.push('Multiple identifiers — high correlation risk'); }
  else if (types.size >= 3) { score += 8; factors.push('Cross-referencing risk from 3+ data types'); }

  score = Math.min(100, Math.round(score * finding.confidence));

  let riskLevel: RiskLevel;
  let baseExplanation: string;
  let recommendation: string;

  if (score >= 75) {
    riskLevel = 'CRITICAL';
    baseExplanation = `Critical risk: ${factors.join(', ')}. An attacker could perform identity theft or account takeover.`;
    recommendation = 'Submit an urgent data-erasure request immediately and change related passwords.';
  } else if (score >= 50) {
    riskLevel = 'HIGH';
    baseExplanation = `High risk: ${factors.join(', ')}. Significantly increases vulnerability to phishing and social engineering.`;
    recommendation = 'Request data removal and monitor accounts for suspicious activity.';
  } else if (score >= 25) {
    riskLevel = 'MEDIUM';
    baseExplanation = `Medium risk: ${factors.join(', ')}. Could enable targeted marketing or personalised scams.`;
    recommendation = 'Submit an opt-out request to limit further use of your data.';
  } else {
    riskLevel = 'LOW';
    baseExplanation = `Low risk: ${factors.join(', ')}. Contributes to overall data footprint but limited direct harm.`;
    recommendation = 'Monitor for changes. An opt-out request is optional but recommended.';
  }

  return { riskLevel, riskScore: score, factors, recommendation, baseExplanation };
}

export async function riskAgent(state: PrivacyWorkflowState): Promise<PrivacyWorkflowState> {
  const { userId, scanId, findings } = state;

  logger.info('RiskAgent started', { scanId, findingCount: findings.length });

  emitAgentEvent({
    scanId, agentName: 'RISK', status: 'RUNNING',
    message: `Analysing ${findings.length} exposures for risk level and impact`,
    timestamp: new Date().toISOString(),
  });

  const run = await prisma.agentRun.create({
    data: {
      userId, scanId,
      agentName: 'RISK',
      task: `Analyse ${findings.length} exposures and assign risk levels`,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  try {
    await new Promise((r) => setTimeout(r, 600));

    const riskResults: Array<RiskResult & { findingIndex: number }> = [];
    const exposures = await prisma.exposure.findMany({
      where: { userId, status: 'DETECTED' },
      orderBy: { createdAt: 'asc' },
      take: findings.length,
    });

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i];
      const scored = scoreRisk(finding);

      // Optionally enrich explanation with LLM
      const llmPrompt = `You are a privacy risk analyst explaining risks to a non-technical person.

Data source: "${finding.source}"
Exposed data: ${finding.dataTypes.join(', ')}
Risk level: ${scored.riskLevel}
Risk score: ${scored.riskScore}/100
Key factors: ${scored.factors.join('; ')}

Write ONE paragraph (3-4 sentences) explaining WHY this exposure is risky for the person, 
what a bad actor could do with it, and the real-world impact. Write for a general audience.
Do not use technical jargon. Do not repeat the risk level in the first word.`;

      const { text: explanation } = await callOllama(llmPrompt, scored.baseExplanation);

      const result: RiskResult & { findingIndex: number } = {
        riskLevel: scored.riskLevel,
        riskScore: scored.riskScore,
        factors: scored.factors,
        recommendation: scored.recommendation,
        explanation,
        findingIndex: i,
      };

      riskResults.push(result);

      if (exposures[i]) {
        await prisma.riskAssessment.upsert({
          where: { exposureId: exposures[i].id },
          create: {
            exposureId: exposures[i].id,
            riskLevel: result.riskLevel as any,
            riskScore: result.riskScore,
            explanation: result.explanation,
            factors: result.factors,
            recommendation: result.recommendation,
          },
          update: {
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
    const summary = `${criticalCount} critical, ${highCount} high-risk exposures identified`;

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        result: summary,
        metadata: { criticalCount, highCount, total: findings.length },
        completedAt: new Date(),
      },
    });

    emitAgentEvent({
      scanId, agentName: 'RISK', status: 'COMPLETED',
      message: `Risk analysis complete — ${summary}`,
      timestamp: new Date().toISOString(),
      metadata: { criticalCount, highCount },
    });

    const needsAction = riskResults.some((r) => ['CRITICAL', 'HIGH'].includes(r.riskLevel));
    return { ...state, riskResults, currentStep: needsAction ? 'RIGHTS' : 'GUARDIAN' };
  } catch (error) {
    logger.error('RiskAgent failed', { scanId, error });

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', result: 'Risk analysis failed', completedAt: new Date() },
    });

    emitAgentEvent({
      scanId, agentName: 'RISK', status: 'FAILED',
      message: 'Risk Agent encountered an error — continuing with Guardian',
      timestamp: new Date().toISOString(),
    });

    return { ...state, errors: [...state.errors, 'Risk agent failed'], currentStep: 'GUARDIAN' };
  }
}
