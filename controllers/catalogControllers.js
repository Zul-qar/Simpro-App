import Company from '../models/company.js';
import Catalog from '../models/catalog.js';

const getCatalogs = async (req, res, next) => {
  const companyID = req.query.companyID;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  if (!companyID) {
    const error = new Error('companyID query parameter is required');
    error.statusCode = 400;
    throw error;
  }

  if (!startDate || !endDate) {
    const error = new Error('startDate and endDate query parameters are required');
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const companyDoc = await Company.findOne({ ID: companyID });

    if (!companyDoc) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      return next(error);
    }

    const catalogsArr = await Catalog.find({
      company: companyDoc._id,
      DateModified: { $gte: start, $lte: end },
      Archived: { $ne: true }
    });
    res.status(200).json({ message: 'Catalogs List', catalogs: catalogsArr });
  } catch (err) {
    return next(err);
  }
};

const archiveCatalogs = async (req, res, next) => {
  const { companyID, catalogIDs } = req.body;

  if (!companyID || !Array.isArray(catalogIDs) || catalogIDs.length === 0) {
    const error = new Error('companyID and catalogIDs (non-empty array) are required in the request body');
    error.statusCode = 400;
    throw error;
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });

    if (!companyDoc) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      return next(error);
    }

    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateSuffix = `${yy}${mm}${dd}`;

    const result = await Catalog.updateMany({ company: companyDoc._id, ID: { $in: catalogIDs } }, [
      {
        $set: {
          Archived: true,
          Name: { $concat: ['$Name', ' (ARCHIVED)'] },
          Notes: {
            $cond: {
              if: { $ifNull: ['$Notes', false] },
              then: { $concat: ['$Notes', ` (ARCHIVED-${dateSuffix})`] },
              else: `ARCHIVED-${dateSuffix}`
            }
          }
        }
      }
    ]);

    res.status(200).json({ message: 'Catalogs archived successfully', modifiedCount: result.modifiedCount });
  } catch (err) {
    return next(err);
  }
};

export { getCatalogs, archiveCatalogs };
