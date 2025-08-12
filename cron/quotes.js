import cron from 'node-cron';

import Company from '../models/company.js';
import Quote from '../models/quote.js';

function fetchQuotes() {
  cron.schedule('0 0 1 * *', async () => {
    clearQuotes();
    console.log('Start: Fetcing all Quotes from Simpro API ');
    try {
      const companiesArr = await Company.find();
      for (const companyItem of companiesArr) {
        const pageSize = 250;
        let page = 1;
        while (true) {
          console.log(`Fetching Quote for company ${companyItem.ID}, page ${page}`);
          const response = await fetch(
            `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/quotes/?IsClosed=false&page=${page}&pageSize=${pageSize}`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + process.env.SIMPRO_API_KEY
              }
            }
          );

          if (!response.ok) {
            throw new Error('Request Unsuccessful. Status Code: ' + response.status);
          }

          let quoteArr = await response.json();

          await Quote.insertMany(
            quoteArr.map(quoteItem => ({
              ID: quoteItem.ID,
              Description: quoteItem.Description,
              Total: {
                ExTax: quoteItem.Total.ExTax,
                Tax: quoteItem.Total.Tax,
                IncTax: quoteItem.Total.IncTax
              },
              IsClosed: quoteItem.IsClosed,
              company: companyItem._id
            }))
          );

          if (quoteArr.length < pageSize) break;

          page++;
        }
      }
    } catch (err) {
      console.log(err);
    }
    console.log('End: Fetcing all Quotes from Simpro API ');
  });
}

async function clearQuotes() {
  await Quote.deleteMany();
}

function fetchAndMergeQuoteDetails() {
  cron.schedule('0 0 1 * *', async () => {
    console.log('Start: Fetching Quote details and merging with Quotes');
    try {
      const quotesArr = await Quote.find().populate('company');

      for (const quoteItem of quotesArr) {
        console.log(`Fetching Quote detail for Company: ${quoteItem.company.ID} and Quote: ${quoteItem.ID} `);
        const response = await fetch(`${process.env.SIMPRO_API_URL}/companies/${quoteItem.company.ID}/quotes/${quoteItem.ID}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SIMPRO_API_KEY}`
          }
        });

        if (!response.ok) {
          console.error(`Failed for company: ${quoteItem.company.ID} quote ${quoteItem.ID}: ${response.status}`);
          return;
        }

        const quoteDetailItem = await response.json();
        quoteItem['DateIssued'] = quoteDetailItem['DateIssued'];

        await quoteItem.save();
      }
    } catch (err) {
      console.log(err);
    }
    console.log('End: Fetching Quote details and merging with Quotes');
  });
}

export { fetchQuotes, fetchAndMergeQuoteDetails };
