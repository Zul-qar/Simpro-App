import mongoose from "mongoose";
import pLimit from "p-limit";

import Company from "../models/company.js";
import Job from "../models/job.js";
import JobCostCenter from "../models/jobCostCenter.js";
import JobCostCenterCatalog from "../models/jobCostCenterCatalog.js";

async function fetchJobs() {
  await clearJobs();
  try {
    console.log("Start: Fetcing all Jobs from Simpro API ");
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const pageSize = 250;
      let page = 1;
      while (true) {
        console.log(
          `Fetching jobs for company ${companyItem.ID}, page ${page}`
        );
        const response = await fetch(
          `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/jobs/?page=${page}&pageSize=${pageSize}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + process.env.SIMPRO_API_KEY,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            "Request Unsuccessful. Status Code: " + response.status
          );
        }

        const jobsArr = await response.json();

        await Job.insertMany(
          jobsArr.map((jobItem) => ({
            ID: jobItem.ID,
            Description: jobItem.Description,
            Total: {
              ExTax: jobItem.Total.ExTax,
              IncTax: jobItem.Total.IncTax,
              Tax: jobItem.Total.Tax,
            },
            company: new mongoose.Types.ObjectId(companyItem._id),
          }))
        );

        if (jobsArr.length < pageSize) break;
        page++;
      }
    }
  } catch (err) {
    console.log(err);
  }
  console.log("End: Fetcing all Jobs from Simpro API ");
}

async function clearJobs() {
  try {
    await Job.deleteMany();
  } catch (err) {
    console.log("Error clearing Jobs:", err);
  }
}

async function fetchAndMergeJobDetails() {
  console.log("Start: Fetching Job details and merging with Jobs");
  try {
    const jobsArr = await Job.find().populate("company");
    const limit = pLimit(2);
    const updates = [];

    await Promise.all(
      jobsArr.map((jobItem) =>
        limit(async () => {
          try {
            console.log(
              `Fetching Job detail for Company: ${jobItem.company.ID} and Job: ${jobItem.ID} `
            );
            const response = await fetch(
              `${process.env.SIMPRO_API_URL}/companies/${jobItem.company.ID}/jobs/${jobItem.ID}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.SIMPRO_API_KEY}`,
                },
              }
            );

            if (!response.ok) {
              console.error(
                `Failed for company: ${jobItem.company.ID} job ${jobItem.ID}: ${response.status}`
              );
              return;
            }

            const jobDetail = await response.json();
            updates.push({
              updateOne: {
                filter: { _id: jobItem._id },
                update: {
                  $set: {
                    DateIssued: jobDetail.DateIssued,
                    Stage: jobDetail.Stage,
                  },
                },
              },
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
      console.log("No updates to apply");
    }
    console.log("End: Fetching Job details and merging with Jobs");
  } catch (err) {
    console.error("Error during fetch and merge:", err.message);
  }
}

async function fetchJobCostCenters() {
  await clearJobCostCenters();
  try {
    console.log("Start: Fetching Job Cost Centers from Simpro API");
    const companiesArr = await Company.find();

    for (const companyItem of companiesArr) {
      const pageSize = 250;
      let page = 1;

      while (true) {
        console.log(
          `Fetching Job Cost Centers for company ${companyItem.ID}, page ${page}`
        );
        const response = await fetch(
          `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/jobCostCenters/?page=${page}&pageSize=${pageSize}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + process.env.SIMPRO_API_KEY,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Request Unsuccessful. Status Code: ${response.status}`
          );
        }

        const dataArr = await response.json();

        await JobCostCenter.insertMany(
          dataArr.map((item) => ({
            ID: item.ID,
            Name: item.Name,
            CostCenter: item.CostCenter,
            Job: item.Job,
            Section: item.Section,
            DateModified: item.DateModified
              ? new Date(item.DateModified)
              : null,
            company: new mongoose.Types.ObjectId(companyItem._id),
          }))
        );

        if (dataArr.length < pageSize) break;
        page++;
      }
    }
    console.log("End: Fetching Job Cost Centers from Simpro API");
  } catch (err) {
    console.error("Error fetching Job Cost Centers:", err.message);
  }
}

async function clearJobCostCenters() {
  try {
    await JobCostCenter.deleteMany();
  } catch (err) {
    console.error("Error clearing Job Cost Centers:", err.message);
  }
}

async function fetchJobCostCenterCatalog() {
  await clearJobCostCenterCatalog();
  try {
    console.log(
      "Start: Fetching all Job Cost Center Catalog Items from Simpro API"
    );
    const jobCostCentersArr = await JobCostCenter.find().populate("company");
    const limit = pLimit(2); // Limit concurrent fetches to avoid rate limiting
    const promises = jobCostCentersArr.map((jccItem) =>
      limit(async () => {
        const companyID = jccItem.company.ID;
        const jobID = jccItem.Job.ID;
        const sectionID = jccItem.Section.ID;
        const costCenterID = jccItem.ID;
        const pageSize = 250;
        let page = 1;
        while (true) {
          console.log(
            `Fetching catalog items for company ${companyID}, job ${jobID}, section ${sectionID}, costCenter ${costCenterID}, page ${page}`
          );
          const response = await fetch(
            `${process.env.SIMPRO_API_URL}/companies/${companyID}/jobs/${jobID}/sections/${sectionID}/costCenters/${costCenterID}/catalogs/?page=${page}&pageSize=${pageSize}`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + process.env.SIMPRO_API_KEY,
              },
            }
          );

          if (!response.ok) {
            console.error(
              `Failed for company ${companyID}, job ${jobID}, section ${sectionID}, costCenter ${costCenterID}: Status Code ${response.status}`
            );
            break;
          }

          const itemsArr = await response.json();

          await JobCostCenterCatalog.insertMany(
            itemsArr.map((item) => ({
              ID: item.ID,
              Catalog: {
                ID: item.Catalog?.ID ?? null,
                PartNo: item.Catalog?.PartNo ?? null,
                Name: item.Catalog?.Name ?? null,
                BillableStatus: item.Catalog?.BillableStatus ?? null,
                BasePrice: item.Catalog?.BasePrice ?? null,
                Markup: item.Catalog?.Markup ?? null,
                Discount: item.Catalog?.Discount ?? null,
                SellPrice: item.Catalog?.SellPrice
                  ? {
                      ExTax: item.Catalog.SellPrice.ExTax ?? null,
                      IncTax: item.Catalog.SellPrice.IncTax ?? null,
                      ExDiscountExTax:
                        item.Catalog.SellPrice.ExDiscountExTax ?? null,
                      ExDiscountIncTax:
                        item.Catalog.SellPrice.ExDiscountIncTax ?? null,
                    }
                  : null,
                Total: item.Catalog?.Total
                  ? {
                      Qty: item.Catalog.Total.Qty ?? null,
                      Amount: item.Catalog.Total.Amount ?? null,
                    }
                  : null,
                Claimed: item.Catalog?.Claimed
                  ? {
                      ToDate: item.Catalog.Claimed.ToDate
                        ? new Date(item.Catalog.Claimed.ToDate)
                        : null,
                      Remaining: item.Catalog.Claimed.Remaining ?? null,
                    }
                  : null,
              },
              jobCostCenter: new mongoose.Types.ObjectId(jccItem._id),
            }))
          );

          if (itemsArr.length < pageSize) break;
          page++;
        }
      })
    );

    await Promise.all(promises);
  } catch (err) {
    console.log("Error fetching Job Cost Center Catalog Items:", err);
  }
  console.log(
    "End: Fetching all Job Cost Center Catalog Items from Simpro API"
  );
}

async function clearJobCostCenterCatalog() {
  try {
    await JobCostCenterCatalog.deleteMany();
  } catch (err) {
    console.log("Error clearing Job Cost Center Catalog Items:", err);
  }
}

export {
  fetchJobs,
  fetchAndMergeJobDetails,
  fetchJobCostCenters,
  fetchJobCostCenterCatalog,
};
