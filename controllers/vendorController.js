import Company from '../models/company.js';
import VendorOrder from '../models/vendorOrder.js';
import VendorOrderCatalog from '../models/vendorOrderCatalog.js';
import VendorReceipt from '../models/vendorReceipt.js';
import VendorReceiptCatalog from '../models/vendorReceiptCatalog.js';

const getVendorCatalogs = async (req, res, next) => {
  const { companyID, startDate, endDate, page, pageSize } = req.query;

  // Log input parameters
  console.log('Input parameters:', { companyID, startDate, endDate, page, pageSize });

  // Validate required inputs
  if (!companyID) {
    return res.status(400).json({ message: 'companyID is required' });
  }

  // Basic date validation
  let parsedStartDate = null;
  let parsedEndDate = null;
  if (startDate && endDate) {
    parsedStartDate = new Date(startDate);
    parsedEndDate = new Date(endDate);
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime()) || parsedStartDate > parsedEndDate) {
      return res.status(400).json({ message: 'Invalid startDate or endDate' });
    }
  }

  // Determine if pagination should be applied
  const usePagination = page && pageSize && !isNaN(Number(page)) && !isNaN(Number(pageSize)) && Number(page) >= 1 && Number(pageSize) >= 1;
  const skip = usePagination ? (Number(page) - 1) * Number(pageSize) : 0;
  const limit = usePagination ? Number(pageSize) : 0;

  try {
    // Find the company
    const companyDoc = await Company.findOne({ ID: companyID });
    if (!companyDoc) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // --- Step 1: Filter Vendor Receipts by date range (if provided)
    const receiptFilter = { company: companyDoc._id };
    if (parsedStartDate && parsedEndDate) {
      // Note: DateIssued is String; this does lexical comparison. Consider schema change to Date.
      receiptFilter.DateIssued = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const receiptIds = await VendorReceipt.distinct('_id', receiptFilter).lean();
    const vendorOrderIdsFromReceipts = await VendorReceipt.distinct('vendorOrder', receiptFilter).lean();

    // --- Step 2: Filter Vendor Orders (linked to filtered receipts + stage check)
    const orderFilter = {
      company: companyDoc._id,
      _id: { $in: vendorOrderIdsFromReceipts },
      Stage: { $nin: ['Archived', 'Voided'] }
    };
    const orderIds = await VendorOrder.distinct('_id', orderFilter).lean();

    // --- Step 3: Fetch Receipt Catalogs (filtered by receipt IDs)
    let receiptCatalogQuery = VendorReceiptCatalog.find({
      company: companyDoc._id,
      vendorReceipt: { $in: receiptIds }
    }).populate('vendorReceipt vendorOrder', 'ID VendorInvoiceNo DateIssued Reference');
    
    if (usePagination) {
      receiptCatalogQuery = receiptCatalogQuery.skip(skip).limit(limit);
    }

    const receiptCatalogs = await receiptCatalogQuery;
    const receiptCatalogCount = await VendorReceiptCatalog.countDocuments({
      company: companyDoc._id,
      vendorReceipt: { $in: receiptIds }
    });

    // --- Step 4: Fetch Order Catalogs (filtered by order IDs)
    let orderCatalogQuery = VendorOrderCatalog.find({
      company: companyDoc._id,
      vendorOrder: { $in: orderIds }
    }).populate('vendorOrder', 'ID Reference Stage');
    
    if (usePagination) {
      orderCatalogQuery = orderCatalogQuery.skip(skip).limit(limit);
    }

    const orderCatalogs = await orderCatalogQuery;
    const orderCatalogCount = await VendorOrderCatalog.countDocuments({
      company: companyDoc._id,
      vendorOrder: { $in: orderIds }
    });
    const totalCount = receiptCatalogCount + orderCatalogCount;
    // Build response object
    const response = {
      message: (receiptCatalogCount === 0 && orderCatalogCount === 0) ? 'No vendor catalogs found' : 'Vendor Catalogs List',
      ordersCount: orderCatalogCount,
      receiptsCount: receiptCatalogCount,
      totalCount: totalCount,
      orderCatalogs,
      receiptCatalogs
    };

    // Add pagination metadata if pagination is used
    if (usePagination) {
      const totalPages = Math.ceil(totalCount / Number(pageSize));
      response.pageNo = Number(page);
      response.pageSize = Number(pageSize);
      response.totalPages = totalPages;
    }

    res.json(response);
  } catch (err) {
    console.error('Error in getVendorCatalogs:', err);
    next(err);
  }
};

export { getVendorCatalogs };
