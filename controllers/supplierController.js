import Company from '../models/company.js';
import VendorOrder from '../models/vendorOrder.js';
import VendorReceipt from '../models/vendorReceipt.js';

const getVendorOrders = async (req, res, next) => {
  const companyID = req.query.companyID;
  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const vendorOrdersArr = await VendorOrder.find({ company: companyDoc._id }).select('-__v -company -_id');
    res.status(200).json({ message: 'Vendor Orders List', vendorOrders: vendorOrdersArr });
  } catch (err) {
    next(err);
  }
};

const getVendorReceipts = async (req, res, next) => {
  const companyID = req.query.companyID;
  const vendorOrderID = req.query.vendorOrderID;
  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const vendorOrderDoc = await VendorOrder.findOne({ ID: vendorOrderID });
    const vendorReceiptsArr = await VendorReceipt.find({ company: companyDoc._id, vendorOrder: vendorOrderDoc._id });
    res.status(200).json({ message: 'Vendor Receipts List', vendorReceipts: vendorReceiptsArr });
  } catch (err) {
    next(err);
  }
};

export { getVendorOrders, getVendorReceipts };
