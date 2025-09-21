import mongoose from "mongoose";
import QuoteCostCenterCatalog from "../models/quoteCostCenterCatalog.js";
import VendorOrderCatalog from "../models/vendorOrderCatalog.js";
import VendorReceiptCatalog from "../models/vendorReceiptCatalog.js";
import pLimit from 'p-limit';
import Catalog from '../models/catalog.js';
import Prebuild from '../models/prebuild.js';
import QuoteCostCenter from '../models/quoteCostCenter.js';
import PrebuildCatalog from '../models/prebuildCatalog.js';
import Company from '../models/company.js';
import Quote from '../models/quote.js';
import VendorReceipt from '../models/vendorReceipt.js';
import VendorOrder from '../models/vendorOrder.js';
import CatalogGroup from '../models/catalogGroup.js';
import Job from '../models/job.js';
import JobCostCenter from '../models/jobCostCenter.js';
import JobCostCenterCatalog from '../models/jobCostCenterCatalog.js';
import dotenv from 'dotenv'; // Import dotenv at the top

// Load .env file only in development
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  dotenv.config();
}

const limit = pLimit(2);

const getActiveCatalogs = async (req, res, next) => {
  const { companyID, startDate, endDate, page, pageSize } = req.query;

  // Validate required inputs
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!companyID || !startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    const error = new Error('companyID, startDate, and endDate (YYYY-MM-DD) are required');
    error.statusCode = 400;
    return next(error);
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID }).lean();
    if (!companyDoc) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      return next(error);
    }

    const companyId = companyDoc._id;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
      const error = new Error('Invalid date format for startDate or endDate');
      error.statusCode = 400;
      return next(error);
    }
    end.setHours(23, 59, 59, 999);

    // Determine if pagination should be applied
    const usePagination = page && pageSize && !isNaN(Number(page)) && !isNaN(Number(pageSize)) && Number(page) >= 1 && Number(pageSize) >= 1;
    const skip = usePagination ? (Number(page) - 1) * Number(pageSize) : 0;
    const limit = usePagination ? Number(pageSize) : 0;

    // 1. Prebuilds
    const prebuildIds = await Prebuild.distinct('_id', { company: companyId, Archived: false }).lean();
    const prebuildCatalogIds = new Set(
      await PrebuildCatalog.distinct('Catalog.ID', { company: companyId, prebuild: { $in: prebuildIds } }).lean()
    );
    console.log('Prebuild Catalog IDs:', prebuildCatalogIds);

    // 2. Quotes
    const quoteFilter = { company: companyId, $or: [{ IsClosed: false }, { DateIssued: { $gte: start, $lte: end } }] };
    const quoteIds = await Quote.distinct('ID', quoteFilter).lean();
    const quoteCatalogIds = new Set(
      await QuoteCostCenterCatalog.distinct('Catalog.ID', {
        company: companyId,
        QuoteCostCenterID: { $in: await QuoteCostCenter.distinct('_id', { company: companyId, 'Quote.ID': { $in: quoteIds } }).lean() }
      }).lean()
    );
    console.log('Quote Catalog IDs:', quoteCatalogIds);

    // 3. Purchases/Supplier Invoices
    const receiptFilter = { company: companyId, DateIssued: { $gte: startDate, $lte: endDate } };
    const receiptIds = await VendorReceipt.distinct('_id', receiptFilter).lean();
    const receiptCatalogIds = new Set(
      await VendorReceiptCatalog.distinct('ID', { company: companyId, vendorReceipt: { $in: receiptIds } }).lean()
    );
    console.log('Receipt Catalog IDs:', receiptCatalogIds);

    const orderIds = await VendorOrder.distinct('_id', {
      company: companyId,
      _id: { $in: await VendorReceipt.distinct('vendorOrder', receiptFilter).lean() },
      Stage: { $nin: ['Archived', 'Voided'] }
    }).lean();
    const orderCatalogIds = new Set(
      await VendorOrderCatalog.distinct('Catalog.ID', { company: companyId, vendorOrder: { $in: orderIds } }).lean()
    );
    console.log('Order Catalog IDs:', orderCatalogIds);

    const supplierCatalogIds = new Set([...receiptCatalogIds, ...orderCatalogIds]);
    console.log('Supplier Catalog IDs:', supplierCatalogIds);

    // 4. Jobs
    const jobFilter = {
      company: companyId,
      Stage: { $ne: 'Archived' },
      DateIssued: { $gte: start, $lte: end }
    };
    const jobIds = await Job.distinct('ID', jobFilter).lean(); // Use Job.ID instead of _id
    console.log('Job IDs:', jobIds);

    const jobCostCenterIds = await JobCostCenter.distinct('_id', {
      company: companyId,
      'Job.ID': { $in: jobIds }
    }).lean();
    console.log('Job Cost Center IDs:', jobCostCenterIds);

    const jobCatalogIds = new Set(
      await JobCostCenterCatalog.distinct('Catalog.ID', {
        jobCostCenter: { $in: jobCostCenterIds }
      }).lean()
    );
    console.log('Job Catalog IDs:', jobCatalogIds);

    // Combine all catalog IDs
    const allCatalogIds = Array.from(new Set([
      ...prebuildCatalogIds,
      ...quoteCatalogIds,
      ...supplierCatalogIds,
      ...jobCatalogIds
    ])).filter(id => id != null);
    if (allCatalogIds.length === 0) {
      return res.status(200).json({
        message: 'No catalog IDs found for the given criteria',
        activeCatalogCount: 0,
        prebuildCatalogCount: 0,
        quoteCatalogCount: 0,
        supplierCatalogCount: 0,
        jobCatalogCount: 0,
        archivedCatalogCount: 0,
        activeCatalogs: [],
        prebuildCatalogs: [],
        quoteCatalogs: [],
        supplierCatalogs: [],
        jobCatalogs: []
      });
    }

    // Debug: Check catalog existence with Archived field
    const foundCatalogs = await Catalog.find({ company: companyId, ID: { $in: allCatalogIds } })
      .select('ID company Archived')
      .lean();
    console.log('Found Catalogs for IDs:', foundCatalogs.map(c => ({ ID: c.ID, Archived: c.Archived })));

    // Debug: Count catalogs by Archived status
    const archivedCount = await Catalog.countDocuments({ company: companyId, ID: { $in: allCatalogIds }, Archived: true });
    const nonArchivedCount = await Catalog.countDocuments({ company: companyId, ID: { $in: allCatalogIds }, Archived: false });
    const nullArchivedCount = await Catalog.countDocuments({ company: companyId, ID: { $in: allCatalogIds }, $or: [{ Archived: null }, { Archived: { $exists: false } }] });
    console.log('Catalog Counts - Archived: true:', archivedCount, 'Archived: false:', nonArchivedCount, 'Archived: null or missing:', nullArchivedCount);

    // Fetch catalog documents, treating undefined or null Archived as active
    let activeCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: allCatalogIds },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      activeCatalogQuery = activeCatalogQuery.skip(skip).limit(limit);
    }
    const activeCatalogs = await activeCatalogQuery;
    const activeCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: allCatalogIds },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });

    let prebuildCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: Array.from(prebuildCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      prebuildCatalogQuery = prebuildCatalogQuery.skip(skip).limit(limit);
    }
    const prebuildCatalogs = await prebuildCatalogQuery;
    const prebuildCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: Array.from(prebuildCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });

    let quoteCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: Array.from(quoteCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      quoteCatalogQuery = quoteCatalogQuery.skip(skip).limit(limit);
    }
    const quoteCatalogs = await quoteCatalogQuery;
    const quoteCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: Array.from(quoteCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });

    let supplierCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: Array.from(supplierCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      supplierCatalogQuery = supplierCatalogQuery.skip(skip).limit(limit);
    }
    const supplierCatalogs = await supplierCatalogQuery;
    const supplierCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: Array.from(supplierCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });

    // Job Catalogs
    let jobCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: Array.from(jobCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      jobCatalogQuery = jobCatalogQuery.skip(skip).limit(limit);
    }
    const jobCatalogs = await jobCatalogQuery;
    const jobCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: Array.from(jobCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });

    // Debug: Check archived catalogs
    const archivedCatalogs = await Catalog.find({
      company: companyId,
      ID: { $in: allCatalogIds },
      Archived: true
    })
      .select('ID')
      .lean();
    console.log('Archived Catalogs:', archivedCatalogs.length, archivedCatalogs.map(c => c.ID));

    res.status(200).json({
      message: activeCatalogCount === 0 ? 'No active catalogs found, check if catalogs are archived' : 'Active catalogs retrieved successfully',
      activeCatalogCount,
      prebuildCatalogCount,
      quoteCatalogCount,
      supplierCatalogCount,
      jobCatalogCount,
      archivedCatalogCount: archivedCatalogs.length,
      activeCatalogs,
      prebuildCatalogs,
      quoteCatalogs,
      supplierCatalogs,
      jobCatalogs
    });
  } catch (err) {
    console.error('Error in getActiveCatalogs:', err);
    next(err);
  }
};

const getUsageAnalysis = async (req, res, next) => {
  try {
    const { companyID, startDate, endDate, page, pageSize } = req.query;

    // Validate required inputs
    if (!companyID || !startDate || !endDate) {
      return res.status(400).json({ message: 'companyID, startDate, and endDate are required' });
    }

    // Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (isNaN(start) || isNaN(end) || start > end) {
      return res.status(400).json({ message: 'Invalid startDate or endDate' });
    }

    // Determine if pagination should be applied
    const usePagination = page && pageSize && !isNaN(Number(page)) && !isNaN(Number(pageSize)) && Number(page) >= 1 && Number(pageSize) >= 1;
    const skip = usePagination ? (Number(page) - 1) * Number(pageSize) : 0;
    const limit = usePagination ? Number(pageSize) : 0;

    // Find the company
    const company = await Company.findOne({ ID: companyID }).lean();
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // 1) Fetch non-archived catalogs within the date range
    const catalogQuery = {
      company: company._id,
      DateModified: { $gte: start, $lte: end },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    };
    let masterCatalogQuery = Catalog.find(catalogQuery)
      .select('ID PartNo Name Group Archived DateModified')
      .lean();
    if (usePagination) {
      masterCatalogQuery = masterCatalogQuery.skip(skip).limit(limit);
    }
    const masterCatalogs = await masterCatalogQuery;
    const totalActiveCount = await Catalog.countDocuments(catalogQuery);
    console.log('Total active catalogs:', totalActiveCount);

    // 2) Collect in-use catalog IDs
    const inUseSet = new Set();

    // --- Quotes ---
    const quoteFilter = {
      company: company._id,
      $or: [{ IsClosed: false }, { DateIssued: { $gte: start, $lte: end } }]
    };
    const quoteIds = await Quote.distinct('ID', quoteFilter).lean();
    if (quoteIds.length) {
      const quoteCostCenterIds = await QuoteCostCenter.distinct('_id', {
        company: company._id,
        'Quote.ID': { $in: quoteIds }
      }).lean();
      const ids = await QuoteCostCenterCatalog.distinct('Catalog.ID', {
        company: company._id,
        QuoteCostCenterID: { $in: quoteCostCenterIds }
      }).lean();
      ids.forEach(id => inUseSet.add(Number(id)));
    }
    console.log('Quote Catalog IDs:', inUseSet.size);

    // --- Jobs ---
    const jobFilter = {
      company: company._id,
      DateIssued: { $gte: start, $lte: end },
      Stage: { $nin: ['Archived'] }
    };
    const jobIds = await Job.distinct('ID', jobFilter).lean();
    if (jobIds.length) {
      const jobCostCenterIds = await JobCostCenter.distinct('_id', {
        company: company._id,
        'Job.ID': { $in: jobIds }
      }).lean();
      const ids = await JobCostCenterCatalog.distinct('Catalog.ID', {
        company: company._id,
        jobCostCenter: { $in: jobCostCenterIds }
      }).lean();
      ids.forEach(id => inUseSet.add(Number(id)));
    }
    console.log('Job Catalog IDs:', inUseSet.size);

    // --- Prebuilds ---
    const prebuildIds = await Prebuild.distinct('_id', {
      company: company._id,
      Archived: false
    }).lean();
    if (prebuildIds.length) {
      const ids = await PrebuildCatalog.distinct('Catalog.ID', {
        company: company._id,
        prebuild: { $in: prebuildIds }
      }).lean();
      ids.forEach(id => inUseSet.add(Number(id)));
    }
    console.log('Prebuild Catalog IDs:', inUseSet.size);

    // --- Vendor/Supplier Orders and Receipts ---
    const receiptFilter = {
      company: company._id,
      DateIssued: { $gte: startDate, $lte: endDate } // String comparison
    };
    const receiptIds = await VendorReceipt.distinct('_id', receiptFilter).lean();
    const vendorOrderIdsFromReceipts = await VendorReceipt.distinct('vendorOrder', receiptFilter).lean();
    const orderFilter = {
      company: company._id,
      _id: { $in: vendorOrderIdsFromReceipts },
      Stage: { $nin: ['Archived', 'Voided'] }
    };
    const orderIds = await VendorOrder.distinct('_id', orderFilter).lean();

    const receiptCatalogIds = new Set(
      await VendorReceiptCatalog.distinct('Catalog.ID', {
        company: company._id,
        vendorReceipt: { $in: receiptIds }
      }).lean()
    );
    const orderCatalogIds = new Set(
      await VendorOrderCatalog.distinct('Catalog.ID', {
        company: company._id,
        vendorOrder: { $in: orderIds }
      }).lean()
    );
    const supplierCatalogIds = new Set([...receiptCatalogIds, ...orderCatalogIds]);
    supplierCatalogIds.forEach(id => inUseSet.add(Number(id)));
    console.log('Supplier Catalog IDs:', supplierCatalogIds.size);

    // 3) Split master catalogs into in-use and to-be-archived
    const inUseItems = [];
    const toBeArchivedItems = [];
    for (const catalog of masterCatalogs) {
      if (inUseSet.has(Number(catalog.ID))) {
        inUseItems.push(catalog);
      } else {
        toBeArchivedItems.push(catalog);
      }
    }

    // 4) Calculate counts and percentages
    const inUseCount = inUseItems.length;
    const toBeArchivedCount = toBeArchivedItems.length;
    const inUsePercentage = totalActiveCount > 0 ? ((inUseCount / totalActiveCount) * 100).toFixed(2) : 0;
    const toBeArchivedPercentage = totalActiveCount > 0 ? ((toBeArchivedCount / totalActiveCount) * 100).toFixed(2) : 0;

    // 5) Apply pagination to in-use and to-be-archived lists
    let paginatedInUseItems = inUseItems;
    let paginatedToBeArchivedItems = toBeArchivedItems;
    if (usePagination) {
      paginatedInUseItems = inUseItems.slice(skip, skip + limit);
      paginatedToBeArchivedItems = toBeArchivedItems.slice(skip, skip + limit);
    }

    // 6) Build response
    const response = {
      message: totalActiveCount === 0 ? 'No active catalogs found' : 'Catalog Usage Analysis',
      totalActiveCount,
      inUseCount,
      toBeArchivedCount,
      inUsePercentage: Number(inUsePercentage),
      toBeArchivedPercentage: Number(toBeArchivedPercentage),
      inUseItems: paginatedInUseItems,
      toBeArchivedItems: paginatedToBeArchivedItems
    };

    // Add pagination metadata if pagination is used
    if (usePagination) {
      response.pageNo = Number(page);
      response.pageSize = Number(pageSize);
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getUsageAnalysis:', err);
    next(err);
  }
};

const archiveAndGroupCleanup = async (req, res, next) => {
  const { companyID, catalogIDs } = req.body;

  if (!companyID || !Array.isArray(catalogIDs) || catalogIDs.length === 0) {
    return res.status(400).json({ message: "companyID and catalogIDs (non-empty array) are required" });
  }

  try {
    const company = await Company.findOne({ ID: companyID });
    if (!company) return res.status(404).json({ message: "Company not found" });

    // --- ARCHIVE CATALOG ITEMS ---
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateSuffix = `${yy}${mm}${dd}`;

    const result = await Catalog.updateMany(
      { company: company._id, ID: { $in: catalogIDs }, Archived: { $ne: true } },
      [
        {
          $set: {
            Archived: true,
            Name: { $concat: ["$Name", " (ARCHIVED)"] },
            Notes: {
              $cond: {
                if: { $ifNull: ["$Notes", false] },
                then: { $concat: ["$Notes", ` (ARCHIVED-${dateSuffix})`] },
                else: `(ARCHIVED-${dateSuffix})`
              }
            }
          }
        }
      ]
    );

    // --- CLEANUP EMPTY GROUPS ---
    const groups = await CatalogGroup.find({ company: company._id });
    const emptyGroups = [];

    for (const group of groups) {
      const activeItems = await Catalog.find({ "Group.ID": group.ID, company: company._id, Archived: false });
      if (activeItems.length === 0) {
        emptyGroups.push(group.ID);
      }
    }

    if (emptyGroups.length > 0) {
      await CatalogGroup.deleteMany({ ID: { $in: emptyGroups }, company: company._id });
    }

    res.status(200).json({
      message: "Archiving and cleanup completed",
      archivedCount: result.modifiedCount,
      removedGroups: emptyGroups
    });

  } catch (err) {
    next(err);
  }
};



export { getUsageAnalysis, getActiveCatalogs, archiveAndGroupCleanup };