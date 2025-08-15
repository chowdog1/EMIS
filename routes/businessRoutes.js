// routes/businessRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { establishmentsDB } = require('../db'); // Import from db.js

// Check if establishmentsDB is available
if (!establishmentsDB) {
  console.error('❌ Establishments DB connection not available');
}

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

// Create the Business model only if the connection is available
let Business;
if (establishmentsDB) {
  Business = establishmentsDB.model('Business', businessSchema);
} else {
  console.error('❌ Cannot create Business model - database connection not available');
}

// Get all businesses
router.get('/', async (req, res) => {
  try {
    if (!Business) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
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
    if (!Business) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
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
    if (!Business) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
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

// Get business by account number
router.get('/account/:accountNo', async (req, res) => {
  try {
    if (!Business) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { accountNo } = req.params;
    console.log(`Fetching business with account number: "${accountNo}"`);
    
    // Check if database connection is ready
    if (establishmentsDB.readyState !== 1) {
      console.error('Database connection not ready. State:', establishmentsDB.readyState);
      return res.status(500).json({ message: 'Database connection not ready' });
    }
    
    // Try multiple query approaches to find the business
    let business;
    
    // First try: exact match
    business = await Business.findOne({ "ACCOUNT NO": accountNo });
    
    // If not found, try case-insensitive match
    if (!business) {
      console.log(`Exact match not found, trying case-insensitive search for "${accountNo}"`);
      business = await Business.findOne({ 
        "ACCOUNT NO": { $regex: new RegExp(`^${accountNo}$`, 'i') } 
      });
    }
    
    // If still not found, try partial match (in case of formatting differences)
    if (!business) {
      console.log(`Case-insensitive match not found, trying partial match for "${accountNo}"`);
      business = await Business.findOne({ 
        "ACCOUNT NO": { $regex: accountNo, $options: 'i' } 
      });
    }
    
    if (!business) {
      console.log(`No business found with account number: "${accountNo}"`);
      
      // List some account numbers for debugging
      const sampleBusinesses = await Business.find({}).limit(5);
      console.log('Sample account numbers in database:');
      sampleBusinesses.forEach((b, i) => {
        console.log(`${i+1}: "${b['ACCOUNT NO']}"`);
      });
      
      return res.status(404).json({ message: 'Business not found' });
    }
    
    console.log('Business found:', business);
    
    // Normalize the property names
    const normalizedBusiness = {
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
    
    res.json(normalizedBusiness);
  } catch (error) {
    console.error('Error fetching business by account number:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update business by account number
router.put('/account/:accountNo', async (req, res) => {
  try {
    if (!Business) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { accountNo } = req.params;
    console.log(`Updating business with account number: "${accountNo}"`);
    
    // Check if database connection is ready
    if (establishmentsDB.readyState !== 1) {
      console.error('Database connection not ready. State:', establishmentsDB.readyState);
      return res.status(500).json({ message: 'Database connection not ready' });
    }
    
    // Find the business
    let business = await Business.findOne({ "ACCOUNT NO": accountNo });
    
    if (!business) {
      console.log(`No business found with account number: "${accountNo}"`);
      return res.status(404).json({ message: 'Business not found' });
    }
    
    // Update business with new data
    const updateData = {
      "NAME OF BUSINESS": req.body.businessName,
      "NAME OF OWNER": req.body.ownerName,
      "ADDRESS": req.body.address,
      "BARANGAY": req.body.barangay,
      "NATURE OF BUSINESS": req.body.natureOfBusiness,
      "STATUS": req.body.status,
      "APPLICATION STATUS": req.body.applicationStatus,
      "DATE OF APPLICATION": req.body.dateOfApplication ? new Date(req.body.dateOfApplication) : null,
      "OR NO": req.body.orNo,
      "AMOUNT PAID": req.body.amountPaid,
      "DATE OF PAYMENT": req.body.dateOfPayment ? new Date(req.body.dateOfPayment) : null
    };
    
    // Save the updated business
    business = await Business.findOneAndUpdate(
      { "ACCOUNT NO": accountNo },
      { $set: updateData },
      { new: true }
    );
    
    console.log('Business updated:', business);
    
    // Normalize the property names for response
    const normalizedBusiness = {
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
    
    res.json(normalizedBusiness);
  } catch (error) {
    console.error('Error updating business by account number:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new business
router.post('/', async (req, res) => {
  try {
    if (!Business) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    console.log('Adding new business');
    
    // Check if database connection is ready
    if (establishmentsDB.readyState !== 1) {
      console.error('Database connection not ready. State:', establishmentsDB.readyState);
      return res.status(500).json({ message: 'Database connection not ready' });
    }
    
    // Check if account number already exists
    const existingBusiness = await Business.findOne({ "ACCOUNT NO": req.body.accountNo });
    if (existingBusiness) {
      return res.status(400).json({ message: 'Account number already exists' });
    }
    
    // Create new business
    const newBusiness = new Business({
      "ACCOUNT NO": req.body.accountNo,
      "NAME OF BUSINESS": req.body.businessName,
      "NAME OF OWNER": req.body.ownerName,
      "ADDRESS": req.body.address,
      "BARANGAY": req.body.barangay,
      "NATURE OF BUSINESS": req.body.natureOfBusiness,
      "STATUS": req.body.status,
      "APPLICATION STATUS": req.body.applicationStatus,
      "DATE OF APPLICATION": req.body.dateOfApplication ? new Date(req.body.dateOfApplication) : null,
      "OR NO": req.body.orNo,
      "AMOUNT PAID": req.body.amountPaid,
      "DATE OF PAYMENT": req.body.dateOfPayment ? new Date(req.body.dateOfPayment) : null
    });
    
    // Save the new business
    const savedBusiness = await newBusiness.save();
    
    console.log('Business added:', savedBusiness);
    
    // Normalize the property names for response
    const normalizedBusiness = {
        accountNo: savedBusiness['ACCOUNT NO'],
        dateOfApplication: savedBusiness['DATE OF APPLICATION'],
        orNo: savedBusiness['OR NO'],
        amountPaid: savedBusiness['AMOUNT PAID'],
        dateOfPayment: savedBusiness['DATE OF PAYMENT'],
        status: savedBusiness['STATUS'],
        applicationStatus: savedBusiness['APPLICATION STATUS'],
        businessName: savedBusiness['NAME OF BUSINESS'],
        ownerName: savedBusiness['NAME OF OWNER'],
        address: savedBusiness['ADDRESS'],
        barangay: savedBusiness['BARANGAY'],
        natureOfBusiness: savedBusiness['NATURE OF BUSINESS']
    };
    
    res.status(201).json(normalizedBusiness);
  } catch (error) {
    console.error('Error adding business:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete business by account number
router.delete('/account/:accountNo', async (req, res) => {
    try {
        if (!Business) {
            return res.status(500).json({ message: 'Database connection not available' });
        }
        
        const { accountNo } = req.params;
        console.log(`Deleting business with account number: "${accountNo}"`);
        
        // Check if database connection is ready
        if (establishmentsDB.readyState !== 1) {
            console.error('Database connection not ready. State:', establishmentsDB.readyState);
            return res.status(500).json({ message: 'Database connection not ready' });
        }
        
        // Find and delete the business
        const business = await Business.findOneAndDelete({ "ACCOUNT NO": accountNo });
        
        if (!business) {
            console.log(`No business found with account number: "${accountNo}"`);
            return res.status(404).json({ message: 'Business not found' });
        }
        
        console.log('Business deleted:', business);
        
        res.status(200).json({ message: 'Business deleted successfully' });
    } catch (error) {
        console.error('Error deleting business by account number:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;