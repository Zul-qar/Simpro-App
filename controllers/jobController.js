const Company = require('../models/company');
const Job = require('../models/job');

exports.getJobs = async (req, res, next) => {
  const companyID = req.query.companyID;
  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const jobsArr = await Job.find({ company: companyDoc._id }).select('-_id -__v -company');
    console.log(jobsArr);
    res.status(200).json({ message: 'Jobs List', jobs: jobsArr });
  } catch (err) {
    next(err);
  }
};
