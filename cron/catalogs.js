import mongoose from 'mongoose';

import Company from '../models/company.js';
import Catalog from '../models/catalog.js';

async function fetchCatalogs() {
    console.log('Start: Fetcing all Catalogs from Simpro API ');
    try {
      const companiesArr = await Company.find();
      for (const companyItem of companiesArr) {
        const pageSize = 250;
        let page = 1;
        while (true) {
          console.log(`Fetching Catalogs for company ${companyItem.ID}, page ${page}`);
          const response = await fetch(
            `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/catalogs/?page=${page}&pageSize=${pageSize}`,
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

          const catalogsArr = await response.json();
          await Catalog.insertMany(
            catalogsArr.map(catalogItem => ({
              ID: catalogItem.ID,
              PartNo: catalogItem.PartNo,
              Name: catalogItem.Name,
              TradePrice: catalogItem.TradePrice,
              TradePriceEx: catalogItem.TradePriceEx,
              TradePriceInc: catalogItem.TradePriceInc,
              SplitPrice: catalogItem.SplitPrice,
              SplitPriceEx: catalogItem.SplitPriceEx,
              SplitPriceInc: catalogItem.SplitPriceInc,
              company: new mongoose.Types.ObjectId(companyItem._id)
            }))
          );

          if (catalogsArr.length < pageSize) break;
          page++;
        }
      }
    } catch (err) {
      console.log(err);
    }
    console.log('End: Fetcing all Catalogs from Simpro API ');
}

export { fetchCatalogs };
