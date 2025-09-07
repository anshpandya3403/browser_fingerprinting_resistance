// server.js
const express = require('express');
const connectDB = require('./db');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to Atlas
connectDB();

// Define schema/model for reporting
const eventSchema = new mongoose.Schema({
  api: String,
  site: String,
  timestamp: { type: Date, default: Date.now }
});
const Event = mongoose.model('Event', eventSchema);

// Dummy reporting endpoint
app.post('/report', async (req, res) => {
  try {
    const { api, site, ts } = req.body;
    await Event.create({ api, site, timestamp: ts ? new Date(ts) : undefined });
    res.status(201).send({ status: 'Reported' });
  } catch (err) {
    console.error('Error saving report:', err);
    res.status(500).send({ error: 'Failed to save event' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
