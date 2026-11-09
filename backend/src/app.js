// Standalone Express app export for testing and serverless (no DB connection here).
// server.js connects the DB and listens locally; index.js is the Vercel entry.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const tableRoutes = require('./routes/tableRoutes');
const orderRoutes = require('./routes/orderRoutes');
const staffRoutes = require('./routes/staffRoutes');
const customerRoutes = require('./routes/customerRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const couponRoutes = require('./routes/couponRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const demoRequestRoutes = require('./routes/demoRequestRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');

function createApp() {
  const app = express();

  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
    : ['http://localhost:5173'];

  app.use(express.json());
  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // Controllers answer some failures directly (without next(err)). Mask those 5xx
  // bodies in production so internal error messages never reach clients.
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') return next();
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 500 && body && typeof body === 'object' && !Array.isArray(body)) {
        return json({ success: false, message: 'Internal server error' });
      }
      return json(body);
    };
    next();
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
  });

  app.get('/', (req, res) => {
    res.json({ message: 'POS SaaS API is running...' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/menu-items', menuItemRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/purchase-orders', purchaseOrderRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/super-admin', superAdminRoutes);
  app.use('/api/demo-requests', demoRequestRoutes);
  app.use('/api/realtime', realtimeRoutes);

  // Central error handler
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    if (statusCode >= 500) {
      console.error('[Server Error]', err);
      const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;
      return res.status(statusCode).json({ success: false, message });
    }
    res.status(statusCode).json({ success: false, message: err.message });
  });

  return app;
}

module.exports = { createApp };

