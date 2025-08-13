import Company from '../models/company.js';
import VendorOrder from '../models/vendorOrder.js';

const getVendorOrders = async (req, res, next) => {
  const companyID = req.query.companyID;
  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const vendorOrdersArr = await VendorOrder.find({ company: companyDoc._id });
    res.status(200).json({ message: 'Vendor Orders List', vendorOrders: vendorOrdersArr });
  } catch (err) {
    next(err);
  }
};

export { getVendorOrders };
