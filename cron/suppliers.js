import mongoose from 'mongoose';

import Company from '../models/company.js';
import VendorOrder from '../models/vendorOrder.js';
import VendorOrderCatalog from '../models/vendorOrderCatalog.js';
import VendorReceipt from '../models/vendorReceipt.js';
import vendorReceiptCatalog from '../models/vendorReceiptCatalog.js';

async function fetchVendorOrders() {
  await clearVendorOrders();
  try {
    console.log('Start: Fetcing all Vendor Orders from Simpro API ');
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
    console.log('End: Fetcing all Vendor Orders from Simpro API ');
  } catch (err) {
    console.log(err);
  }
}

async function clearVendorOrders() {
  try {
    await VendorOrder.deleteMany();
  } catch (err) {
    console.log('Error clearing Vendor Orders:', err);
  }
}

async function fetchVendorOrderCatalogs() {
  await clearVendorOrderCatalogs();
  try {
    console.log('Start: Fetcing all Vendor Order Catalogs from Simpro API ');
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const vendorOrdersArrForCompany = await VendorOrder.find({ company: companyItem._id });
      for (const vendorOrderItemForCompany of vendorOrdersArrForCompany) {
        const pageSize = 250;
        let page = 1;
        while (true) {
          console.log(
            `Fetching Vendor Order Catalogs for Company ${companyItem.ID}, Vendor Order ${vendorOrderItemForCompany.ID}`
          );
          const response = await fetch(
            `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/vendorOrders/${vendorOrderItemForCompany.ID}/catalogs/?page=${page}&pageSize=${pageSize}`,
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

          const vendorOrderCatalogsArr = await response.json();

          await VendorOrderCatalog.insertMany(
            vendorOrderCatalogsArr.map(vendorOrderCatalogItem => ({
              Catalog: {
                ID: vendorOrderCatalogItem.Catalog.ID,
                PartNo: vendorOrderCatalogItem.Catalog.PartNo,
                Name: vendorOrderCatalogItem.Catalog.Name
              },
              DueDate: vendorOrderCatalogItem.DueDate ? new Date(vendorOrderCatalogItem.DueDate) : null,
              Notes: vendorOrderCatalogItem.Notes,
              Price: vendorOrderCatalogItem.Price,
              DisplayOrder: vendorOrderCatalogItem.DisplayOrder,
              vendorOrder: new mongoose.Types.ObjectId(vendorOrderItemForCompany._id),
              company: new mongoose.Types.ObjectId(companyItem._id)
            }))
          );

          if (vendorOrderCatalogsArr.length < pageSize) break;

          page++;
        }
      }
    }
    console.log('End: Fetcing all Vendor Order Catalogs from Simpro API ');
  } catch (err) {
    console.log(err);
  }
}

async function clearVendorOrderCatalogs() {
  try {
  } catch (err) {
    console.log('Error clearing Vendor Order Catalogs:', err);
  }
}

async function fetchVendorReceipts() {
  await clearVendorReceipts();
  try {
    console.log('Start: Fetcing all Vendor Receipts from Simpro API ');
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
    console.log('End: Fetcing all Vendor Receipts from Simpro API ');
  } catch (err) {
    console.log(err);
  }
}

async function clearVendorReceipts() {
  try {
    await VendorReceipt.deleteMany();
  } catch (err) {
    console.log('Error clearing Vendor Receipts:', err);
  }
}

async function fetchVendorReceiptCatalogs() {
  await clearVendorReceiptCatalogs();
  try {
    console.log('Start: Fetcing all Vendor Receipt Catalogs from Simpro API ');
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const vendorOrdersArrForCompany = await VendorOrder.find({ company: companyItem._id });
      for (const vendorOrderItemForCompany of vendorOrdersArrForCompany) {
        const vendorReceiptsArrForVendorOrder = await VendorReceipt.find({
          vendorOrder: vendorOrderItemForCompany._id,
          company: companyItem._id
        });
        for (const vendorReceiptItemForVendorOrder of vendorReceiptsArrForVendorOrder) {
          const pageSize = 250;
          let page = 1;
          while (true) {
            console.log(
              `Fetching Vendor Receipt Catalogs for Company ${companyItem.ID}, Vendor Order ${vendorOrderItemForCompany.ID}, Vendor Receipt ${vendorReceiptItemForVendorOrder.ID}, Page ${page}`
            );
            const response = await fetch(
              `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/vendorOrders/${vendorOrderItemForCompany.ID}/receipts/${vendorReceiptItemForVendorOrder.ID}/catalogs/?page=${page}&pageSize=${pageSize}`,
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
            let vendorReceiptCatalogsArr = await response.json();

            await vendorReceiptCatalog.insertMany(
              vendorReceiptCatalogsArr.map(vendorReceiptCatalogItem => ({
                ID: vendorReceiptCatalogItem.Catalog.ID,
                PartNo: vendorReceiptCatalogItem.Catalog.PartNo,
                Name: vendorReceiptCatalogItem.Catalog.Name,
                vendorReceipt: new mongoose.Types.ObjectId(vendorReceiptItemForVendorOrder._id),
                vendorOrder: new mongoose.Types.ObjectId(vendorOrderItemForCompany._id),
                company: new mongoose.Types.ObjectId(companyItem._id)
              }))
            );

            if (vendorReceiptCatalogsArr.length < pageSize) break;

            page++;
          }
        }
      }
    }
    console.log('End: Fetcing all Vendor Receipt Catalogs from Simpro API ');
  } catch (err) {
    console.log(err);
  }
}
async function clearVendorReceiptCatalogs() {
  try {
    await vendorReceiptCatalog.deleteMany();
  } catch (err) {
    console.log('Error clearing Vendor Receipt Catalogs:', err);
  }
}

export { fetchVendorOrders, fetchVendorOrderCatalogs, fetchVendorReceipts, fetchVendorReceiptCatalogs };
