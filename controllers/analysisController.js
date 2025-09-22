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
    const pageNo = usePagination ? Number(page) : 1;
    const pageSizeNum = usePagination ? Number(pageSize) : 0;
    const skip = usePagination ? (pageNo - 1) * pageSizeNum : 0;
    const limit = usePagination ? pageSizeNum : 0;

    // 1. Prebuilds
    const prebuildIds = await Prebuild.distinct('_id', { company: companyId, Archived: false }).lean();
    const prebuildCatalogIds = new Set(
      await PrebuildCatalog.distinct('Catalog.ID', { company: companyId, prebuild: { $in: prebuildIds } }).lean()
    );

    // 2. Quotes
    const quoteFilter = { company: companyId, $or: [{ IsClosed: false }, { DateIssued: { $gte: start, $lte: end } }] };
    const quoteIds = await Quote.distinct('ID', quoteFilter).lean();
    const quoteCatalogIds = new Set(
      await QuoteCostCenterCatalog.distinct('Catalog.ID', {
        company: companyId,
        QuoteCostCenterID: { $in: await QuoteCostCenter.distinct('_id', { company: companyId, 'Quote.ID': { $in: quoteIds } }).lean() }
      }).lean()
    );

    // 3. Purchases/Supplier Invoices
    const receiptFilter = { company: companyId, DateIssued: { $gte: startDate, $lte: endDate } };
    const receiptIds = await VendorReceipt.distinct('_id', receiptFilter).lean();
    const receiptCatalogIds = new Set(
      await VendorReceiptCatalog.distinct('ID', { company: companyId, vendorReceipt: { $in: receiptIds } }).lean()
    );

    const orderIds = await VendorOrder.distinct('_id', {
      company: companyId,
      _id: { $in: await VendorReceipt.distinct('vendorOrder', receiptFilter).lean() },
      Stage: { $nin: ['Archived', 'Voided'] }
    }).lean();
    const orderCatalogIds = new Set(
      await VendorOrderCatalog.distinct('Catalog.ID', { company: companyId, vendorOrder: { $in: orderIds } }).lean()
    );

    const supplierCatalogIds = new Set([...receiptCatalogIds, ...orderCatalogIds]);

    // 4. Jobs
    const jobFilter = {
      company: companyId,
      Stage: { $ne: 'Archived' },
      DateIssued: { $gte: start, $lte: end }
    };
    const jobIds = await Job.distinct('ID', jobFilter).lean();
    const jobCostCenterIds = await JobCostCenter.distinct('_id', {
      company: companyId,
      'Job.ID': { $in: jobIds }
    }).lean();
    const jobCatalogIds = new Set(
      await JobCostCenterCatalog.distinct('Catalog.ID', {
        jobCostCenter: { $in: jobCostCenterIds }
      }).lean()
    );

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

    // Fetch catalog counts
    const activeCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: allCatalogIds },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });
    const prebuildCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: Array.from(prebuildCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });
    const quoteCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: Array.from(quoteCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });
    const supplierCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: Array.from(supplierCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });
    const jobCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: Array.from(jobCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    });
    const archivedCatalogCount = await Catalog.countDocuments({
      company: companyId,
      ID: { $in: allCatalogIds },
      Archived: true
    });

    // Fetch catalog documents
    let activeCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: allCatalogIds },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      activeCatalogQuery = activeCatalogQuery.skip(skip).limit(limit);
    }
    const activeCatalogs = await activeCatalogQuery;

    let prebuildCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: Array.from(prebuildCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      prebuildCatalogQuery = prebuildCatalogQuery.skip(skip).limit(limit);
    }
    const prebuildCatalogs = await prebuildCatalogQuery;

    let quoteCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: Array.from(quoteCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      quoteCatalogQuery = quoteCatalogQuery.skip(skip).limit(limit);
    }
    const quoteCatalogs = await quoteCatalogQuery;

    let supplierCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: Array.from(supplierCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      supplierCatalogQuery = supplierCatalogQuery.skip(skip).limit(limit);
    }
    const supplierCatalogs = await supplierCatalogQuery;

    let jobCatalogQuery = Catalog.find({
      company: companyId,
      ID: { $in: Array.from(jobCatalogIds) },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      jobCatalogQuery = jobCatalogQuery.skip(skip).limit(limit);
    }
    const jobCatalogs = await jobCatalogQuery;

    // Prepare response with pagination details
    const response = {
      message: activeCatalogCount === 0 ? 'No active catalogs found, check if catalogs are archived' : 'Active catalogs retrieved successfully',
      activeCatalogCount,
      prebuildCatalogCount,
      quoteCatalogCount,
      supplierCatalogCount,
      jobCatalogCount,
      archivedCatalogCount,
      activeCatalogs: {
        data: activeCatalogs
      },
      prebuildCatalogs: {
        data: prebuildCatalogs
      },
      quoteCatalogs: {
        data: quoteCatalogs
      },
      supplierCatalogs: {
        data: supplierCatalogs
      },
      jobCatalogs: {
        data: jobCatalogs
      }
    };

    // Add pagination details if pagination is applied
    if (usePagination) {
      response.activeCatalogs.pagination = {
        pageNo,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(activeCatalogCount / pageSizeNum)
      };
      response.prebuildCatalogs.pagination = {
        pageNo,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(prebuildCatalogCount / pageSizeNum)
      };
      response.quoteCatalogs.pagination = {
        pageNo,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(quoteCatalogCount / pageSizeNum)
      };
      response.supplierCatalogs.pagination = {
        pageNo,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(supplierCatalogCount / pageSizeNum)
      };
      response.jobCatalogs.pagination = {
        pageNo,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(jobCatalogCount / pageSizeNum)
      };
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getActiveCatalogs:', err);
    next(err);
  }
};

const getUsageAnalysis = async (req, res, next) => {
  try {
    const { companyID, startDate, endDate, page, pageSize } = req.query;

    // Validate required inputs
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!companyID || !startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ message: 'companyID, startDate, and endDate (YYYY-MM-DD) are required' });
    }

    // Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (isNaN(start) || isNaN(end) || start > end) {
      return res.status(400).json({ message: 'Invalid startDate or endDate' });
    }

    // Find the company
    const company = await Company.findOne({ ID: companyID }).lean();
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    const companyId = company._id;

    // Determine if pagination should be applied
    const usePagination = page && pageSize && !isNaN(Number(page)) && !isNaN(Number(pageSize)) && Number(page) >= 1 && Number(pageSize) >= 1;
    const pageNo = usePagination ? Number(page) : 1;
    const pageSizeNum = usePagination ? Number(pageSize) : 0;
    const skip = usePagination ? (pageNo - 1) * pageSizeNum : 0;
    const limit = usePagination ? pageSizeNum : 0;

    // Base catalog query for active catalogs in date range
    const catalogQuery = {
      company: companyId,
      DateModified: { $gte: start, $lte: end },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    };

    // Get total active count
    const totalActiveCount = await Catalog.countDocuments(catalogQuery);

    // Collect in-use catalog IDs
    const inUseSet = new Set();

    // --- Quotes ---
    const quoteFilter = {
      company: companyId,
      $or: [{ IsClosed: false }, { DateIssued: { $gte: start, $lte: end } }]
    };
    const quoteIds = await Quote.distinct('ID', quoteFilter).lean();
    if (quoteIds.length) {
      const quoteCostCenterIds = await QuoteCostCenter.distinct('_id', {
        company: companyId,
        'Quote.ID': { $in: quoteIds }
      }).lean();
      const ids = await QuoteCostCenterCatalog.distinct('Catalog.ID', {
        company: companyId,
        QuoteCostCenterID: { $in: quoteCostCenterIds }
      }).lean();
      ids.forEach(id => inUseSet.add(Number(id)));
    }

    // --- Jobs ---
    const jobFilter = {
      company: companyId,
      DateIssued: { $gte: start, $lte: end },
      Stage: { $nin: ['Archived'] }
    };
    const jobIds = await Job.distinct('ID', jobFilter).lean();
    if (jobIds.length) {
      const jobCostCenterIds = await JobCostCenter.distinct('_id', {
        company: companyId,
        'Job.ID': { $in: jobIds }
      }).lean();
      const ids = await JobCostCenterCatalog.distinct('Catalog.ID', {
        company: companyId,
        jobCostCenter: { $in: jobCostCenterIds }
      }).lean();
      ids.forEach(id => inUseSet.add(Number(id)));
    }

    // --- Prebuilds ---
    const prebuildIds = await Prebuild.distinct('_id', {
      company: companyId,
      Archived: false
    }).lean();
    if (prebuildIds.length) {
      const ids = await PrebuildCatalog.distinct('Catalog.ID', {
        company: companyId,
        prebuild: { $in: prebuildIds }
      }).lean();
      ids.forEach(id => inUseSet.add(Number(id)));
    }

    // --- Vendor/Supplier Orders and Receipts ---
    const receiptFilter = {
      company: companyId,
      DateIssued: { $gte: start, $lte: end }
    };
    const receiptIds = await VendorReceipt.distinct('_id', receiptFilter).lean();
    const vendorOrderIdsFromReceipts = await VendorReceipt.distinct('vendorOrder', receiptFilter).lean();
    const orderFilter = {
      company: companyId,
      _id: { $in: vendorOrderIdsFromReceipts },
      Stage: { $nin: ['Archived', 'Voided'] }
    };
    const orderIds = await VendorOrder.distinct('_id', orderFilter).lean();

    const receiptCatalogIds = new Set(
      await VendorReceiptCatalog.distinct('Catalog.ID', {
        company: companyId,
        vendorReceipt: { $in: receiptIds }
      }).lean()
    );
    const orderCatalogIds = new Set(
      await VendorOrderCatalog.distinct('Catalog.ID', {
        company: companyId,
        vendorOrder: { $in: orderIds }
      }).lean()
    );
    const supplierCatalogIds = new Set([...receiptCatalogIds, ...orderCatalogIds]);
    supplierCatalogIds.forEach(id => inUseSet.add(Number(id)));

    // Convert inUseSet to array for queries
    const inUseIds = Array.from(inUseSet);

    // Calculate full counts
    const inUseCount = inUseIds.length > 0 ? await Catalog.countDocuments({
      ...catalogQuery,
      ID: { $in: inUseIds }
    }) : 0;
    const toBeArchivedCount = totalActiveCount - inUseCount;

    // Calculate percentages
    const inUsePercentage = totalActiveCount > 0 ? ((inUseCount / totalActiveCount) * 100).toFixed(2) : 0;
    const toBeArchivedPercentage = totalActiveCount > 0 ? ((toBeArchivedCount / totalActiveCount) * 100).toFixed(2) : 0;

    // Fetch paginated total active items
    let totalActiveQuery = Catalog.find(catalogQuery)
      .select('ID PartNo Name Group Archived DateModified')
      .lean();
    if (usePagination) {
      totalActiveQuery = totalActiveQuery.skip(skip).limit(limit);
    }
    const totalActiveItems = await totalActiveQuery;

    // Fetch paginated in-use items
    let inUseQuery = Catalog.find({
      ...catalogQuery,
      ID: { $in: inUseIds }
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      inUseQuery = inUseQuery.skip(skip).limit(limit);
    }
    const inUseItems = await inUseQuery;

    // Fetch paginated to-be-archived items
    let toBeArchivedQuery = Catalog.find({
      ...catalogQuery,
      ID: { $nin: inUseIds }
    }).select('ID PartNo Name Group Archived DateModified').lean();
    if (usePagination) {
      toBeArchivedQuery = toBeArchivedQuery.skip(skip).limit(limit);
    }
    const toBeArchivedItems = await toBeArchivedQuery;

    // Build response
    const response = {
      message: totalActiveCount === 0 ? 'No active catalogs found' : 'Catalog Usage Analysis',
      totalActiveCount,
      inUseCount,
      toBeArchivedCount,
      inUsePercentage: Number(inUsePercentage),
      toBeArchivedPercentage: Number(toBeArchivedPercentage),
      totalActiveItems: {
        data: totalActiveItems
      },
      inUseItems: {
        data: inUseItems
      },
      toBeArchivedItems: {
        data: toBeArchivedItems
      }
    };

    // Add pagination metadata if pagination is used
    if (usePagination) {
      response.totalActiveItems.pagination = {
        pageNo,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(totalActiveCount / pageSizeNum)
      };
      response.inUseItems.pagination = {
        pageNo,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(inUseCount / pageSizeNum)
      };
      response.toBeArchivedItems.pagination = {
        pageNo,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(toBeArchivedCount / pageSizeNum)
      };
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