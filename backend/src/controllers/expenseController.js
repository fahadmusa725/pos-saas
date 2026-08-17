const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// @desc    Get expenses (optional date range filter)
// @route   GET /api/expenses?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const filter = { restaurantId: req.tenantId };

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // End date ko din ke aakhri second tak cover karne ke liye (23:59:59.999)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.status(200).json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get expense summary grouped by category for date range
// @route   GET /api/expenses/summary?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getExpenseSummary = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const matchStage = { restaurantId: new mongoose.Types.ObjectId(req.tenantId) };

    if (category) {
      matchStage.category = category;
    }

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) {
        matchStage.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.date.$lte = end;
      }
    }

    const summary = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalExpense = summary.reduce((acc, curr) => acc + curr.totalAmount, 0);

    res.status(200).json({
      success: true,
      totalExpense,
      byCategory: summary,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private (restaurant-admin)
const createExpense = async (req, res) => {
  try {
    const { category, amount, date, description } = req.body;

    if (!category || !amount) {
      return res.status(400).json({ success: false, message: 'Category and amount are required' });
    }

    const expense = await Expense.create({
      restaurantId: req.tenantId,
      category,
      amount: Number(amount),
      date: date || Date.now(),
      description: description?.trim() || '',
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (restaurant-admin)
const updateExpense = async (req, res) => {
  try {
    const { category, amount, date, description } = req.body;

    const expense = await Expense.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (category !== undefined) expense.category = category;
    if (amount !== undefined) expense.amount = Number(amount);
    if (date !== undefined) expense.date = date;
    if (description !== undefined) expense.description = description.trim();

    await expense.save();
    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (restaurant-admin)
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await expense.deleteOne();
    res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
};
