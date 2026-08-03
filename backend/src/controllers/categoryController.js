const Category = require('../models/Category');

// @desc Create category
// @route POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, description, displayOrder } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const category = await Category.create({
      restaurantId: req.tenantId,
      name,
      description,
      displayOrder,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all categories for the restaurant
// @route GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ restaurantId: req.tenantId }).sort('displayOrder');
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update category
// @route PUT /api/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, restaurantId: req.tenantId });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, displayOrder, isActive } = req.body;

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete category
// @route DELETE /api/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, restaurantId: req.tenantId });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};