const getPrebuilds = async (req, res, next) => {
  const companyID = req.query.companyID;
  const pageSize = 250;
  let page = 1;
  let allPrebuilds = [];

  while (true) {
    try {
      const response = await fetch(
        `${process.env.SIMPRO_API_URL}/companies/${companyID}/prebuilds/?page=${page}&pageSize=${pageSize}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + process.env.SIMPRO_API_KEY
          }
        }
      );

      if (!response.ok) {
        const error = new Error('Request unsuccessful');
        error.statusCode = response.status;
        throw error;
      }
      const result = await response.json();
      // Filtering prebuilds items that are archived
      const filteredPrebuilds = result.filter(prebuildItem => {
        return prebuildItem['Archived'] === false;
      });
      allPrebuilds = allPrebuilds.concat(filteredPrebuilds);

      if (result.length < pageSize) {
        break;
      }

      page++;
    } catch (err) {
      return next(err);
    }
  }
  res.status(200).json({ message: 'Prebuilds List', prebuilds: allPrebuilds });
};

const getPrebuildCatalogs = async (req, res, next) => {
  const companyID = req.query.companyID;
  const prebuildID = req.query.prebuildID;
  const pageSize = 250;
  let page = 1;
  let allCatalogs = [];

  while (true) {
    try {
      const response = await fetch(
        `${process.env.SIMPRO_API_URL}/companies/${companyID}/prebuilds/${prebuildID}/catalogs/?page=${page}&pageSize=${pageSize}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + process.env.SIMPRO_API_KEY
          }
        }
      );

      if (!response.ok) {
        const error = new Error('Request unsuccessful');
        error.statusCode = response.status;
        throw error;
      }

      let result = await response.json();
      allCatalogs = allCatalogs.concat(result);
      if (result.length < pageSize) break;
      page++;
    } catch (err) {
      return next(err);
    }
  }
  res.status(200).json({ message: 'Prebuilds List', catalogs: allCatalogs });
};

export { getPrebuilds, getPrebuildCatalogs };
