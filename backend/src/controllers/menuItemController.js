const MenuItem = require('../models/MenuItem');

// @desc Create menu item
// @route POST /api/menu-items
exports.createMenuItem = async (req, res) => {
  try {
    const { categoryId, name, description, price, image, variants, addOns, isVeg } = req.body;

    if (!categoryId || !name || price === undefined) {
      return res.status(400).json({ success: false, message: 'categoryId, name and price are required' });
    }

    const menuItem = await MenuItem.create({
      restaurantId: req.tenantId,
      categoryId,
      name,
      description,
      price,
      image,
      variants,
      addOns,
      isVeg,
    });

    res.status(201).json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all menu items (optionally filter by category)
// @route GET /api/menu-items
exports.getMenuItems = async (req, res) => {
  try {
    const filter = { restaurantId: req.tenantId };
    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    }

    const menuItems = await MenuItem.find(filter).populate('categoryId', 'name').sort('displayOrder');

    res.status(200).json({ success: true, count: menuItems.length, data: menuItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get single menu item
// @route GET /api/menu-items/:id
exports.getMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findOne({ _id: req.params.id, restaurantId: req.tenantId }).populate(
      'categoryId',
      'name'
    );

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.status(200).json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update menu item
// @route PUT /api/menu-items/:id
exports.updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findOne({ _id: req.params.id, restaurantId: req.tenantId });

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const fields = ['categoryId', 'name', 'description', 'price', 'image', 'variants', 'addOns', 'isVeg', 'isAvailable', 'displayOrder'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        menuItem[field] = req.body[field];
      }
    });

    await menuItem.save();

    res.status(200).json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete menu item
// @route DELETE /api/menu-items/:id
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findOneAndDelete({ _id: req.params.id, restaurantId: req.tenantId });

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.status(200).json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};