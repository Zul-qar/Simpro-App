import Company from '../models/company.js';
import Catalog from '../models/catalog.js';

const getCatalogs = async (req, res, next) => {
  const { companyID, startDate, endDate, page, pageSize } = req.query;

  // Log input parameters
  console.log('Input parameters:', { companyID, startDate, endDate, page, pageSize });

  // Validate required inputs
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

  // Validate date formats
  if (isNaN(start) || isNaN(end)) {
    const error = new Error('Invalid date format for startDate or endDate');
    error.statusCode = 400;
    throw error;
  }

  // Include full end date
  end.setHours(23, 59, 59, 999);

  // Determine if pagination should be applied
  const usePagination = page && pageSize && !isNaN(Number(page)) && !isNaN(Number(pageSize)) && Number(page) >= 1 && Number(pageSize) >= 1;
  const skip = usePagination ? (Number(page) - 1) * Number(pageSize) : 0;
  const limit = usePagination ? Number(pageSize) : 0;

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    console.log('Found company _id:', companyDoc?._id);

    if (!companyDoc) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      return next(error);
    }

    // Fetch non-archived catalogs within the date range
    const queryCriteria = {
      company: companyDoc._id,
      DateModified: { $gte: start, $lte: end },
      $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
    };
    console.log('Query criteria:', queryCriteria);

    // Apply pagination to the query
    let catalogQuery = Catalog.find(queryCriteria)
      .select('ID PartNo Name Group Archived DateModified')
      .lean();
    
    if (usePagination) {
      catalogQuery = catalogQuery.skip(skip).limit(limit);
    }

    const catalogsArr = await catalogQuery;
    
    // Get total count for pagination
    const totalCount = await Catalog.countDocuments(queryCriteria);

    console.log('Catalogs found:', catalogsArr.length, 'Total count:', totalCount);

    // Build response object
    const response = {
      message: totalCount === 0 ? 'No active catalogs found' : 'Catalogs List',
      count: totalCount,
      catalogs: catalogsArr
    };

    // Add pagination metadata if pagination is used
    if (usePagination) {
      response.pageNo = Number(page);
      response.pageSize = Number(pageSize);
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getCatalogs:', err);
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

    const result = await Catalog.updateMany({ company: companyDoc._id, ID: { $in: catalogIDs }, Archived: { $ne: true } }, [
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

// const archiveCatalogs = async (req, res, next) => {
//   try {
//     const { companyID, catalogIds } = req.body;

//     // Validate inputs
//     if (!companyID) {
//       const error = new Error('companyID is required');
//       error.statusCode = 400;
//       return next(error);
//     }
//     if (!Array.isArray(catalogIds) || catalogIds.length === 0) {
//       const error = new Error('catalogIds must be a non-empty array');
//       error.statusCode = 400;
//       return next(error);
//     }
//     if (catalogIds.some(id => !id || typeof id !== 'number')) {
//       const error = new Error('All catalogIds must be valid numbers');
//       error.statusCode = 400;
//       return next(error);
//     }

//     // Find the company
//     const company = await Company.findOne({ ID: companyID }).lean();
//     if (!company) {
//       const error = new Error('Company not found');
//       error.statusCode = 404;
//       return next(error);
//     }

//     // Format current date for ARCHIVED-YYMMDD (e.g., ARCHIVED-250922 for 2025-09-22)
//     const currentDate = new Date();
//     const dateString = currentDate
//       .toISOString()
//       .slice(2, 10)
//       .replace(/-/g, ''); // YYMMDD format

//     // Find and validate catalogs
//     const catalogs = await Catalog.find({
//       company: company._id,
//       ID: { $in: catalogIds },
//       $or: [{ Archived: false }, { Archived: null }, { Archived: { $exists: false } }]
//     }).lean();

//     const validCatalogIds = new Set(catalogs.map(c => c.ID));
//     const invalidIds = catalogIds.filter(id => !validCatalogIds.has(id));
//     if (invalidIds.length > 0) {
//       console.warn('Invalid or already archived catalog IDs:', invalidIds);
//     }

//     if (catalogs.length === 0) {
//       return res.status(400).json({
//         message: 'No valid non-archived catalogs found for the provided IDs',
//         archivedCount: 0
//       });
//     }

//     // Perform updates
//     const updatePromises = catalogs.map(async (catalog) => {
//       const update = {
//         $set: {
//           Archived: true,
//           Name: `${catalog.Name} (ARCHIVED)`,
//           Notes: catalog.Notes ? `${catalog.Notes} (ARCHIVED-${dateString})` : `(ARCHIVED-${dateString})`
//         }
//       };
//       return Catalog.updateOne(
//         { _id: catalog._id, company: company._id },
//         update
//       );
//     });

//     const results = await Promise.all(updatePromises);
//     const archivedCount = results.filter(result => result.modifiedCount > 0).length;

//     // Log the operation
//     console.log(`Archived ${archivedCount} catalog items for companyID: ${companyID}`);

//     res.status(200).json({
//       message: archivedCount > 0 ? `${archivedCount} catalog items archived successfully` : 'No catalog items were archived',
//       archivedCount,
//       invalidIds: invalidIds.length > 0 ? invalidIds : undefined
//     });
//   } catch (err) {
//     console.error('Error in archiveCatalogs:', err);
//     next(err);
//   }
// };

export { getCatalogs, archiveCatalogs };
