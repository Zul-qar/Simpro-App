import Company from '../models/company.js';
import Job from '../models/job.js';

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

export { getJobs };
