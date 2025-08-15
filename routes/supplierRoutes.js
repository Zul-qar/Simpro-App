import express from 'express';

import * as supplierController from '../controllers/supplierController.js';

const router = express.Router();

router.get('/supplierorders', supplierController.getVendorOrders);
router.get('/supplierordercatalogs', supplierController.getVendorOrderCatalogs);
router.get('/supplierreceipts', supplierController.getVendorReceipts);
router.get('/supplierreceiptcatalogs', supplierController.getVendorReceiptCatalogs);

export default router;
