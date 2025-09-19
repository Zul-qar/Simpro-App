import express from 'express';
import { getUsageAnalysis } from '../controllers/analysisController.js';

const router = express.Router();

router.get('/usage', getUsageAnalysis);

export default router;