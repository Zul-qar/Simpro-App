import cron from 'node-cron';

import fetchCompanies from './companies.js';
import { fetchPrebuilds, fetchPrebuildCatalogs } from './prebuilds.js';
import { fetchJobs, fetchAndMergeJobDetails } from './jobs.js';
import { fetchQuotes, fetchAndMergeQuoteDetails } from './quotes.js';
import { fetchVendorOrders, fetchVendorReceipts, fetchVendorOrderCatalogs, fetchVendorReceiptCatalogs } from './suppliers.js';

async function runAllJobsSequentially() {
  console.log('---- Midnight cron started ----');

  await fetchCompanies();
  await fetchPrebuilds();
  await fetchPrebuildCatalogs();
  await fetchJobs();
  await fetchAndMergeJobDetails();
  await fetchQuotes();
  await fetchAndMergeQuoteDetails();
  await fetchVendorOrders();
  await fetchVendorReceipts();
  await fetchVendorOrderCatalogs();
  await fetchVendorReceiptCatalogs();

  console.log('---- Midnight cron finished ----');
}

function startAllCrons() {
  cron.schedule('0 0 1 * *', async () => {
    await runAllJobsSequentially();
  });
}

export default startAllCrons;
