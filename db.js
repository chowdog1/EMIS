// db.js
const mongoose = require('mongoose');

// Create establishmentsDB connection
const establishmentsDB = mongoose.createConnection('mongodb://localhost:27017/establishments');

establishmentsDB.on('error', (err) => {
  console.error('❌ Establishments DB connection error:', err);
});

establishmentsDB.once('open', () => {
  console.log('✅ Establishments MongoDB connected');
});

// Export the connection
module.exports = { establishmentsDB };