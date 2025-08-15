import mongoose from 'mongoose';

import Company from '../models/company.js';
import Prebuild from '../models/prebuild.js';
import PrebuildCatalog from '../models/prebuildCatalog.js';

async function fetchPrebuilds() {
  await clearPrebuilds();
  console.log('Start: Fetching all Prebuilds from Simpro API');
  try {
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const pageSize = 250;
      let page = 1;
      while (true) {
        console.log(`Fetching Prebuilds for Company ${companyItem.ID}, Page ${page}`);
        const response = await fetch(
          `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/prebuilds/?page=${page}&pageSize=${pageSize}`,
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

        const prebuildsArr = await response.json();

        // Filtering prebuilds items that are archived
        const filteredPrebuildsArr = prebuildsArr.filter(prebuildItem => {
          return prebuildItem['Archived'] === false;
        });

        await Prebuild.insertMany(
          filteredPrebuildsArr.map(prebuildItem => ({
            ID: prebuildItem.ID,
            _href: prebuildItem._href,
            PartNo: prebuildItem.PartNo,
            Name: prebuildItem.Name,
            DisplayOrder: prebuildItem.DisplayOrder,
            Archived: prebuildItem.Archived,
            company: new mongoose.Types.ObjectId(companyItem._id)
          }))
        );

        if (prebuildsArr.length < pageSize) break;
        page++;
      }
    }
    console.log('End: Fetching all Prebuilds from Simpro API');
  } catch (err) {
    console.log(err);
  }
}

async function clearPrebuilds() {
  try {
    await Prebuild.deleteMany();
  } catch (err) {
    console.log('Error clearing Prebuilds:', err);
  }
}

async function fetchPrebuildCatalogs() {
  await clearPrebuildCatalogs();
  console.log('Start: Fetching all Prebuild Catalogs from Simpro API');
  try {
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const prebuildsArrForCompany = await Prebuild.find({ company: companyItem._id });
      for (const prebuildItemForCompany of prebuildsArrForCompany) {
        const pageSize = 250;
        let page = 1;
        while (true) {
          console.log(
            `Fetching Prebuild Catalog Items for Company ${companyItem.ID}, Prebuild ${prebuildItemForCompany.ID}, Page ${page}`
          );
          const response = await fetch(
            `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/prebuilds/${prebuildItemForCompany.ID}/catalogs/?page=${page}&pageSize=${pageSize}`,
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

          const prebuildCatalogsArr = await response.json();

          await PrebuildCatalog.insertMany(
            prebuildCatalogsArr.map(prebuildCatalogItem => ({
              Catalog: {
                ID: prebuildCatalogItem.Catalog.ID,
                PartNo: prebuildCatalogItem.Catalog.PartNo,
                Name: prebuildCatalogItem.Catalog.Name,
                TradePrice: prebuildCatalogItem.Catalog.TradePrice,
                TradePriceEx: prebuildCatalogItem.Catalog.TradePriceEx,
                TradePriceInc: prebuildCatalogItem.Catalog.TradePriceInc,
                SplitPrice: prebuildCatalogItem.Catalog.SplitPrice,
                SplitPriceEx: prebuildCatalogItem.Catalog.SplitPriceEx,
                SplitPriceInc: prebuildCatalogItem.Catalog.SplitPriceInc
              },
              Quantity: prebuildCatalogItem.Quantity,
              DisplayOrder: prebuildCatalogItem.DisplayOrder,
              company: new mongoose.Types.ObjectId(companyItem._id),
              prebuild: new mongoose.Types.ObjectId(prebuildItemForCompany._id)
            }))
          );

          if (prebuildCatalogsArr.length < pageSize) break;
          page++;
        }
      }
    }
    console.log('End: Fetching all Prebuild Catalogs from Simpro API');
  } catch (err) {
    console.log(err);
  }
}

async function clearPrebuildCatalogs() {
  try {
    await PrebuildCatalog.deleteMany();
  } catch (err) {
    console.log('Error clearing Prebuild Catalogs:', err);
  }
}

export { fetchPrebuilds, fetchPrebuildCatalogs };
