const express = require('express');
const router = express.Router();
const { createDemoRequest } = require('../controllers/demoRequestController');

// Public route — potential customers have no account yet
router.post('/', createDemoRequest);

module.exports = router;
