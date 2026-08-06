const express = require('express');
const router = express.Router();
const {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

// checkPermission('expenses') — restaurant-admin always passes, others need 'expenses' in permissions[]
router.use(protect, setTenant, checkPermission('expenses'));

// /summary must be defined before /:id
router.get('/summary', getExpenseSummary);

router.route('/')
  .get(getExpenses)
  .post(createExpense);

router.route('/:id')
  .put(updateExpense)
  .delete(deleteExpense);

module.exports = router;
