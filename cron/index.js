import fetchCompanies from './companies.js';
import { fetchJobs, fetchAndMergeJobDetails } from './jobs.js';
import { fetchQuotes, fetchAndMergeQuoteDetails } from './quotes.js';

function startAllCrons() {
  fetchCompanies();
  fetchJobs();
  fetchAndMergeJobDetails();
  fetchQuotes();
  fetchAndMergeQuoteDetails();
}

export default startAllCrons;
