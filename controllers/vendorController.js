import Company from '../models/company.js';
import VendorOrder from '../models/vendorOrder.js';
import VendorOrderCatalog from '../models/vendorOrderCatalog.js';
import VendorReceipt from '../models/vendorReceipt.js';
import VendorReceiptCatalog from '../models/vendorReceiptCatalog.js';

const getVendorCatalogs = async (req, res, next) => {
  const { companyID, startDate, endDate } = req.query;

  if (!companyID) return res.status(400).json({ message: 'companyID is required' });

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    if (!companyDoc) return res.status(404).json({ message: 'Company not found' });

    // --- Vendor Receipts (apply date filter here)
    const receiptFilter = { company: companyDoc._id };
    if (startDate && endDate) {
      receiptFilter.DateIssued = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const receipts = await VendorReceipt.find(receiptFilter).select('_id ID VendorInvoiceNo DateIssued vendorOrder');
    const receiptIds = receipts.map(r => r._id);

    const receiptCatalogs = await VendorReceiptCatalog.find({
      company: companyDoc._id,
      vendorReceipt: { $in: receiptIds }
    }).populate('vendorReceipt vendorOrder', 'ID VendorInvoiceNo DateIssued Reference');

    // --- Vendor Orders + Catalogs
    const orders = await VendorOrder.find({ company: companyDoc._id }).select('_id ID Reference Stage');
    const orderIds = orders.map(o => o._id);

    const orderCatalogs = await VendorOrderCatalog.find({
      company: companyDoc._id,
      vendorOrder: { $in: orderIds }
    }).populate('vendorOrder', 'ID Reference Stage');

    res.json({
      message: 'Vendor Catalogs List',
      ordersCount: orderCatalogs.length,
      receiptsCount: receiptCatalogs.length,
      orderCatalogs,
      receiptCatalogs
    });
  } catch (err) {
    next(err);
  }
};

export { getVendorCatalogs };
