import express from 'express';
import * as prebuildController from '../controllers/prebuildController.js';

const router = express.Router();

router.get('/allprebuilds', prebuildController.getPrebuilds);
router.get('/prebuildcatalogs', prebuildController.getPrebuildCatalogs)

export default router;