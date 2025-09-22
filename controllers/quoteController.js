import Company from '../models/company.js';
import Quote from '../models/quote.js';
import QuoteCostCenter from '../models/quoteCostCenter.js';
import QuoteCostCenterCatalog from '../models/quoteCostCenterCatalog.js';

const getQuotes = async (req, res, next) => {
  const companyID = req.query.companyID;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  if (!companyID) {
    const error = new Error('Company ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!startDate || !endDate) {
    const error = new Error('Start date and end date are required');
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const quotesArr = await Quote.find({ company: companyDoc._id, DateIssued: { $gte: start, $lte: end } }).select(
      '-_id -__v -company'
    );
    res.status(200).json({ message: 'Quotes List', quotes: quotesArr });
  } catch (err) {
    next(err);
  }
};

const getQuoteCatalogs = async (req, res, next) => {
  const { companyID, startDate, endDate, page, pageSize } = req.query;

  // Validate required query parameters
  if (!companyID || !startDate || !endDate) {
    return res.status(400).json({ message: "companyID, startDate, and endDate are required" });
  }

  try {
    // Find the company
    const companyDoc = await Company.findOne({ ID: companyID });
    if (!companyDoc) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Set date range boundaries
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Determine if pagination should be applied
    const usePagination = page && pageSize && !isNaN(Number(page)) && !isNaN(Number(pageSize)) && Number(page) >= 1 && Number(pageSize) >= 1;
    const skip = usePagination ? (Number(page) - 1) * Number(pageSize) : 0;
    const limit = usePagination ? Number(pageSize) : 0;

    // 1. Get quotes in date range
    const quotes = await Quote.find({
      company: companyDoc._id,
      DateIssued: { $gte: start, $lte: end }
    }).select("_id ID DateIssued");

    if (!quotes.length) {
      return res.status(200).json({ 
        message: "No quotes found in date range", 
        count: 0,
        quoteCatalogs: [] 
      });
    }

    const quoteIds = quotes.map((q) => q.ID);

    // 2. Get cost centers linked to those quotes
    const costCenters = await QuoteCostCenter.find({
      company: companyDoc._id,
      "Quote.ID": { $in: quoteIds }
    }).select("_id ID Name Quote");

    if (!costCenters.length) {
      return res.status(200).json({ 
        message: "No quote cost centers found", 
        count: 0,
        quoteCatalogs: [] 
      });
    }

    const costCenterIds = costCenters.map((cc) => cc._id);

    // 3. Get catalog items linked to cost centers
    let quoteCatalogQuery = QuoteCostCenterCatalog.find({
      company: companyDoc._id,
      QuoteCostCenterID: { $in: costCenterIds }
    })
      .select("Catalog Quantity DisplayOrder QuoteCostCenterID")
      .populate({
        path: "QuoteCostCenterID",
        select: "ID Name Quote"
      });
    
    if (usePagination) {
      quoteCatalogQuery = quoteCatalogQuery.skip(skip).limit(limit);
    }

    const quoteCatalogs = await quoteCatalogQuery;
    const quoteCatalogCount = await QuoteCostCenterCatalog.countDocuments({
      company: companyDoc._id,
      QuoteCostCenterID: { $in: costCenterIds }
    });

    // Build response object
    const response = {
      message: quoteCatalogCount === 0 ? "No quote catalogs found" : "Quote Catalogs List",
      count: quoteCatalogCount,
      quoteCatalogs
    };

    // Add pagination metadata if pagination is used
    if (usePagination) {
      const totalPages = Math.ceil(quoteCatalogCount / Number(pageSize));
      response.pageNo = Number(page);
      response.pageSize = Number(pageSize);
      response.totalPages = totalPages;
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getQuoteCatalogs:', err);
    next(err);
  }
};


export { getQuotes, getQuoteCatalogs };
