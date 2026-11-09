const express = require('express');
const router = express.Router();
const { getRealtimeToken } = require('../controllers/realtimeController');
const { protect } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.get('/token', protect, setTenant, getRealtimeToken);

module.exports = router;
