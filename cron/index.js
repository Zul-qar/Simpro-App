const fetchCompanies = require('./companies');
const jobs = require('./jobs');
const quotes = require('./quotes');

function startAllCrons () {
  fetchCompanies();
  jobs.fetchJobs();
  jobs.fetchAndMergeJobDetails();
  quotes.fetchQuotes();
  quotes.fetchAndMergeQuoteDetails();
}

module.exports = startAllCrons;