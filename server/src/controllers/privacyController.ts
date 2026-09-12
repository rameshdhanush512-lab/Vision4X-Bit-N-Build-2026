import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { runPrivacyWorkflow } from '../graph/privacyGraph';
import { logger } from '../utils/logger';
import { sendPrivacyRequestEmail } from '../services/emailService';
import { runDemoProcessingWorkflow, ActivityEntry } from '../services/requestWorkflow';

// POST /api/privacy/analyze  — re-run risk analysis on a specific exposure
export async function analyzeExposure(req: Request, res: Response): Promise<void> {
  const { exposureId } = req.body;
  if (!exposureId) {
    res.status(400).json({ error: 'exposureId is required' });
    return;
  }

  try {
    const exposure = await prisma.exposure.findFirst({
      where: { id: exposureId, userId: req.user!.userId },
      include: { riskAssessment: true },
    });

    if (!exposure) {
      res.status(404).json({ error: 'Exposure not found' });
      return;
    }

    // Import lazily to avoid circular deps at module load
    const { callOllama } = await import('../services/ollamaService');

    const prompt = `You are a privacy risk analyst. Analyse this exposure and explain the risk to a non-technical person.

Source: "${exposure.source}"
Exposed data: ${exposure.dataTypes.join(', ')}
Evidence: ${exposure.evidence}
Confidence: ${Math.round(exposure.confidence * 100)}%

Write ONE paragraph (3-4 sentences) explaining WHY this is risky and what a bad actor could do.`;

    const fallback = `This exposure from ${exposure.source} reveals ${exposure.dataTypes.join(', ')} with ${Math.round(exposure.confidence * 100)}% confidence. This data could be used to target you with phishing or identity abuse attacks.`;

    const { text: explanation, usedLLM } = await callOllama(prompt, fallback);

    res.json({ exposureId, explanation, usedLLM, dataTypes: exposure.dataTypes, source: exposure.source });
  } catch (error) {
    logger.error('analyzeExposure failed', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
}

// POST /api/privacy/scan
export async function startScan(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { additionalContext } = req.body;
  const scanId = uuidv4();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Respond immediately — workflow runs async and pushes events via Socket.IO
    res.status(202).json({
      scanId,
      message: 'Privacy scan started. Monitor progress via Socket.IO or GET /api/agents/runs.',
    });

    // Run the multi-agent workflow in background
    runPrivacyWorkflow({
      userId,
      scanId,
      userProfile: { name: user.name, email: user.email, additionalContext },
      plan: [],
      currentStep: 'START',
      findings: [],
      riskResults: [],
      privacyRequests: [],
      errors: [],
      status: 'RUNNING',
    }).catch((err) => {
      logger.error('Privacy workflow crashed', { scanId, err });
    });
  } catch (error) {
    logger.error('startScan failed', error);
    res.status(500).json({ error: 'Failed to start scan' });
  }
}

// GET /api/privacy/exposures
export async function getExposures(req: Request, res: Response): Promise<void> {
  try {
    const exposures = await prisma.exposure.findMany({
      where: { userId: req.user!.userId },
      include: { riskAssessment: true },
      orderBy: { detectedAt: 'desc' },
    });
    res.json({ exposures });
  } catch (error) {
    logger.error('getExposures failed', error);
    res.status(500).json({ error: 'Failed to fetch exposures' });
  }
}

// GET /api/privacy/exposures/:id
export async function getExposureById(req: Request, res: Response): Promise<void> {
  try {
    const exposure = await prisma.exposure.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        riskAssessment: true,
        privacyRequests: true,
        verificationResults: true,
      },
    });
    if (!exposure) {
      res.status(404).json({ error: 'Exposure not found' });
      return;
    }
    res.json({ exposure });
  } catch (error) {
    logger.error('getExposureById failed', error);
    res.status(500).json({ error: 'Failed to fetch exposure' });
  }
}

// POST /api/privacy/request
export async function createPrivacyRequest(req: Request, res: Response): Promise<void> {
  const { exposureId, targetOrg, requestType, reason, generatedRequest } = req.body;

  if (!exposureId || !targetOrg || !requestType || !generatedRequest) {
    res.status(400).json({ error: 'exposureId, targetOrg, requestType, and generatedRequest are required' });
    return;
  }

  try {
    const exposure = await prisma.exposure.findFirst({
      where: { id: exposureId, userId: req.user!.userId },
    });
    if (!exposure) {
      res.status(404).json({ error: 'Exposure not found' });
      return;
    }

    const request = await prisma.privacyRequest.create({
      data: {
        userId: req.user!.userId,
        exposureId,
        targetOrg,
        requestType: requestType as any,
        reason: reason || '',
        generatedRequest,
        status: 'READY',
      },
    });

    await prisma.exposure.update({
      where: { id: exposureId },
      data: { status: 'ACTION_REQUIRED' },
    });

    res.status(201).json({ request });
  } catch (error) {
    logger.error('createPrivacyRequest failed', error);
    res.status(500).json({ error: 'Failed to create privacy request' });
  }
}

// GET /api/privacy/requests
export async function getPrivacyRequests(req: Request, res: Response): Promise<void> {
  try {
    const requests = await prisma.privacyRequest.findMany({
      where: { userId: req.user!.userId },
      include: { exposure: { select: { source: true, dataTypes: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ requests });
  } catch (error) {
    logger.error('getPrivacyRequests failed', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
}

// GET /api/privacy/followups
export async function getFollowUps(req: Request, res: Response): Promise<void> {
  try {
    const followUps = await prisma.followUp.findMany({
      where: { userId: req.user!.userId },
      include: {
        privacyRequest: { select: { targetOrg: true, requestType: true, status: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json({ followUps });
  } catch (error) {
    logger.error('getFollowUps failed', error);
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
}

// POST /api/privacy/verify
export async function verifyExposure(req: Request, res: Response): Promise<void> {
  const { exposureId, outcome, notes } = req.body;

  if (!exposureId || !outcome) {
    res.status(400).json({ error: 'exposureId and outcome are required' });
    return;
  }

  try {
    const exposure = await prisma.exposure.findFirst({
      where: { id: exposureId, userId: req.user!.userId },
    });
    if (!exposure) {
      res.status(404).json({ error: 'Exposure not found' });
      return;
    }

    const result = await prisma.verificationResult.create({
      data: {
        exposureId,
        method: 'manual_check',
        outcome: outcome as any,
        notes,
      },
    });

    if (outcome === 'RESOLVED') {
      await prisma.exposure.update({
        where: { id: exposureId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    }

    res.status(201).json({ result });
  } catch (error) {
    logger.error('verifyExposure failed', error);
    res.status(500).json({ error: 'Failed to record verification' });
  }
}

// PATCH /api/privacy/requests/:id/status
export async function updateRequestStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body;
  const validStatuses = ['DRAFT', 'READY', 'SENT', 'ACKNOWLEDGED', 'PROCESSING', 'VERIFIED', 'COMPLETED', 'REJECTED', 'EXPIRED', 'FAILED'];

  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const request = await prisma.privacyRequest.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const updated = await prisma.privacyRequest.update({
      where: { id: req.params.id },
      data: {
        status: status as any,
        ...(status === 'SENT' ? { sentAt: new Date() } : {}),
      },
    });

    if (status === 'SENT') {
      await prisma.exposure.update({
        where: { id: request.exposureId },
        data: { status: 'REQUEST_SENT' },
      });

      // Auto-schedule follow-up 14 days out
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 14);
      await prisma.followUp.create({
        data: {
          userId: req.user!.userId,
          privacyRequestId: request.id,
          scheduledAt: followUpDate,
        },
      });
    }

    res.json({ request: updated });
  } catch (error) {
    logger.error('updateRequestStatus failed', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
}

// GET /api/privacy/requests/:id
export async function getPrivacyRequestById(req: Request, res: Response): Promise<void> {
  try {
    const request = await prisma.privacyRequest.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        exposure: {
          select: {
            source: true,
            dataTypes: true,
            riskAssessment: { select: { riskLevel: true, riskScore: true } },
          },
        },
      },
    });
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    res.json({ request });
  } catch (error) {
    logger.error('getPrivacyRequestById failed', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
}

// POST /api/privacy/requests/:id/send
// Sends the actual email + starts the demo processing workflow
export async function sendPrivacyRequest(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const requestId = req.params.id;

  try {
    const privReq = await prisma.privacyRequest.findFirst({
      where: { id: requestId, userId },
      include: {
        exposure: { select: { source: true, dataTypes: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!privReq) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (!['READY', 'DRAFT'].includes(privReq.status)) {
      res.status(400).json({ error: `Cannot send a request with status ${privReq.status}` });
      return;
    }

    // ── 1. Build initial activity log entry
    const now = new Date().toISOString();
    const initialLog: ActivityEntry[] = [
      { ts: now, stage: 'CREATED', message: 'Privacy request prepared and validated' },
      { ts: new Date().toISOString(), stage: 'SENDING', message: `Sending data-removal email to ${privReq.targetOrg}` },
    ];

    await prisma.privacyRequest.update({
      where: { id: requestId },
      data: { activityLog: initialLog as any },
    });

    // ── 2. Send the actual email (Ethereal demo SMTP)
    const emailResult = await sendPrivacyRequestEmail({
      toEmail: `dpo@${privReq.targetOrg.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com`,
      toOrg: privReq.targetOrg,
      fromName: privReq.user.name,
      fromEmail: privReq.user.email,
      requestId,
      requestType: privReq.requestType,
      body: privReq.generatedRequest,
    });

    if (!emailResult.success) {
      // Store failure in log and mark FAILED
      const failLog: ActivityEntry[] = [
        ...initialLog,
        {
          ts: new Date().toISOString(),
          stage: 'FAILED',
          message: `Email delivery failed: ${emailResult.error}`,
        },
      ];
      await prisma.privacyRequest.update({
        where: { id: requestId },
        data: { status: 'FAILED', activityLog: failLog as any },
      });
      res.status(502).json({ error: 'Email sending failed', detail: emailResult.error });
      return;
    }

    // ── 3. Mark SENT, store email log
    const sentLog: ActivityEntry[] = [
      ...initialLog,
      {
        ts: new Date().toISOString(),
        stage: 'SENT',
        message: `Email sent successfully (ID: ${emailResult.messageId?.slice(0, 20)}…)`,
      },
    ];

    await prisma.privacyRequest.update({
      where: { id: requestId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        emailLog: emailResult as any,
        activityLog: sentLog as any,
      },
    });

    // Update linked exposure
    await prisma.exposure.update({
      where: { id: privReq.exposureId },
      data: { status: 'REQUEST_SENT' },
    });

    // Schedule follow-up 14 days out (skip if already exists)
    const existingFollowUp = await prisma.followUp.findFirst({
      where: { privacyRequestId: requestId },
    });
    if (!existingFollowUp) {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 14);
      await prisma.followUp.create({
        data: {
          userId,
          privacyRequestId: requestId,
          scheduledAt: followUpDate,
          notes: 'Auto-scheduled by PRIVEX — verify if organisation responded',
        },
      });
    }

    // ── 4. Respond to client immediately (email sent)
    res.json({
      success: true,
      status: 'SENT',
      requestId,
      emailPreviewUrl: emailResult.previewUrl,
      message: 'Privacy request email sent successfully. Demo processing workflow started.',
    });

    // ── 5. Run demo processing workflow in background (no await)
    runDemoProcessingWorkflow(requestId, userId, privReq.targetOrg).catch((err) => {
      logger.error('Background demo workflow error', { requestId, err });
    });

  } catch (error) {
    logger.error('sendPrivacyRequest failed', error);
    res.status(500).json({ error: 'Failed to send privacy request' });
  }
}
