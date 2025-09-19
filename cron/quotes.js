import Company from '../models/company.js';
import Quote from '../models/quote.js';
import QuoteCostCenter from '../models/quoteCostCenter.js';
import QuoteCostCenterCatalog from '../models/quoteCostCenterCatalog.js';

async function fetchQuotes() {
  await clearQuotes();
  try {
    console.log('Start: Fetcing all Quotes from Simpro API ');
    const companiesArr = await Company.find();
    for (const companyItem of companiesArr) {
      const pageSize = 250;
      let page = 1;
      while (true) {
        console.log(`Fetching Quote for company ${companyItem.ID}, page ${page}`);
        const response = await fetch(
          `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/quotes/?IsClosed=false&page=${page}&pageSize=${pageSize}`,
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

        let quoteArr = await response.json();

        await Quote.insertMany(
          quoteArr.map(quoteItem => ({
            ID: quoteItem.ID,
            Description: quoteItem.Description,
            Total: {
              ExTax: quoteItem.Total.ExTax,
              Tax: quoteItem.Total.Tax,
              IncTax: quoteItem.Total.IncTax
            },
            IsClosed: quoteItem.IsClosed,
            company: companyItem._id
          }))
        );

        if (quoteArr.length < pageSize) break;

        page++;
      }
    }
    console.log('End: Fetcing all Quotes from Simpro API ');
  } catch (err) {
    console.log(err);
  }
}

async function clearQuotes() {
  try {
    await Quote.deleteMany();
  } catch (err) {
    console.log('Error clearing Quotes:', err);
  }
}

async function fetchAndMergeQuoteDetails() {
  console.log('Start: Fetching Quote details and merging with Quotes');
  try {
    const quotesArr = await Quote.find().populate('company');

    for (const quoteItem of quotesArr) {
      console.log(`Fetching Quote detail for Company: ${quoteItem.company.ID} and Quote: ${quoteItem.ID} `);
      const response = await fetch(`${process.env.SIMPRO_API_URL}/companies/${quoteItem.company.ID}/quotes/${quoteItem.ID}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SIMPRO_API_KEY}`
        }
      });

      if (!response.ok) {
        console.error(`Failed for company: ${quoteItem.company.ID} quote ${quoteItem.ID}: ${response.status}`);
        return;
      }

      const quoteDetailItem = await response.json();
      quoteItem['DateIssued'] = new Date(quoteDetailItem['DateIssued']);

      await quoteItem.save();
    }
    console.log('End: Fetching Quote details and merging with Quotes');
  } catch (err) {
    console.log(err);
  }
}

async function fetchQuoteCostCenters() {
  await clearQuoteCostCenters();
  try {
    console.log("Start: Fetching Quote Cost Centers from Simpro API");
    const companiesArr = await Company.find();

    for (const companyItem of companiesArr) {
      const pageSize = 250;
      let page = 1;
      while (true) {
        console.log(`Fetching Quote Cost Centers for company ${companyItem.ID}, page ${page}`);
        const response = await fetch(
          `${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/quoteCostCenters/?page=${page}&pageSize=${pageSize}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + process.env.SIMPRO_API_KEY
            }
          }
        );

        if (!response.ok) throw new Error("Request Unsuccessful. Status Code: " + response.status);

        const dataArr = await response.json();

        await QuoteCostCenter.insertMany(
          dataArr.map(item => ({
            ID: item.ID,
            Name: item.Name,
            CostCenter: item.CostCenter,
            Quote: item.Quote,
            Section: item.Section,
            DateModified: new Date(item.DateModified),
            _href: item._href,
            company: companyItem._id
          }))
        );

        if (dataArr.length < pageSize) break;
        page++;
      }
    }
    console.log("End: Fetching Quote Cost Centers from Simpro API");
  } catch (err) {
    console.log(err);
  }
}

async function clearQuoteCostCenters() {
  try {
    await QuoteCostCenter.deleteMany();
  } catch (err) {
    console.log("Error clearing Quote Cost Centers:", err);
  }
}

async function fetchQuoteCostCenterCatalogs() {
  await clearQuoteCostCenterCatalogs();
  try {
    console.log("Start: Fetching Quote Cost Center Catalogs");
    const companiesArr = await Company.find();

    for (const companyItem of companiesArr) {
      const costCenters = await QuoteCostCenter.find({ company: companyItem._id });

      for (const cc of costCenters) {
        console.log(`Fetching Catalogs for QuoteCostCenter ${cc.ID} (Company ${companyItem.ID})`);

        const response = await fetch(`${process.env.SIMPRO_API_URL}/companies/${companyItem.ID}/quotes/${cc.Quote.ID}/sections/${cc.Section.ID}/costCenters/${cc.ID}/catalogs/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.SIMPRO_API_KEY
          }
        });

        if (!response.ok) {
          console.error(`Failed fetching catalogs for QuoteCostCenter ${cc.ID}: ${response.status}`);
          continue;
        }

        const catalogsArr = await response.json();

        await QuoteCostCenterCatalog.insertMany(
          catalogsArr.map(item => ({
            QuoteCostCenterID: cc._id,
            Catalog: item.Catalog,
            Quantity: item.Total.Qty,
            company: companyItem._id
          }))
        );
      }
    }

    console.log("End: Fetching Quote Cost Center Catalogs");
  } catch (err) {
    console.error("Error fetching Quote Cost Center Catalogs:", err);
  }
}

async function clearQuoteCostCenterCatalogs() {
  try {
    await QuoteCostCenterCatalog.deleteMany();
  } catch (err) {
    console.log("Error clearing Quote Cost Center Catalogs:", err);
  }
}

export { fetchQuotes, fetchAndMergeQuoteDetails, fetchQuoteCostCenters, fetchQuoteCostCenterCatalogs };
