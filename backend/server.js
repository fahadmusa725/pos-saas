const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const menuItemRoutes = require('./src/routes/menuItemRoutes');
const tableRoutes = require('./src/routes/tableRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const staffRoutes = require('./src/routes/staffRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const purchaseOrderRoutes = require('./src/routes/purchaseOrderRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const couponRoutes = require('./src/routes/couponRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const demoRequestRoutes = require('./src/routes/demoRequestRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

// Build CORS origin allowlist from CLIENT_URL env (comma-separated for multiple origins)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173'];

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

// Socket.io JWT auth middleware: verifies token, joins room from DB (not client input)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const User = require('./src/models/User');
    const user = await User.findById(decoded.id).select('restaurantId role isActive');
    if (!user || !user.isActive) {
      return next(new Error('User not found or deactivated'));
    }

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  // Join the room for the user's own restaurant (from DB, not client input)
  if (socket.user && socket.user.restaurantId) {
    socket.join(socket.user.restaurantId.toString());
  }
});

// io ko har request mein available karo (controllers use kar sakein)
app.use((req, res, next) => {
  req.io = io;
  next();
});

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

// Central error handler: never expose error.message to clients in production
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

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});