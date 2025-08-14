// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB for auth
mongoose.connect('mongodb://localhost:27017/logindb')
  .then(() => console.log('✅ Auth MongoDB connected'))
  .catch((err) => {
    console.error('❌ Auth MongoDB connection error:', err);
    process.exit(1); // Exit if auth DB fails
  });

// Create establishmentsDB connection BEFORE requiring businessRoutes
const establishmentsDB = mongoose.createConnection('mongodb://localhost:27017/establishments');
establishmentsDB.on('error', (err) => {
  console.error('❌ Establishments DB connection error:', err);
});
establishmentsDB.once('open', () => {
  console.log('✅ Establishments MongoDB connected');
});

// Export establishmentsDB so it can be imported by other modules
module.exports = { establishmentsDB };

// Now require businessRoutes AFTER establishing the connection
const businessRoutes = require('./routes/businessRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Dashboard.html route (for backward compatibility)
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Businesses route
app.get('/businesses', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'businesses.html'));
});

// Root route - serves login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404 for any other routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});