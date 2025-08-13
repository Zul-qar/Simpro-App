import cron from 'node-cron';

import fetchCompanies from './companies.js';
import { fetchJobs, fetchAndMergeJobDetails } from './jobs.js';
import { fetchQuotes, fetchAndMergeQuoteDetails } from './quotes.js';
import { fetchCatalogs } from './catalogs.js';
import { fetchVendorOrders, fetchVendorReceipts } from './suppliers.js';

async function runAllJobsSequentially() {
  console.log('---- Midnight cron started ----');

  await fetchCompanies();
  await fetchJobs();
  await fetchAndMergeJobDetails();
  await fetchQuotes();
  await fetchAndMergeQuoteDetails();
  await fetchVendorOrders();
  await fetchVendorReceipts();

  console.log('---- Midnight cron finished ----');
}

function startAllCrons() {
  cron.schedule('0 0 1 * *', async () => {
    await runAllJobsSequentially();
  });
}

export default startAllCrons;
