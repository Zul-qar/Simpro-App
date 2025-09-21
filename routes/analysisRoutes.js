import express from 'express';
import { getUsageAnalysis, getActiveCatalogs, archiveAndGroupCleanup } from '../controllers/analysisController.js';

const router = express.Router();

router.get('/usage', getUsageAnalysis);
router.get('/activeCatalogs', getActiveCatalogs);
router.post('/archiveAndCleanup', archiveAndGroupCleanup);

export default router;