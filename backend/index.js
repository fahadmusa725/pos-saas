// Vercel serverless entry (Vercel looks for index.js at the project root).
// Exports the Express app without listening. The Mongo connection is cached across warm
// invocations and a failure is returned as 500 instead of calling process.exit().
const express = require('express');
const mongoose = require('mongoose');
const { createApp } = require('./src/app');

const app = createApp();

let connectionPromise;
const connectOnce = () => {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI).catch((error) => {
      connectionPromise = undefined; // allow a retry on the next invocation
      throw error;
    });
  }
  return connectionPromise;
};

// Thin outer app: connect before Express handles the request.
const serverlessApp = express();
serverlessApp.use(async (req, res, next) => {
  try {
    await connectOnce();
    next();
  } catch (error) {
    console.error('[Serverless] MongoDB connection failed:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
serverlessApp.use(app);

module.exports = serverlessApp;
