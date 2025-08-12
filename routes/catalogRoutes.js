import express from 'express';
import * as catalogController from '../controllers/catalogControllers.js';

const router = express.Router();

router.get('/allcatalogs', catalogController.getCatalogs);
router.get('/groups', catalogController.getCatalogGroups);

export default router;