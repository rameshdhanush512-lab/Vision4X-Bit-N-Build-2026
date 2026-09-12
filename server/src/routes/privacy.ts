import { Router } from 'express';
import {
  startScan,
  getExposures,
  getExposureById,
  createPrivacyRequest,
  getPrivacyRequests,
  getFollowUps,
  verifyExposure,
  updateRequestStatus,
} from '../controllers/privacyController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/scan', startScan);
router.get('/exposures', getExposures);
router.get('/exposures/:id', getExposureById);
router.post('/request', createPrivacyRequest);
router.get('/requests', getPrivacyRequests);
router.patch('/requests/:id/status', updateRequestStatus);
router.get('/followups', getFollowUps);
router.post('/verify', verifyExposure);

export default router;
