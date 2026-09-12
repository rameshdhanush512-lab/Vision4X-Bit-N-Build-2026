// ─────────────────────────────────────────────────────────────────────────────
// RIGHTS AGENT
// Responsibilities: determine the appropriate privacy action, generate a
// professional data-removal/right-to-erasure request letter.
// Disclaimer: generated content is NOT legal advice.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../utils/prisma';
import { emitAgentEvent } from '../../utils/socketEmitter';
import { logger } from '../../utils/logger';
import { PrivacyWorkflowState, PrivacyRequestDraft } from '../../types';

function generateRemovalRequest(
  userName: string,
  targetOrg: string,
  dataTypes: string[],
  riskLevel: string
): string {
  const date = new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const dataList = dataTypes
    .map((d) => d.replace(/_/g, ' '))
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .join(', ');

  return `Date: ${date}

To: The Data Protection / Privacy Team
Organisation: ${targetOrg}

Subject: Formal Request for Erasure of Personal Data — Right to Be Forgotten

Dear Data Protection Officer,

I, ${userName}, am writing to formally request the erasure and deletion of all personal data held about me by ${targetOrg}, in accordance with applicable data protection regulations including the General Data Protection Regulation (GDPR) and the Digital Personal Data Protection Act, 2023 (India).

Data identified as exposed or held without explicit consent includes:
${dataTypes.map((d) => `  • ${d.replace(/_/g, ' ')}`).join('\n')}

I request that you:

1. Permanently delete all personal data held about me including: ${dataList}.
2. Cease all processing, sharing, and selling of my personal data to third parties.
3. Confirm in writing within 30 days that my data has been fully erased.
4. Inform any third parties to whom you have disclosed my data of this erasure request.

If my data was obtained via legitimate consent, please provide evidence of that consent. If you are unable to fulfil this request, please provide a clear legal basis for retention.

Please acknowledge receipt of this request within 72 hours.

Regards,
${userName}

---
DISCLAIMER: This request was prepared by PRIVEX, an autonomous privacy protection tool. 
This document is NOT legal advice. For formal legal proceedings, consult a qualified privacy lawyer.
Risk Level at Time of Request: ${riskLevel}`;
}

export async function rightsAgent(state: PrivacyWorkflowState): Promise<PrivacyWorkflowState> {
  const { userId, scanId, findings, riskResults, userProfile } = state;

  logger.info('RightsAgent started', { scanId });

  emitAgentEvent({
    scanId,
    agentName: 'RIGHTS',
    status: 'RUNNING',
    message: 'Rights Agent is preparing data-removal requests for high-risk exposures',
    timestamp: new Date().toISOString(),
  });

  const runRecord = await prisma.agentRun.create({
    data: {
      userId,
      scanId,
      agentName: 'RIGHTS',
      task: 'Generate professional privacy removal requests for HIGH and CRITICAL exposures',
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  try {
    await new Promise((r) => setTimeout(r, 600));

    const privacyRequests: PrivacyRequestDraft[] = [];

    // Only generate requests for HIGH and CRITICAL exposures
    const actionableRisks = riskResults.filter((r) =>
      ['HIGH', 'CRITICAL'].includes(r.riskLevel)
    );

    const exposures = await prisma.exposure.findMany({
      where: { userId, status: 'ACTION_REQUIRED' },
      orderBy: { createdAt: 'desc' },
    });

    for (let i = 0; i < actionableRisks.length; i++) {
      const risk = actionableRisks[i];
      const finding = findings[risk.findingIndex];
      const exposure = exposures[risk.findingIndex];

      if (!finding || !exposure) continue;

      const requestType = finding.dataTypes.includes('password_hash')
        ? 'DATA_DELETION'
        : 'RIGHT_TO_ERASURE';

      const generatedRequest = generateRemovalRequest(
        userProfile.name,
        finding.source,
        finding.dataTypes,
        risk.riskLevel
      );

      const draft: PrivacyRequestDraft = {
        targetOrg: finding.source,
        requestType,
        reason: risk.explanation,
        generatedRequest,
      };

      privacyRequests.push(draft);

      // Persist request as READY draft
      await prisma.privacyRequest.create({
        data: {
          userId,
          exposureId: exposure.id,
          targetOrg: finding.source,
          requestType: requestType as any,
          reason: risk.explanation,
          generatedRequest,
          status: 'READY',
        },
      });
    }

    await prisma.agentRun.update({
      where: { id: runRecord.id },
      data: {
        status: 'COMPLETED',
        result: `${privacyRequests.length} removal requests prepared`,
        metadata: { count: privacyRequests.length },
        completedAt: new Date(),
      },
    });

    emitAgentEvent({
      scanId,
      agentName: 'RIGHTS',
      status: 'COMPLETED',
      message: `${privacyRequests.length} privacy removal requests are ready`,
      timestamp: new Date().toISOString(),
      metadata: { count: privacyRequests.length },
    });

    return { ...state, privacyRequests, currentStep: 'GUARDIAN' };
  } catch (error) {
    logger.error('RightsAgent failed', { scanId, error });

    await prisma.agentRun.update({
      where: { id: runRecord.id },
      data: { status: 'FAILED', result: 'Rights agent failed', completedAt: new Date() },
    });

    emitAgentEvent({
      scanId,
      agentName: 'RIGHTS',
      status: 'FAILED',
      message: 'Rights Agent encountered an error — requests not generated',
      timestamp: new Date().toISOString(),
    });

    return { ...state, errors: [...state.errors, 'Rights agent failed'], currentStep: 'GUARDIAN' };
  }
}
