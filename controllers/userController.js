const Company = require('../models/company');

exports.getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find();
    res.status(200).json({ message: 'Companies List', companies });
  } catch (err) {
    next(err);
  }
};
