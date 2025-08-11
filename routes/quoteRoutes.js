const express = require('express');

const quoteController = require('../controllers/quoteController');

const router = express.Router();

router.get('/allquotes', quoteController.getQuotes);

module.exports = router;