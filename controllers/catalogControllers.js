import Company from "../models/company.js";
import Catalog from "../models/catalog.js";

const getCatalogs = async (req, res, next) => {
  const { companyID, startDate, endDate, page, pageSize, search } = req.query;

  console.log("Input parameters:", {
    companyID,
    startDate,
    endDate,
    page,
    pageSize,
    search,
  });

  // Validate required inputs
  if (!companyID) {
    const error = new Error("companyID query parameter is required");
    error.statusCode = 400;
    throw error;
  }

  if (!startDate || !endDate) {
    const error = new Error(
      "startDate and endDate query parameters are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    const error = new Error("Invalid date format for startDate or endDate");
    error.statusCode = 400;
    throw error;
  }

  // Ensure full end date coverage
  end.setHours(23, 59, 59, 999);

  const usePagination =
    page &&
    pageSize &&
    !isNaN(Number(page)) &&
    !isNaN(Number(pageSize)) &&
    Number(page) >= 1 &&
    Number(pageSize) >= 1;

  const skip = usePagination ? (Number(page) - 1) * Number(pageSize) : 0;
  const limit = usePagination ? Number(pageSize) : 0;

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    console.log("Found company _id:", companyDoc?._id);

    if (!companyDoc) {
      const error = new Error("Company not found");
      error.statusCode = 404;
      return next(error);
    }

    // Base query
    const queryCriteria = {
      company: companyDoc._id,
      DateModified: { $gte: start, $lte: end },
      $or: [
        { Archived: false },
        { Archived: null },
        { Archived: { $exists: false } },
      ],
    };

    // Add search if provided
    // Add search if provided
    if (search) {
      const searchCriteria = [{ Name: { $regex: search, $options: "i" } }];

      // If search is a number, also check ID
      if (!isNaN(search)) {
        searchCriteria.push({ ID: Number(search) });
      }

      queryCriteria.$and = [{ $or: searchCriteria }];
    }

    console.log("Query criteria:", queryCriteria);

    // Apply query
    let catalogQuery = Catalog.find(queryCriteria)
      .select("ID PartNo Name Group Archived DateModified")
      .lean();

    if (usePagination) {
      catalogQuery = catalogQuery.skip(skip).limit(limit);
    }

    const catalogsArr = await catalogQuery;
    const totalCount = await Catalog.countDocuments(queryCriteria);

    console.log(
      "Catalogs found:",
      catalogsArr.length,
      "Total count:",
      totalCount
    );

    const response = {
      message: totalCount === 0 ? "No active catalogs found" : "Catalogs List",
      count: totalCount,
      catalogs: catalogsArr,
    };

    if (usePagination) {
      response.pageNo = Number(page);
      response.pageSize = Number(pageSize);
      response.totalPages = Math.ceil(totalCount / Number(pageSize));
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("Error in getCatalogs:", err);
    return next(err);
  }
};

const archiveCatalogs = async (req, res, next) => {
  const { companyID, catalogIDs } = req.body;

  if (!companyID || !Array.isArray(catalogIDs) || catalogIDs.length === 0) {
    const error = new Error(
      "companyID and catalogIDs (non-empty array) are required in the request body"
    );
    error.statusCode = 400;
    throw error;
  }

  try {
    const companyDoc = await Company.findOne({ ID: companyID });

    if (!companyDoc) {
      const error = new Error("Company not found");
      error.statusCode = 404;
      return next(error);
    }

    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateSuffix = `${yy}${mm}${dd}`;

    const result = await Catalog.updateMany(
      {
        company: companyDoc._id,
        ID: { $in: catalogIDs },
        Archived: { $ne: true },
      },
      [
        {
          $set: {
            Archived: true,
            Name: { $concat: ["$Name", " (ARCHIVED)"] },
            Notes: {
              $cond: {
                if: { $ifNull: ["$Notes", false] },
                then: { $concat: ["$Notes", ` (ARCHIVED-${dateSuffix})`] },
                else: `ARCHIVED-${dateSuffix}`,
              },
            },
          },
        },
      ]
    );

    res
      .status(200)
      .json({
        message: "Catalogs archived successfully",
        modifiedCount: result.modifiedCount,
      });
  } catch (err) {
    return next(err);
  }
};

export { getCatalogs, archiveCatalogs };
