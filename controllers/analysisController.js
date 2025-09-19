import mongoose from "mongoose";
import QuoteCostCenterCatalog from "../models/quoteCostCenterCatalog.js";
import VendorOrderCatalog from "../models/vendorOrderCatalog.js";
import VendorReceiptCatalog from "../models/vendorReceiptCatalog.js";
import pLimit from 'p-limit';
import Catalog from '../models/catalog.js';
import PrebuildCatalog from '../models/prebuildCatalog.js';
import Company from '../models/company.js';
import Quote from '../models/quote.js';
import VendorReceipt from '../models/vendorReceipt.js';
import VendorOrder from '../models/vendorOrder.js';
import CatalogGroup from '../models/catalogGroup.js';
import dotenv from 'dotenv'; // Import dotenv at the top

// Load .env file only in development
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  dotenv.config();
}

const limit = pLimit(2);


const getUsageAnalysis = async (req, res, next) => {
  try {
    const { companyID, startDate, endDate, page = 1, pageSize = 50 } = req.query;

    if (!companyID || !startDate || !endDate) return res.status(400).json({ message: 'Missing parameters' });

    const company = await Company.findOne({ ID: companyID });

    // Parse dates if provided
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // 1) Master catalog list
    const masterCatalogs = await Catalog.find({ company: company._id })
      .select("ID PartNo Name Group Archived DateModified")
      .lean();

    // 2) Collect in-use catalog IDs
    const inUseSet = new Set();

    // --- Quotes ---
    const quoteFilter = { company: company._id };
    if (start || end) {
      quoteFilter.DateIssued = {};
      if (start) quoteFilter.DateIssued.$gte = start;
      if (end) quoteFilter.DateIssued.$lte = end;
    }
    const quoteIds = await Quote.find(quoteFilter).distinct("ID");
    if (quoteIds.length) {
      const ids = await QuoteCostCenterCatalog.distinct("Catalog.ID", {
        company: company._id,
        "Quote.ID": { $in: quoteIds }
      });
      ids.forEach(id => inUseSet.add(Number(id)));
    }

    // --- Prebuilds ---
    const prebuildIds = await PrebuildCatalog.distinct("Catalog.ID", {
      company: company._id
    });
    prebuildIds.forEach(id => inUseSet.add(Number(id)));

    // --- Vendor Orders ---
    const vendorOrderIds = await VendorOrder.find({ company: company._id }).distinct("_id");
    if (vendorOrderIds.length) {
      const ids = await VendorOrderCatalog.distinct("Catalog.ID", {
        company: company._id,
        vendorOrder: { $in: vendorOrderIds }
      });
      ids.forEach(id => inUseSet.add(Number(id)));
    }

    // --- Vendor Receipts ---
    const receiptFilter = { company: company._id };
    if (start || end) {
      receiptFilter.DateIssued = {};
      if (start) receiptFilter.DateIssued.$gte = start;
      if (end) receiptFilter.DateIssued.$lte = end;
    }
    const receiptIds = await VendorReceipt.find(receiptFilter).distinct("_id");
    if (receiptIds.length) {
      const ids = await VendorReceiptCatalog.distinct("ID", {
        company: company._id,
        vendorReceipt: { $in: receiptIds }
      });
      ids.forEach(id => inUseSet.add(Number(id)));
    }

    // 3) Split master catalogs
    const inUseItems = [];
    const unusedItems = [];

    for (const c of masterCatalogs) {
      if (inUseSet.has(Number(c.ID))) inUseItems.push(c);
      else unusedItems.push(c);
    }

    // 4) Pagination
    const p = Number(page);
    const ps = Number(pageSize);
    const startIdx = (p - 1) * ps;
    const endIdx = startIdx + ps;

    res.json({
      inUseCount: inUseItems.length,
      unusedCount: unusedItems.length,
      inUseItems: inUseItems.slice(startIdx, endIdx),
      unusedItems: unusedItems.slice(startIdx, endIdx)
    });
  } catch (err) {
    console.error("Error in usageAnalysis:", err);
    next(err);
  }
};


const archiveUnused = async (req, res, next) => {
  const { companyID, unusedIDs, dateStamp } = req.body; // dateStamp e.g., '250912'
  try {
    const company = await Company.findOne({ ID: companyID });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      // Development mode: Update MongoDB only
      const updatePromises = unusedIDs.map(async id => {
        const catalog = await Catalog.findOne({ ID: id, company: company._id });
        if (catalog) {
          return Catalog.findOneAndUpdate(
            { ID: id, company: company._id },
            {
              $set: { Archived: true },
              $set: { Name: `${catalog.Name} (ARCHIVED)` }, // Append to existing Name
              $set: { Notes: `${catalog.Notes || ''} (ARCHIVED-${dateStamp})` } // Append to existing Notes
            },
            { new: true }
          );
        }
      });
      await Promise.all(updatePromises);
      res.json({ message: 'Archived in MongoDB for testing' });
    } else {
      // Production mode: Make API calls to Simpro
      const tasks = unusedIDs.map(id => limit(() => fetch(`${process.env.SIMPRO_API_URL}/companies/${companyID}/catalogs/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${process.env.SIMPRO_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Name: `${catalog.Name} (ARCHIVED)`, // Use fetched catalog data
          Notes: `${catalog.Notes || ''} (ARCHIVED-${dateStamp})`,
          Archived: true
        })
      })));
      await Promise.all(tasks);
      await Catalog.updateMany({ ID: { $in: unusedIDs }, company: company._id }, { Archived: true });
      res.json({ message: 'Archived successfully' });
    }
  } catch (err) {
    next(err);
  }
};

const cleanupGroups = async (req, res, next) => {
  const { companyID } = req.query;
  try {
    const company = await Company.findOne({ ID: companyID });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const groups = await CatalogGroup.find({ company: company._id });
    const emptyGroups = [];
    for (const group of groups) {
      const items = await Catalog.find({ Group: group.ID, Archived: false });
      if (items.length === 0) emptyGroups.push(group.ID);
    }

    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      // Development mode: Delete from MongoDB only
      await CatalogGroup.deleteMany({ ID: { $in: emptyGroups } });
      res.json({ message: 'Empty groups cleaned in MongoDB for testing' });
    } else {
      // Production mode: Make API calls to Simpro
      const tasks = emptyGroups.map(id => limit(() => fetch(`${process.env.SIMPRO_API_URL}/companies/${companyID}/catalogGroups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.SIMPRO_API_KEY}` }
      })));
      await Promise.all(tasks);
      await CatalogGroup.deleteMany({ ID: { $in: emptyGroups } });
      res.json({ message: 'Empty groups cleaned' });
    }
  } catch (err) {
    next(err);
  }
};

export { getUsageAnalysis, archiveUnused, cleanupGroups };