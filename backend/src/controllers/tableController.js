const Table = require('../models/Table');

exports.createTable = async (req, res) => {
  try {
    const { tableNumber, capacity } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ success: false, message: 'Table number is required' });
    }

    const table = await Table.create({
      restaurantId: req.tenantId,
      tableNumber,
      capacity,
    });

    res.status(201).json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find({ restaurantId: req.tenantId }).sort('tableNumber');
    res.status(200).json({ success: true, count: tables.length, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const table = await Table.findOne({ _id: req.params.id, restaurantId: req.tenantId });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const { tableNumber, capacity, status } = req.body;
    if (tableNumber !== undefined) table.tableNumber = tableNumber;
    if (capacity !== undefined) table.capacity = capacity;
    if (status !== undefined) table.status = status;

    await table.save();

    res.status(200).json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const table = await Table.findOneAndDelete({ _id: req.params.id, restaurantId: req.tenantId });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.status(200).json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};