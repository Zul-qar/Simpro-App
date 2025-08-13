import fetchCompanies from './companies.js';
import { fetchJobs, fetchAndMergeJobDetails } from './jobs.js';
import { fetchQuotes, fetchAndMergeQuoteDetails } from './quotes.js';
import { fetchCatalogs } from './catalogs.js';
import { fetchVendorOrders, fetchVendorReceipts } from './suppliers.js';

function startAllCrons() {
  fetchCompanies();
  fetchJobs();
  fetchAndMergeJobDetails();
  fetchQuotes();
  fetchAndMergeQuoteDetails();
  fetchCatalogs();
  fetchVendorOrders();
  fetchVendorReceipts();
}

export default startAllCrons;
