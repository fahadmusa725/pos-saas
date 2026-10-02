const DemoRequest = require('../models/DemoRequest');
const sendEmail = require('../utils/sendEmail');

// @desc    Create a demo request (public, no auth)
// @route   POST /api/demo-requests
// @access  Public
const createDemoRequest = async (req, res) => {
  try {
    const { name, restaurantName, email, phone, message } = req.body;

    if (!name || !restaurantName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, restaurant name, email and phone are required',
      });
    }

    const demoRequest = await DemoRequest.create({
      name,
      restaurantName,
      email,
      phone,
      message: message || '',
    });

    // Best-effort notification — failure here must never fail the request,
    // since the demo request is already saved to the database.
    try {
      await sendEmail({
        to: process.env.NOTIFY_EMAIL,
        subject: `New Demo Request — ${restaurantName}`,
        text: `A new demo request has been submitted.

Name: ${name}
Restaurant: ${restaurantName}
Email: ${email}
Phone: ${phone}
Message: ${message || '—'}
Submitted At: ${demoRequest.createdAt.toLocaleString()}`,
      });
    } catch (emailError) {
      console.log('Demo request notification email failed:', emailError.message);
    }

    res.status(201).json({ success: true, data: demoRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all demo requests
// @route   GET /api/super-admin/demo-requests
// @access  Private (super-admin)
const getDemoRequests = async (req, res) => {
  try {
    const demoRequests = await DemoRequest.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: demoRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update demo request status
// @route   PATCH /api/super-admin/demo-requests/:id/status
// @access  Private (super-admin)
const updateDemoRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'contacted', 'converted'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const demoRequest = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!demoRequest) {
      return res.status(404).json({ success: false, message: 'Demo request not found' });
    }

    res.status(200).json({ success: true, data: demoRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDemoRequest,
  getDemoRequests,
  updateDemoRequestStatus,
};
