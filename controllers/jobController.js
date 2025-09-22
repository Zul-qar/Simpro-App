import Company from '../models/company.js';
import Job from '../models/job.js';
import JobCostCenter from '../models/jobCostCenter.js';
import JobCostCenterCatalog from '../models/jobCostCenterCatalog.js';

const getJobs = async (req, res, next) => {
  const companyID = req.query.companyID;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  if (!companyID) {
    const error = new Error('Company ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!startDate || !endDate) {
    const error = new Error('Start date and end date are required');
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const jobsArr = await Job.find({ company: companyDoc._id, DateIssued: { $gte: start, $lte: end} }).select(
      '-_id -__v -company'
    );
    res.status(200).json({ message: 'Jobs List', jobs: jobsArr });
  } catch (err) {
    next(err);
  }
};

const getJobCatalogs = async (req, res, next) => {
  const { companyID, startDate, endDate, page, pageSize } = req.query;

  // Validate required query parameters
  if (!companyID || !startDate || !endDate) {
    return res.status(400).json({ message: "companyID, startDate, and endDate are required" });
  }

  try {
    // Find the company
    const companyDoc = await Company.findOne({ ID: companyID });
    if (!companyDoc) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Set date range boundaries
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Determine if pagination should be applied
    const usePagination = page && pageSize && !isNaN(Number(page)) && !isNaN(Number(pageSize)) && Number(page) >= 1 && Number(pageSize) >= 1;
    const skip = usePagination ? (Number(page) - 1) * Number(pageSize) : 0;
    const limit = usePagination ? Number(pageSize) : 0;

    // 1. Get jobs in date range with specific stages
    const jobs = await Job.find({
      company: companyDoc._id,
      DateIssued: { $gte: start, $lte: end },
      Stage: { $nin: ['Archived'] }
    }).select('_id ID DateIssued Stage');

    if (!jobs.length) {
      return res.status(200).json({ 
        message: "No jobs found in date range with specified stages", 
        count: 0,
        jobCatalogs: [] 
      });
    }

    const jobIds = jobs.map(j => j.ID);

    // 2. Get job cost centers linked to those jobs
    const costCenters = await JobCostCenter.find({
      company: companyDoc._id,
      'Job.ID': { $in: jobIds }
    }).select('_id ID Name Job');

    if (!costCenters.length) {
      return res.status(200).json({ 
        message: "No job cost centers found", 
        count: 0,
        jobCatalogs: [] 
      });
    }

    const costCenterIds = costCenters.map(cc => cc._id);

    // 3. Get catalog items linked to cost centers
    let jobCatalogQuery = JobCostCenterCatalog.find({
      jobCostCenter: { $in: costCenterIds }
    });
    if (usePagination) {
      jobCatalogQuery = jobCatalogQuery.skip(skip).limit(limit);
    }
    const jobCatalogs = await jobCatalogQuery;
    const jobCatalogCount = await JobCostCenterCatalog.countDocuments({
      jobCostCenter: { $in: costCenterIds }
    });

    // Build response object
    const response = {
      message: jobCatalogCount === 0 ? "No job catalogs found" : "Job Catalogs List",
      count: jobCatalogCount,
      jobCatalogs
    };

    // Add pagination metadata if pagination is used
    if (usePagination) {
      const totalPages = Math.ceil(jobCatalogCount / Number(pageSize));
      response.pageNo = Number(page);
      response.pageSize = Number(pageSize);
      response.totalPages = totalPages;
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getJobCatalogs:', err);
    next(err);
  }
};


export { getJobs, getJobCatalogs };
