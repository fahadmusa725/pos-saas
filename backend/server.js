const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
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

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Har restaurant apne khud ke "room" mein join karega
  socket.on('joinRestaurant', (restaurantId) => {
    socket.join(restaurantId);
    console.log(`Socket ${socket.id} joined restaurant room: ${restaurantId}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// io ko har request mein available karo (controllers use kar sakein)
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(cors());
app.use(helmet());

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

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});