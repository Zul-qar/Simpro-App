const express = require('express');

const jobController = require('../controllers/jobController');

const router = express.Router();

router.get('/alljobs', jobController.getJobs)

module.exports = router;