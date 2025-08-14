// routes/businessRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Connect to the establishments database
const establishmentsDB = mongoose.createConnection('mongodb://localhost:27017/establishments');
establishmentsDB.on('error', console.error.bind(console, 'Establishments DB connection error:'));
establishmentsDB.once('open', () => {
  console.log('✅ Establishments MongoDB connected');
});

// Define Business Schema
const businessSchema = new mongoose.Schema({
  "ACCOUNT NO": String,
  "STATUS": String,
  "APPLICATION STATUS": String,
  "Name of Business": String,
  "Name of owner": String,
  "Address": String,
  "Barangay": String,
  "Nature of Business": String
}, { collection: 'business' });

const Business = establishmentsDB.model('Business', businessSchema);

// Get all businesses
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all businesses...');
    const businesses = await Business.find({});
    console.log(`Found ${businesses.length} businesses`);
    
    // Log the first original business
    if (businesses.length > 0) {
      console.log('First original business:', businesses[0]);
      console.log('Keys in first original business:', Object.keys(businesses[0]));
    }
    
    // Normalize the property names
    const normalizedBusinesses = businesses.map(business => {
      const normalized = {
        accountNo: business['ACCOUNT NO'],
        status: business['STATUS'],
        applicationStatus: business['APPLICATION STATUS'],
        businessName: business['Name of Business'],
        ownerName: business['Name of owner'],
        address: business['Address'],
        barangay: business['Barangay'],
        natureOfBusiness: business['Nature of Business']
      };
      
      // DEBUG: Log the first normalized business
      if (businesses.indexOf(business) === 0) {
        console.log('Normalized business:', normalized);
        console.log('Keys in normalized business:', Object.keys(normalized));
      }
      
      return normalized;
    });
    
    // Log the first few normalized businesses
    console.log('First 3 normalized businesses:', normalizedBusinesses.slice(0, 3));
    
    res.json(normalizedBusinesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('Fetching business stats...');
    
    // Total businesses count
    const totalBusinesses = await Business.countDocuments();
    console.log(`Total businesses: ${totalBusinesses}`);
    
    // Count by status
    const highRiskCount = await Business.countDocuments({ "STATUS": "HIGHRISK" });
    const lowRiskCount = await Business.countDocuments({ "STATUS": "LOWRISK" });
    console.log(`High risk: ${highRiskCount}, Low risk: ${lowRiskCount}`);
    
    // Count by barangay
    const barangayStats = await Business.aggregate([
      { $group: { _id: "$Barangay", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Barangay stats:', barangayStats);
    
    res.json({
      totalBusinesses,
      statusCounts: {
        HIGHRISK: highRiskCount,
        LOWRISK: lowRiskCount
      },
      barangayStats
    });
  } catch (error) {
    console.error('Error fetching business stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search businesses
router.get('/search', async (req, res) => {
  try {
    const { query, field } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    console.log(`Searching for: ${query} in field: ${field || 'all fields'}`);
    
    let businesses;
    
    // If field is specified as accountNo, search only in that field
    if (field === 'accountNo') {
      businesses = await Business.find({ "ACCOUNT NO": { $regex: query, $options: 'i' } });
    } else {
      // Default: search in multiple fields (original behavior)
      businesses = await Business.find({
        $or: [
          { "Name of Business": { $regex: query, $options: 'i' } },
          { "Name of owner": { $regex: query, $options: 'i' } },
          { "Barangay": { $regex: query, $options: 'i' } },
          { "Nature of Business": { $regex: query, $options: 'i' } },
          { "Address": { $regex: query, $options: 'i' } }
        ]
      });
    }
    
    console.log(`Found ${businesses.length} businesses`);
    
    // Normalize the property names
    const normalizedBusinesses = businesses.map(business => {
      return {
        accountNo: business['ACCOUNT NO'],
        status: business['STATUS'],
        applicationStatus: business['APPLICATION STATUS'],
        businessName: business['Name of Business'],
        ownerName: business['Name of owner'],
        address: business['Address'],
        barangay: business['Barangay'],
        natureOfBusiness: business['Nature of Business']
      };
    });
    
    res.json(normalizedBusinesses);
  } catch (error) {
    console.error('Error searching businesses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;