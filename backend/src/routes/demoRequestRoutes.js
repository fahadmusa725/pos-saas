const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { createDemoRequest } = require('../controllers/demoRequestController');

const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many demo requests, please try again later' },
});

// Public route: potential customers have no account yet
router.post('/', demoLimiter, createDemoRequest);

module.exports = router;
