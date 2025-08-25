import Company from "../models/company.js";
import Catalog from "../models/catalog.js";

const getCatalogs = async (req, res, next) => {
  const companyID = req.query.companyID;

  if (!companyID) {
    const error = new Error('companyID query parameter is required');
    error.statusCode = 400;
    return next(error);
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    
    if (!companyDoc) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      return next(error);
    }

    const catalogsArr = await Catalog.find({ company: companyDoc._id });
    res.status(200).json({message: 'Catalogs List', catalogs: catalogsArr });
  } catch (err) {
    return next(err);
  }
};

export { getCatalogs };
