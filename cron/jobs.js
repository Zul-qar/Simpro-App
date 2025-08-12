const cron = require('node-cron');
const mongoose = require('mongoose');
const pLimit = async () => (await import('p-limit')).default;

const Company = require('../models/company');
const Job = require('../models/job');

function fetchJobs() {
  cron.schedule('0 0 * * *', async () => {
    clearJobs();
    console.log('Start: Fetcing all Jobs from Simpro API ');
    try {
      const companiesArr = await Company.find();
      for (const companyItem of companiesArr) {
        const pageSize = 250;
        let page = 1;
        while (true) {
          console.log(`Fetching jobs for company ${companyItem.ID}, page ${page}`);
          const response = await fetch(
            `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/jobs/?page=${page}&pageSize=${pageSize}`,
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

          const jobsArr = await response.json();

          await Job.insertMany(
            jobsArr.map(jobItem => ({
              ID: jobItem.ID,
              Description: jobItem.Description,
              Total: {
                ExTax: jobItem.Total.ExTax,
                IncTax: jobItem.Total.IncTax,
                Tax: jobItem.Total.Tax
              },
              company: new mongoose.Types.ObjectId(companyItem._id)
            }))
          );

          if (jobsArr.length < pageSize) break;
          page++;
        }
      }
    } catch (err) {
      console.log(err);
    }
    console.log('End: Fetcing all Jobs from Simpro API ');
  });
}

async function clearJobs() {
  try {
    await Job.deleteMany();
  } catch (err) {
    console.log(err);
  }
}

function fetchAndMergeJobDetails() {
  cron.schedule('0 0 * * *', async () => {
    console.log('Start: Fetching Job details and merging with Jobs');
    try {
      const jobsArr = await Job.find().populate('company');
      const limit = pLimit(2);
      const updates = [];

      await Promise.all(
        jobsArr.map(jobItem =>
          limit(async () => {
            try {
              const response = await fetch(`${process.env.SIMPRO_API_URL}/companies/${jobItem.company.ID}/jobs/${jobItem.ID}`, {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${process.env.SIMPRO_API_KEY}`
                }
              });

              if (!response.ok) {
                console.error(`Failed for company: ${jobItem.company.ID} job ${jobItem.ID}: ${response.status}`);
                return;
              }

              const jobDetail = await response.json();
              updates.push({
                updateOne: {
                  filter: { _id: jobItem._id },
                  update: {
                    $set: {
                      DateIssued: jobDetail.DateIssued,
                      Stage: jobDetail.Stage
                    }
                  }
                }
              });
            } catch (err) {
              console.error(`Error processing job ${jobItem.ID}:`, err.message);
            }
          })
        )
      );

      if (updates.length > 0) {
        await Job.bulkWrite(updates);
        console.log(`Bulk updated ${updates.length} jobs`);
      } else {
        console.log('No updates to apply');
      }
    } catch (err) {
      console.error('Error during fetch and merge:', err.message);
    }

    console.log('End: Fetching Job details and merging with Jobs');
  });
}

module.exports = { fetchJobs, fetchAndMergeJobDetails };
