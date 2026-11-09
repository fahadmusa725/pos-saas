const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const { createApp } = require('./src/app');

connectDB();

// All Express, Socket.io and error handling setup lives in src/app.js
const { server } = createApp();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
