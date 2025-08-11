const cron = require('node-cron');

const Company = require('../models/company');

function fetchCompanies() {
  cron.schedule('0 0 * * *', async () => {
    clearCompanies();
    console.log('Start: Fetching all companies from Simpro API');
    try {
      const response = await fetch(`${process.env.SIMPRO_API_URL}/companies/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.SIMPRO_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error('Request Unsuccessful. Status Code: ' + response.status);
      }

      const companiesArr = await response.json();
      for (const companyItem of companiesArr) {
        const company = new Company({ ID: companyItem.ID, Name: companyItem.Name });
        await company.save();
      }
    } catch (err) {
      console.log(err);
    }
    console.log('End: Fetching all companies from Simpro API');
  });
}

async function clearCompanies() {
  try {
    await Company.deleteMany();
  } catch (err) {
    console.log(err);
  }
}

module.exports = fetchCompanies;
