const express = require('express');

const prebuildController = require('../controllers/prebuildController');

const router = express.Router();

router.get('/allprebuilds', prebuildController.getPrebuilds);
router.get('/prebuildcatalogs', prebuildController.getPrebuildCatalogs)

module.exports = router;