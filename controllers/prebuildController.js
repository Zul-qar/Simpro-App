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

// const getPrebuildCatalogs = async (req, res, next) => {
//   const companyID = req.query.companyID;
//   const prebuildID = req.query.prebuildID;

//   if (!companyID || !prebuildID) {
//     const error = new Error('Company ID and Prebuild ID are required');
//     error.statusCode = 400;
//     throw error;
//   }

//   try {
//     const companyDoc = await Company.findOne({ ID: companyID });
//     if (!companyDoc) {
//       const error = new Error('Company not found');
//       error.statusCode = 404;
//       throw error;
//     }
//     const prebuildDoc = await Prebuild.findOne({ ID: prebuildID, company: companyDoc._id });
//     if (!prebuildDoc) {
//       const error = new Error('Prebuild not found');
//       error.statusCode = 404;
//       throw error;
//     }
//     const prebuildCatalogsArr = await PrebuildCatalog.find({ prebuild: prebuildDoc._id, company: companyDoc._id });
//     res.status(200).json({ message: 'Prebuild Catalog List', catalogs: prebuildCatalogsArr });
//   } catch (err) {
//     next(err);
//   }
// };

const getPrebuildCatalogs = async (req, res, next) => {
  const { companyID, page, pageSize, search } = req.query;

  // Validate required query parameters
  if (!companyID) {
    return res.status(400).json({ message: 'companyID is required' });
  }

  try {
    // Find the company
    const companyDoc = await Company.findOne({ ID: companyID });
    if (!companyDoc) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Pagination
    const usePagination = page && pageSize && !isNaN(Number(page)) && !isNaN(Number(pageSize)) && Number(page) >= 1 && Number(pageSize) >= 1;
    const skip = usePagination ? (Number(page) - 1) * Number(pageSize) : 0;
    const limit = usePagination ? Number(pageSize) : 0;

    // Get all Prebuilds for company
    const prebuilds = await Prebuild.find({ company: companyDoc._id })
      .select('_id ID Name PartNo');

    if (!prebuilds.length) {
      return res.status(200).json({ 
        message: 'No Prebuilds found', 
        count: 0,
        prebuildCatalogs: [] 
      });
    }

    const prebuildIds = prebuilds.map(p => p._id);

    // Build base criteria
    const prebuildCatalogCriteria = {
      company: companyDoc._id,
      prebuild: { $in: prebuildIds }
    };

    // Add search if provided
    if (search) {
      const searchCriteria = [
        { 'Catalog.Name': { $regex: search, $options: 'i' } }
      ];
      if (!isNaN(search)) {
        searchCriteria.push({ 'Catalog.ID': Number(search) });
      }
      prebuildCatalogCriteria.$or = searchCriteria;
    }

    // Query prebuild catalogs
    let prebuildCatalogQuery = PrebuildCatalog.find(prebuildCatalogCriteria)
      .select('Catalog.ID Catalog.Name Quantity DisplayOrder prebuild');

    if (usePagination) {
      prebuildCatalogQuery = prebuildCatalogQuery.skip(skip).limit(limit);
    }

    const prebuildCatalogs = await prebuildCatalogQuery;
    const prebuildCatalogCount = await PrebuildCatalog.countDocuments(prebuildCatalogCriteria);

    // Build response object
    const response = {
      message: prebuildCatalogCount === 0 ? 'No prebuild catalogs found' : 'Prebuild Catalogs List',
      count: prebuildCatalogCount,
      prebuildCatalogs
    };

    if (usePagination) {
      response.pageNo = Number(page);
      response.pageSize = Number(pageSize);
      response.totalPages = Math.ceil(prebuildCatalogCount / Number(pageSize));
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getPrebuildCatalogs:', err);
    next(err);
  }
};

export { getPrebuilds, getPrebuildCatalogs };
