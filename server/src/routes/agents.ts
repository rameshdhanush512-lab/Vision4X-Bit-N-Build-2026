import { Router } from 'express';
import { getAgentRuns, getDashboard } from '../controllers/agentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/runs', getAgentRuns);

export default router;
