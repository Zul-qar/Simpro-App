import express from 'express';

import * as quoteController from '../controllers/quoteController.js';

const router = express.Router();

router.get('/allquotes', quoteController.getQuotes);
router.get('/quotecatalogs', quoteController.getQuoteCatalogs);

export default router;