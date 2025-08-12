import Company from '../models/company.js';

const getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find();
    res.status(200).json({ message: 'Companies List', companies });
  } catch (err) {
    next(err);
  }
};

export { getCompanies };
