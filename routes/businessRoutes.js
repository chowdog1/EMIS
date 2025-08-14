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

// Define Business Schema with updated fields
const businessSchema = new mongoose.Schema({
  "ACCOUNT NO": String,
  "DATE OF APPLICATION": Date,
  "OR NO": String,
  "AMOUNT PAID": Number,
  "DATE OF PAYMENT": Date,
  "STATUS": String,
  "APPLICATION STATUS": String,
  "NAME OF BUSINESS": String,
  "NAME OF OWNER": String,
  "ADDRESS": String,
  "BARANGAY": String,
  "NATURE OF BUSINESS": String
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
        dateOfApplication: business['DATE OF APPLICATION'],
        orNo: business['OR NO'],
        amountPaid: business['AMOUNT PAID'],
        dateOfPayment: business['DATE OF PAYMENT'],
        status: business['STATUS'],
        applicationStatus: business['APPLICATION STATUS'],
        businessName: business['NAME OF BUSINESS'],
        ownerName: business['NAME OF OWNER'],
        address: business['ADDRESS'],
        barangay: business['BARANGAY'],
        natureOfBusiness: business['NATURE OF BUSINESS']
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
    
    // Count businesses with no payments (amount paid is 0, null, or field doesn't exist)
    const renewalPendingCount = await Business.countDocuments({
      $or: [
        { "AMOUNT PAID": { $exists: false } }, // Field doesn't exist
        { "AMOUNT PAID": null }, // Field exists but is null
      ]
    });
    console.log(`Businesses with no payments: ${renewalPendingCount}`);
    
    // Count active businesses (have payment record regardless of amount)
    const activeBusinessesCount = await Business.countDocuments({
      "AMOUNT PAID": { $exists: true, $ne: null }
    });
    console.log(`Active businesses: ${activeBusinessesCount}`);
    
    // Count by application status
    const renewalCount = await Business.countDocuments({ "APPLICATION STATUS": "RENEWAL" });
    const newCount = await Business.countDocuments({ "APPLICATION STATUS": "NEW" });
    console.log(`Application status - Renewal: ${renewalCount}, New: ${newCount}`);
    
    // Count by barangay
    const barangayStats = await Business.aggregate([
      { $group: { _id: "$BARANGAY", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Barangay stats:', barangayStats);
    
    // Calculate total amount paid
    const totalAmountResult = await Business.aggregate([
      { $group: { _id: null, totalAmount: { $sum: "$AMOUNT PAID" } } }
    ]);
    const totalAmountPaid = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    console.log(`Total amount paid: ${totalAmountPaid}`);
    
    res.json({
      totalBusinesses,
      activeBusinessesCount,
      statusCounts: {
        HIGHRISK: highRiskCount,
        LOWRISK: lowRiskCount
      },
      renewalPendingCount,
      applicationStatusCounts: {
        RENEWAL: renewalCount,
        NEW: newCount
      },
      barangayStats,
      totalAmountPaid
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
    
    // Search based on the specified field
    switch (field) {
      case 'accountNo':
        businesses = await Business.find({ "ACCOUNT NO": { $regex: query, $options: 'i' } });
        break;
      case 'businessName':
        businesses = await Business.find({ "NAME OF BUSINESS": { $regex: query, $options: 'i' } });
        break;
      case 'ownerName':
        businesses = await Business.find({ "NAME OF OWNER": { $regex: query, $options: 'i' } });
        break;
      case 'barangay':
        businesses = await Business.find({ "BARANGAY": { $regex: query, $options: 'i' } });
        break;
      default:
        // Default: search in multiple fields
        businesses = await Business.find({
          $or: [
            { "ACCOUNT NO": { $regex: query, $options: 'i' } },
            { "NAME OF BUSINESS": { $regex: query, $options: 'i' } },
            { "NAME OF OWNER": { $regex: query, $options: 'i' } },
            { "BARANGAY": { $regex: query, $options: 'i' } },
            { "NATURE OF BUSINESS": { $regex: query, $options: 'i' } },
            { "APPLICATION STATUS": { $regex: query, $options: 'i' } }
          ]
        });
    }
    
    console.log(`Found ${businesses.length} businesses`);
    
    // Normalize the property names
    const normalizedBusinesses = businesses.map(business => {
      return {
        accountNo: business['ACCOUNT NO'],
        dateOfApplication: business['DATE OF APPLICATION'],
        orNo: business['OR NO'],
        amountPaid: business['AMOUNT PAID'],
        dateOfPayment: business['DATE OF PAYMENT'],
        status: business['STATUS'],
        applicationStatus: business['APPLICATION STATUS'],
        businessName: business['NAME OF BUSINESS'],
        ownerName: business['NAME OF OWNER'],
        address: business['ADDRESS'],
        barangay: business['BARANGAY'],
        natureOfBusiness: business['NATURE OF BUSINESS']
      };
    });
    
    res.json(normalizedBusinesses);
  } catch (error) {
    console.error('Error searching businesses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;