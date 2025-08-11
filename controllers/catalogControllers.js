exports.getCatalogs = async (req, res, next) => {
  const companyID = req.query.companyID;
  const page = req.query.page;
  const pageSize = 250;

  try {
    const response = await fetch(
      `${process.env.SIMPRO_API_URL}/companies/${companyID}/catalogs/?page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.SIMPRO_API_KEY
        }
      }
    );

    if (!response.ok) {
      const error = new Error('Request Unsuccessful');
      error.statusCode = response.status;
      throw error;
    }

    const result = await response.json();
    res.status(200).json({ message: 'Catalog Items', catalogs: result });
  } catch (err) {
    return next(err);
  }
};

exports.getCatalogGroups = async (req, res, next) => {
  const companyID = req.query.companyID;
  try {
    const response = await fetch(
      `${process.env.SIMPRO_API_URL}/companies/${companyID}/catalogGroups/`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.SIMPRO_API_KEY
        }
      }
    );

    if (!response.ok) {
      const error = new Error('Request Unsuccessful');
      error.statusCode = response.status;
      throw error;
    }

    const result = await response.json();
    res.status(200).json({ message: 'Catalog Groups', catalogsGroups: result });
  } catch (err) {
    return next(err);
  }
};
