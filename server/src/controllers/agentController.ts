import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// GET /api/agents/runs
export async function getAgentRuns(req: Request, res: Response): Promise<void> {
  const { scanId } = req.query;

  try {
    const runs = await prisma.agentRun.findMany({
      where: {
        userId: req.user!.userId,
        ...(scanId ? { scanId: scanId as string } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ runs });
  } catch (error) {
    logger.error('getAgentRuns failed', error);
    res.status(500).json({ error: 'Failed to fetch agent runs' });
  }
}

// GET /api/dashboard
export async function getDashboard(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  try {
    const [exposures, requests, followUps, recentRuns] = await Promise.all([
      prisma.exposure.findMany({
        where: { userId },
        include: { riskAssessment: true },
      }),
      prisma.privacyRequest.findMany({ where: { userId } }),
      prisma.followUp.findMany({ where: { userId, status: 'PENDING' } }),
      prisma.agentRun.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate Privacy Protection Score
    const total = exposures.length;
    const resolved = exposures.filter((e) => e.status === 'RESOLVED').length;
    const critical = exposures.filter((e) => e.riskAssessment?.riskLevel === 'CRITICAL').length;
    const high = exposures.filter((e) => e.riskAssessment?.riskLevel === 'HIGH').length;
    const medium = exposures.filter((e) => e.riskAssessment?.riskLevel === 'MEDIUM').length;
    const low = exposures.filter((e) => e.riskAssessment?.riskLevel === 'LOW').length;

    let score = 100;
    if (total > 0) {
      const penalty = critical * 20 + high * 10 + medium * 5 + low * 2;
      const bonus = resolved * 8;
      score = Math.max(0, Math.min(100, 100 - penalty + bonus));
    }

    const activeRequests = requests.filter((r) => !['COMPLETED', 'REJECTED', 'EXPIRED'].includes(r.status));

    res.json({
      privacyScore: score,
      exposureSummary: { total, critical, high, medium, low, resolved },
      activeRequests: activeRequests.length,
      resolvedExposures: resolved,
      pendingFollowUps: followUps.length,
      recentAgentActivity: recentRuns,
    });
  } catch (error) {
    logger.error('getDashboard failed', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
