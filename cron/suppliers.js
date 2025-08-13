import cron from 'node-cron';
import mongoose from 'mongoose';

import Company from '../models/company.js';
import VendorOrder from '../models/vendorOrder.js';
import VendorReceipt from '../models/vendorReceipt.js';

function fetchVendorOrders() {
  cron.schedule('0 0 1 * *', async () => {
    clearVendors();
    console.log('Start: Fetcing all Vendor Orders from Simpro API ');
    try {
      const companiesArr = await Company.find();
      for (const companyItem of companiesArr) {
        const pageSize = 250;
        let page = 1;
        while (true) {
          console.log(`Fetching Vendor Order for company ${companyItem.ID}, page ${page}`);
          const response = await fetch(
            `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/vendorOrders/?page=${page}&pageSize=${pageSize}`,
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

          let vendorOrdersArr = await response.json();

          await VendorOrder.insertMany(
            vendorOrdersArr.map(vendorOrderItem => ({
              ID: vendorOrderItem.ID,
              Stage: vendorOrderItem.Stage,
              Reference: vendorOrderItem.Reference,
              ShowItemDueDate: vendorOrderItem.ShowItemDueDate,
              Totals: {
                ExTax: vendorOrderItem.Totals.ExTax,
                IncTax: vendorOrderItem.Totals.IncTax
              },
              company: new mongoose.Types.ObjectId(companyItem._id)
            }))
          );

          if (vendorOrdersArr.length < pageSize) break;

          page++;
        }
      }
    } catch (err) {
      console.log(err);
    }
    console.log('End: Fetcing all Vendor Orders from Simpro API ');
  });
}

async function clearVendors() {
  await VendorOrder.deleteMany();
}

function fetchVendorReceipts() {
  cron.schedule('0 0 1 * *', async () => {
    clearVendorReceipts();
    console.log('Start: Fetcing all Vendor Receipts from Simpro API ');
    try {
      const companiesArr = await Company.find();
      for (const companyItem of companiesArr) {
        const vendorOrdersArrForCompany = await VendorOrder.find({ company: companyItem._id });
        for (const vendorOrderItemForCompany of vendorOrdersArrForCompany) {
          const pageSize = 250;
          let page = 1;
          while (true) {
            console.log(
              `Fetching Vendor Receipts for company ${companyItem.ID} vendor ${vendorOrderItemForCompany.ID}, page ${page}`
            );
            const response = await fetch(
              `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/vendorOrders/${vendorOrderItemForCompany.ID}/receipts/?page=${page}&pageSize=${pageSize}`,
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

            let vendorReceiptsArr = await response.json();

            await VendorReceipt.insertMany(
              vendorReceiptsArr.map(vendorReceiptItem => ({
                ID: vendorReceiptItem.ID,
                VendorInvoiceNo: vendorReceiptItem.VendorInvoiceNo,
                DateIssued: vendorReceiptItem.DateIssued,
                DueDate: vendorReceiptItem.DueDate,
                company: new mongoose.Types.ObjectId(companyItem._id),
                vendorOrder: new mongoose.Types.ObjectId(vendorOrderItemForCompany._id)
              }))
            );

            if (vendorReceiptsArr.length < pageSize) break;

            page++;
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
    console.log('End: Fetcing all Vendor Receipts from Simpro API ');
  });
}

async function clearVendorReceipts() {
  await VendorReceipt.deleteMany();
}

export { fetchVendorOrders, fetchVendorReceipts };
