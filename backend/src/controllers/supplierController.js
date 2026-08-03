const Supplier = require('../models/Supplier');

// @desc    Get all suppliers for current tenant
// @route   GET /api/suppliers
// @access  Private (restaurant-admin only)
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ restaurantId: req.tenantId }).sort({ name: 1 });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new supplier
// @route   POST /api/suppliers
// @access  Private (restaurant-admin only)
const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, itemsSupplied } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const supplier = await Supplier.create({
      restaurantId: req.tenantId,
      name: name.trim(),
      contactPerson: contactPerson?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      address: address?.trim() || '',
      itemsSupplied: itemsSupplied?.trim() || '',
    });

    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update supplier info
// @route   PUT /api/suppliers/:id
// @access  Private (restaurant-admin only)
const updateSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, itemsSupplied } = req.body;

    const supplier = await Supplier.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    if (name !== undefined)          supplier.name          = name.trim();
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson.trim();
    if (phone !== undefined)         supplier.phone         = phone.trim();
    if (email !== undefined)         supplier.email         = email.trim();
    if (address !== undefined)       supplier.address       = address.trim();
    if (itemsSupplied !== undefined) supplier.itemsSupplied = itemsSupplied.trim();

    await supplier.save();
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (restaurant-admin only)
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    await supplier.deleteOne();
    res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
