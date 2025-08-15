import Company from '../models/company.js';

async function fetchCompanies() {
  await clearCompanies();
  try {
    console.log('Start: Fetching all companies from Simpro API');
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
    console.log('End: Fetching all companies from Simpro API');
  } catch (err) {
    console.log(err);
  }
}

async function clearCompanies() {
  try {
    await Company.deleteMany();
  } catch (err) {
    console.log('Error clearing Companies:', err);
  }
}

export default fetchCompanies;
