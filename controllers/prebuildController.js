import Company from '../models/company.js';
import Prebuild from '../models/prebuild.js';
import PrebuildCatalog from '../models/prebuildCatalog.js';

const getPrebuilds = async (req, res, next) => {
  const companyID = req.query.companyID;

  if (!companyID) {
    const error = new Error('Company ID is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    if (!companyDoc) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      throw error;
    }
    const prebuildsArr = await Prebuild.find({ company: companyDoc._id });
    res.status(200).json({ message: 'Prebuilds List', prebuilds: prebuildsArr });
  } catch (err) {
    next(err);
  }
};

const getPrebuildCatalogs = async (req, res, next) => {
  const companyID = req.query.companyID;
  const prebuildID = req.query.prebuildID;

  if (!companyID || !prebuildID) {
    const error = new Error('Company ID and Prebuild ID are required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    if (!companyDoc) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      throw error;
    }
    const prebuildDoc = await Prebuild.findOne({ ID: prebuildID, company: companyDoc._id });
    if (!prebuildDoc) {
      const error = new Error('Prebuild not found');
      error.statusCode = 404;
      throw error;
    }
    const prebuildCatalogsArr = await PrebuildCatalog.find({ prebuild: prebuildDoc._id, company: companyDoc._id });
    res.status(200).json({ message: 'Prebuild Catalog List', catalogs: prebuildCatalogsArr });
  } catch (err) {
    next(err);
  }
};

export { getPrebuilds, getPrebuildCatalogs };
