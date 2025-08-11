const express = require('express');

const catalogController= require('../controllers/catalogControllers');

const router = express.Router();

router.get('/allcatalogs', catalogController.getCatalogs);
router.get('/groups', catalogController.getCatalogGroups);

module.exports = router;