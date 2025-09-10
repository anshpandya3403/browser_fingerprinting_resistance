// db.js
require('dotenv').config();
const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect('mongodb+srv://anshpandya3403:hSpBwh08iGEuUDeL@messages.sfzxxpr.mongodb.net/?retryWrites=true&w=majority&appName=Messages', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to Atlas:', error);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('Lost connection to MongoDB Atlas');
  });
}

module.exports = connectDB;
