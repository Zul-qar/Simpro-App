import mongoose from 'mongoose';

import Company from '../models/company.js';
import Catalog from '../models/catalog.js';
import CatalogGroup from '../models/catalogGroup.js';

async function fetchCatalogGroups() {
  await clearCatalogGroups();
  try {
    console.log('Start: Fetcing all Material Catalog Groups from Simpro API');
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const pageSize = 250;
      let page = 1;
      while (true) {
        console.log(`Fetching Catalog Groups for Company ${companyItem.ID}, Page ${page}`);
        const response = await fetch(`${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/catalogGroups/`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + process.env.SIMPRO_API_KEY
          }
        });

        if (!response.ok) {
          throw new Error('Request Unsuccessful. Status Code: ' + response.status);
        }

        const catalogGroupsArr = await response.json();
        await CatalogGroup.insertMany(
          catalogGroupsArr.map(catalogGroupItem => ({
            ID: catalogGroupItem.ID,
            Name: catalogGroupItem.Name,
            ParentGroup: catalogGroupItem.ParentGroup
              ? {
                  ID: catalogGroupItem.ParentGroup.ID,
                  Name: catalogGroupItem.ParentGroup.Name
                }
              : null,
            company: new mongoose.Types.ObjectId(companyItem._id)
          }))
        );

        if (catalogGroupsArr.length < pageSize) break;
        page++;
      }
    }
    console.log('End:  Fetcing all Material Catalog Groups from Simpro API');
  } catch (err) {
    console.log(err);
  }
}

async function clearCatalogGroups() {
  try {
    await CatalogGroup.deleteMany();
  } catch (err) {
    console.log('Error clearing Catalog Groups:', err);
  }
}

async function fetchCatalogGroupDetails() {
  try {
    console.log('Start: Fetching Material Catalog Group Details from Simpro API');
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const catalogGroupsArrForCompany = await CatalogGroup.find({ company: companyItem._id });
      for (const catalogGroupItemForCompany of catalogGroupsArrForCompany) {
        console.log(`Fetching details for Company ${companyItem.ID}, Catalog Group ${catalogGroupItemForCompany.ID}`);
        const response = await fetch(
          `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/catalogGroups/${catalogGroupItemForCompany.ID}`,
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

        const catalogGroupDetails = await response.json();
        catalogGroupItemForCompany.DisplayOrder = catalogGroupDetails.DisplayOrder;
        catalogGroupItemForCompany.DateCreated = catalogGroupDetails.DateCreated
          ? new Date(catalogGroupDetails.DateCreated)
          : null;
        catalogGroupItemForCompany.DateModified = catalogGroupDetails.DateModified
          ? new Date(catalogGroupDetails.DateModified)
          : null;
        catalogGroupItemForCompany.IsThirdPartyGroup = catalogGroupDetails.IsThirdPartyGroup;
        catalogGroupItemForCompany.Archived = catalogGroupDetails.Archived;

        await catalogGroupItemForCompany.save();
      }
    }
    console.log('End: Fetching Material Catalog Group Details from Simpro API');
  } catch (err) {
    console.log(err);
  }
}

async function fetchCatalogs() {
  await clearCatalogs();
  try {
    console.log('Start: Fetcing all Material Catalog Items from Simpro API');
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
            company: new mongoose.Types.ObjectId(companyItem._id)
          }))
        );

        if (catalogsArr.length < pageSize) break;
        page++;
      }
    }
    console.log('End:  Fetcing all Material Catalog Items from Simpro API');
  } catch (err) {
    console.log(err);
  }
}

async function clearCatalogs() {
  try {
    await Catalog.deleteMany();
  } catch (err) {
    console.log('Error clearing Catalogs:', err);
  }
}

async function fetchCatalogDetails() {
  try {
    console.log('Start: Fetching Material Catalog Details from Simpro API');
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const catalogsArrForCompany = await Catalog.find({ company: companyItem._id });
      for (const catalogItemForCompany of catalogsArrForCompany) {
        console.log(`Fetching details for Company ${companyItem.ID}, Catalog ${catalogItemForCompany.ID}`);
        const response = await fetch(
          `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/catalogs/${catalogItemForCompany.ID}`,
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

        const catalogDetails = await response.json();
        catalogItemForCompany.Manufacturer = catalogDetails.Manufacturer;
        catalogItemForCompany.Group = catalogDetails.Group
          ? {
              ID: catalogDetails.Group.ID,
              Name: catalogDetails.Group.Name,
              ParentGroup: catalogDetails.Group.ParentGroup
                ? {
                    ID: catalogDetails.Group.ParentGroup.ID,
                    Name: catalogDetails.Group.ParentGroup.Name
                  }
                : null
            }
          : null;
        catalogItemForCompany.Notes = catalogDetails.Notes;
        catalogItemForCompany.DateModified = catalogDetails.DateModified ? new Date(catalogDetails.DateModified) : null;
        catalogItemForCompany.Archived = catalogDetails.Archived;
        await catalogItemForCompany.save();
      }
    }
    console.log('End: Fetching Material Catalog Details from Simpro API');
  } catch (err) {
    console.log(err);
  }
}

async function syncArchivedCatalogs() {
  console.log('Start: Syncing Archived Material Catalog Items with Simpro API');
  try {
    const archivedCatalogsArr = await Catalog.find({ Archived: true }).populate('company');
    for (const archivedCatalogItem of archivedCatalogsArr) {
      const response = await fetch(
        `${process.env.SIMPRO_API_URL}/companies/${archivedCatalogItem.company.ID}/catalogs/${archivedCatalogItem.ID}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + process.env.SIMPRO_API_KEY
          },
          method: 'PATCH',
          body: JSON.stringify({
            Name: archivedCatalogItem.Name,
            Archived: archivedCatalogItem.Archived,
            Notes: archivedCatalogItem.Notes
          })
        }
      );
      if (!response.ok) {
        throw new Error('Request Unsuccessful. Status Code: ' + response.status + '\nError Message: ' + (await response.text()));
      }
    }
  } catch (err) {
    console.log(err);
  }
  console.log('Start: Syncing Archived Material Catalog Items with Simpro API');
}

export { fetchCatalogs, fetchCatalogGroups, fetchCatalogGroupDetails, fetchCatalogDetails, syncArchivedCatalogs };
