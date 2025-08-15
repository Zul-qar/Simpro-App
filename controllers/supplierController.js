import Company from '../models/company.js';
import VendorOrder from '../models/vendorOrder.js';
import VendorOrderCatalog from '../models/vendorOrderCatalog.js';
import VendorReceipt from '../models/vendorReceipt.js';
import VendorReceiptCatalog from '../models/vendorReceiptCatalog.js';

const getVendorOrders = async (req, res, next) => {
  const companyID = req.query.companyID;

  if (!companyID) {
    const error = new Error('Company ID is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const vendorOrdersArr = await VendorOrder.find({ company: companyDoc._id }).select('-__v -company -_id');
    res.status(200).json({ message: 'Vendor Orders List', vendorOrders: vendorOrdersArr });
  } catch (err) {
    next(err);
  }
};

const getVendorOrderCatalogs = async (req, res, next) => {
  const companyID = req.query.companyID;
  const vendorOrderID = req.query.vendorOrderID;

  if (!companyID || !vendorOrderID) {
    const error = new Error('Company ID and Vendor Order ID are required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const vendorOrderDoc = await VendorOrder.findOne({ ID: vendorOrderID, company: companyDoc._id });
    const vendorOrderCatalogsArr = await VendorOrderCatalog.find({ company: companyDoc._id, vendorOrder: vendorOrderDoc._id }).select(
      '-__v -company -_id'
    );
    res.status(200).json({ message: 'Vendor Order Catalogs List', vendorOrderCatalogs: vendorOrderCatalogsArr });
  } catch (err) {
    next(err);
  }
};

const getVendorReceipts = async (req, res, next) => {
  const companyID = req.query.companyID;
  const vendorOrderID = req.query.vendorOrderID;

  if (!companyID || !vendorOrderID) {
    const error = new Error('Company ID and Vendor Order ID are required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const vendorOrderDoc = await VendorOrder.findOne({ ID: vendorOrderID, company: companyDoc._id });
    const vendorReceiptsArr = await VendorReceipt.find({ company: companyDoc._id, vendorOrder: vendorOrderDoc._id }).select(
      '-__v -company -_id -vendorOrder'
    );
    res.status(200).json({ message: 'Vendor Receipts List', vendorReceipts: vendorReceiptsArr });
  } catch (err) {
    next(err);
  }
};

const getVendorReceiptCatalogs = async (req, res, next) => {
  const companyID = req.query.companyID;
  const vendorOrderID = req.query.vendorOrderID;
  const vendorReceiptID = req.query.vendorReceiptID;

  if (!companyID || !vendorOrderID || !vendorReceiptID) {
    const error = new Error('Company ID, Vendor Order ID, and Vendor Receipt ID are required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    console.log('Company Document:', companyDoc);
    const vendorOrderDoc = await VendorOrder.findOne({ ID: vendorOrderID, company: companyDoc._id });
    console.log('Vendor Order Document:', vendorOrderDoc);
    const vendorReceiptDoc = await VendorReceipt.findOne({
      ID: vendorReceiptID,
      company: companyDoc._id,
      vendorOrder: vendorOrderDoc._id
    });
    console.log('Vendor Receipt Document:', vendorReceiptDoc);
    const vendorReceiptCatalogsArr = await VendorReceiptCatalog.find({
      company: companyDoc._id,
      vendorOrder: vendorOrderDoc._id,
      vendorReceipt: vendorReceiptDoc._id
    }).select('-__v -_id -company  -vendorOrder -vendorReceipt');
    res.status(200).json({ message: 'Vendor Receipt Catalogs List', vendorReceiptCatalogs: vendorReceiptCatalogsArr });
  } catch (err) {
    next(err);
  }
};

export { getVendorOrders, getVendorReceipts, getVendorOrderCatalogs, getVendorReceiptCatalogs };
