import cron from 'node-cron';

import fetchCompanies from './companies.js';
import { fetchPrebuilds, fetchPrebuildCatalogs } from './prebuilds.js';
import { fetchJobs, fetchAndMergeJobDetails, fetchJobCostCenters } from './jobs.js';
import { fetchQuotes, fetchAndMergeQuoteDetails, fetchQuoteCostCenters, fetchQuoteCostCenterCatalogs } from './quotes.js';
import { fetchVendorOrders, fetchVendorReceipts, fetchVendorOrderCatalogs, fetchVendorReceiptCatalogs } from './suppliers.js';
import { fetchCatalogs, fetchCatalogGroups, fetchCatalogGroupDetails, fetchCatalogDetails, syncArchivedCatalogs } from './catalogs.js';

async function runAllJobsSequentially() {
  console.log('---- Midnight cron started ----');

  await fetchCompanies();
  // await fetchPrebuilds();
  // await fetchPrebuildCatalogs();
  // await fetchJobs();
  // await fetchAndMergeJobDetails();
  // await fetchJobCostCenters();
  // await fetchQuotes();
  // await fetchAndMergeQuoteDetails();
  // await fetchQuoteCostCenters();
  // await fetchQuoteCostCenterCatalogs();
  // await fetchVendorOrders();
  // await fetchVendorReceipts();
  // await fetchVendorOrderCatalogs();
  // await fetchVendorReceiptCatalogs();
  // await fetchCatalogs();
  // await fetchCatalogGroups(); 
  // await fetchCatalogGroupDetails();
  // await fetchCatalogDetails();  
  await syncArchivedCatalogs();

  console.log('---- Midnight cron finished ----');
}

function startAllCrons() {
  cron.schedule('0 0 1 * *', async () => {
    await runAllJobsSequentially();
  });
}

export default startAllCrons;
