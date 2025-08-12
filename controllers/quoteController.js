import Company from '../models/company.js';
import Quote from '../models/quote.js';

const getQuotes = async (req, res, next) => {
  const companyID = req.query.companyID;
  try {
    const companyDoc = await Company.findOne({ ID: companyID });
    const quotesArr = await Quote.find({ company: companyDoc._id }).select('-_id -__v -company');
    res.status(200).json({ message: 'Quotes List', quotes: quotesArr });
  } catch (err) {
    next(err);
  }
};

export { getQuotes };
