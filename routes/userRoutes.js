const express = require('express');

const userController = require('../controllers/userController');

const router = express.Router();

router.get('/companies', userController.getCompanies);

module.exports = router;