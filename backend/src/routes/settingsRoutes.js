const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant);

router.get('/', getSettings);
router.put('/', authorize('restaurant-admin'), updateSettings);

module.exports = router;
