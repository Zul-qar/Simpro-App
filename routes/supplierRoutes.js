import express from 'express';

import * as supplierController from '../controllers/supplierController.js';

const router = express.Router();

router.get('/supplierorders', supplierController.getVendorOrders);
router.get('/supplierreceipts', supplierController.getVendorReceipts);

export default router;
