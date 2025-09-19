import express from 'express';
import { getVendorCatalogs } from '../controllers/vendorController.js';

const router = express.Router();

// GET /vendor/catalogs?companyID=30&startDate=2024-01-01&endDate=2024-12-31
router.get('/catalogs', getVendorCatalogs);

export default router;
