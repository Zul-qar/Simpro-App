import fetchCompanies from './companies.js';
import { fetchJobs, fetchAndMergeJobDetails } from './jobs.js';
import { fetchQuotes, fetchAndMergeQuoteDetails } from './quotes.js';
import { fetchCatalogs } from './catalogs.js';

function startAllCrons() {
  fetchCompanies();
  fetchJobs();
  fetchAndMergeJobDetails();
  fetchQuotes();
  fetchAndMergeQuoteDetails();
  fetchCatalogs();
}

export default startAllCrons;
