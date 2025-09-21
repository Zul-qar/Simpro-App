import express from 'express';

import * as jobController from '../controllers/jobController.js';

const router = express.Router();

router.get('/alljobs', jobController.getJobs);
router.get('/jobcatalogs', jobController.getJobCatalogs);

export default router;