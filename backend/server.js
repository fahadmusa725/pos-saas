const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const { createApp } = require('./src/app');

connectDB();

// Local development entry: all Express setup lives in src/app.js
const app = createApp();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
