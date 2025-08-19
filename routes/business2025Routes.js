// routes/business2025Routes.js
const express = require("express");
const router = express.Router();
const Business = require("../models/business2025.js"); // Import the centralized model
const Business2026 = require("../models/business2026.js"); // Import the 2026 model
const {
  syncBusinessTo2026,
  deleteBusinessFrom2026,
} = require("../services/businessSyncService.js");

// Helper function to convert string values to uppercase
function convertStringsToUppercase(data) {
  const processedData = { ...data };

  // List of fields that should be converted to uppercase
  const stringFields = [
    "accountNo",
    "businessName",
    "ownerName",
    "address",
    "barangay",
    "natureOfBusiness",
    "status",
    "applicationStatus",
    "orNo",
    "remarks",
  ];

  // Convert each string field to uppercase if it exists
  stringFields.forEach((field) => {
    if (processedData[field] && typeof processedData[field] === "string") {
      processedData[field] = processedData[field].toUpperCase();
    }
  });

  return processedData;
}

// Get dashboard statistics with year parameter
router.get("/stats", async (req, res) => {
  try {
    const year = req.query.year || "2025"; // Default to 2025 if no year specified
    console.log(`Fetching business stats for year: ${year}`);

    // Select the appropriate model based on the year
    const BusinessModel = year === "2026" ? Business2026 : Business;

    if (!BusinessModel) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }

    // Total businesses count
    const totalBusinesses = await BusinessModel.countDocuments();
    console.log(`Total businesses: ${totalBusinesses}`);

    // Count by status
    const highRiskCount = await BusinessModel.countDocuments({
      STATUS: "HIGHRISK",
    });
    const lowRiskCount = await BusinessModel.countDocuments({
      STATUS: "LOWRISK",
    });
    console.log(`High risk: ${highRiskCount}, Low risk: ${lowRiskCount}`);

    // Count businesses with no payments
    const renewalPendingCount = await BusinessModel.countDocuments({
      $or: [{ "AMOUNT PAID": { $exists: false } }, { "AMOUNT PAID": null }],
    });
    console.log(`Businesses with no payments: ${renewalPendingCount}`);

    // Count active businesses
    const activeBusinessesCount = await BusinessModel.countDocuments({
      "AMOUNT PAID": { $exists: true, $ne: null },
    });
    console.log(`Active businesses: ${activeBusinessesCount}`);

    // Count by application status
    const renewalCount = await BusinessModel.countDocuments({
      "APPLICATION STATUS": "RENEWAL",
    });
    const newCount = await BusinessModel.countDocuments({
      "APPLICATION STATUS": "NEW",
    });
    console.log(
      `Application status - Renewal: ${renewalCount}, New: ${newCount}`
    );

    // Count by barangay
    const barangayStats = await BusinessModel.aggregate([
      { $group: { _id: "$BARANGAY", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    console.log("Barangay stats:", barangayStats);

    // Calculate total amount paid
    const totalAmountResult = await BusinessModel.aggregate([
      { $group: { _id: null, totalAmount: { $sum: "$AMOUNT PAID" } } },
    ]);
    const totalAmountPaid =
      totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    console.log(`Total amount paid: ${totalAmountPaid}`);

    res.json({
      totalBusinesses,
      activeBusinessesCount,
      statusCounts: {
        HIGHRISK: highRiskCount,
        LOWRISK: lowRiskCount,
      },
      renewalPendingCount,
      applicationStatusCounts: {
        RENEWAL: renewalCount,
        NEW: newCount,
      },
      barangayStats,
      totalAmountPaid,
    });
  } catch (error) {
    console.error("Error fetching business stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all businesses
router.get("/", async (req, res) => {
  try {
    if (!Business) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }
    console.log("Fetching all businesses...");
    const businesses = await Business.find({});
    console.log(`Found ${businesses.length} businesses`);
    // Log the first original business
    if (businesses.length > 0) {
      console.log("First original business:", businesses[0]);
      console.log(
        "Keys in first original business:",
        Object.keys(businesses[0])
      );
    }
    // Normalize the property names
    const normalizedBusinesses = businesses.map((business) => {
      const normalized = {
        accountNo: business["ACCOUNT NO"],
        dateOfApplication: business["DATE OF APPLICATION"],
        orNo: business["OR NO"],
        amountPaid: business["AMOUNT PAID"],
        dateOfPayment: business["DATE OF PAYMENT"],
        status: business["STATUS"],
        applicationStatus: business["APPLICATION STATUS"],
        businessName: business["NAME OF BUSINESS"],
        ownerName: business["NAME OF OWNER"],
        address: business["ADDRESS"],
        barangay: business["BARANGAY"],
        natureOfBusiness: business["NATURE OF BUSINESS"],
        remarks: business["REMARKS"],
      };
      // DEBUG: Log the first normalized business
      if (businesses.indexOf(business) === 0) {
        console.log("Normalized business:", normalized);
        console.log("Keys in normalized business:", Object.keys(normalized));
      }
      return normalized;
    });
    // Log the first few normalized businesses
    console.log(
      "First 3 normalized businesses:",
      normalizedBusinesses.slice(0, 3)
    );
    res.json(normalizedBusinesses);
  } catch (error) {
    console.error("Error fetching businesses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search businesses
router.get("/search", async (req, res) => {
  try {
    if (!Business) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }
    const { query, field } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    console.log(`Searching for: ${query} in field: ${field || "all fields"}`);
    let businesses;
    // Search based on the specified field
    switch (field) {
      case "accountNo":
        businesses = await Business.find({
          "ACCOUNT NO": { $regex: query, $options: "i" },
        });
        break;
      case "businessName":
        businesses = await Business.find({
          "NAME OF BUSINESS": { $regex: query, $options: "i" },
        });
        break;
      case "ownerName":
        businesses = await Business.find({
          "NAME OF OWNER": { $regex: query, $options: "i" },
        });
        break;
      case "barangay":
        businesses = await Business.find({
          BARANGAY: { $regex: query, $options: "i" },
        });
        break;
      default:
        // Default: search in multiple fields
        businesses = await Business.find({
          $or: [
            { "ACCOUNT NO": { $regex: query, $options: "i" } },
            { "NAME OF BUSINESS": { $regex: query, $options: "i" } },
            { "NAME OF OWNER": { $regex: query, $options: "i" } },
            { BARANGAY: { $regex: query, $options: "i" } },
            { "NATURE OF BUSINESS": { $regex: query, $options: "i" } },
            { "APPLICATION STATUS": { $regex: query, $options: "i" } },
          ],
        });
    }
    console.log(`Found ${businesses.length} businesses`);
    // Normalize the property names
    const normalizedBusinesses = businesses.map((business) => {
      return {
        accountNo: business["ACCOUNT NO"],
        dateOfApplication: business["DATE OF APPLICATION"],
        orNo: business["OR NO"],
        amountPaid: business["AMOUNT PAID"],
        dateOfPayment: business["DATE OF PAYMENT"],
        status: business["STATUS"],
        applicationStatus: business["APPLICATION STATUS"],
        businessName: business["NAME OF BUSINESS"],
        ownerName: business["NAME OF OWNER"],
        address: business["ADDRESS"],
        barangay: business["BARANGAY"],
        natureOfBusiness: business["NATURE OF BUSINESS"],
        remarks: business["REMARKS"],
      };
    });
    res.json(normalizedBusinesses);
  } catch (error) {
    console.error("Error searching businesses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get business by account number
router.get("/account/:accountNo", async (req, res) => {
  try {
    if (!Business) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }
    const { accountNo } = req.params;
    console.log(`Fetching business with account number: "${accountNo}"`);
    // Try multiple query approaches to find the business
    let business;
    // First try: exact match
    business = await Business.findOne({ "ACCOUNT NO": accountNo });
    // If not found, try case-insensitive match
    if (!business) {
      console.log(
        `Exact match not found, trying case-insensitive search for "${accountNo}"`
      );
      business = await Business.findOne({
        "ACCOUNT NO": { $regex: new RegExp(`^${accountNo}$`, "i") },
      });
    }
    // If still not found, try partial match (in case of formatting differences)
    if (!business) {
      console.log(
        `Case-insensitive match not found, trying partial match for "${accountNo}"`
      );
      business = await Business.findOne({
        "ACCOUNT NO": { $regex: accountNo, $options: "i" },
      });
    }
    if (!business) {
      console.log(`No business found with account number: "${accountNo}"`);
      // List some account numbers for debugging
      const sampleBusinesses = await Business.find({}).limit(5);
      console.log("Sample account numbers in database:");
      sampleBusinesses.forEach((b, i) => {
        console.log(`${i + 1}: "${b["ACCOUNT NO"]}"`);
      });
      return res.status(404).json({ message: "Business not found" });
    }
    console.log("Business found:", business);
    // Normalize the property names
    const normalizedBusiness = {
      accountNo: business["ACCOUNT NO"],
      dateOfApplication: business["DATE OF APPLICATION"],
      orNo: business["OR NO"],
      amountPaid: business["AMOUNT PAID"],
      dateOfPayment: business["DATE OF PAYMENT"],
      status: business["STATUS"],
      applicationStatus: business["APPLICATION STATUS"],
      businessName: business["NAME OF BUSINESS"],
      ownerName: business["NAME OF OWNER"],
      address: business["ADDRESS"],
      barangay: business["BARANGAY"],
      natureOfBusiness: business["NATURE OF BUSINESS"],
      remarks: business["REMARKS"],
    };
    res.json(normalizedBusiness);
  } catch (error) {
    console.error("Error fetching business by account number:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update business by account number
router.put("/account/:accountNo", async (req, res) => {
  try {
    if (!Business) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }
    const { accountNo } = req.params;
    console.log(`Updating business with account number: "${accountNo}"`);
    // Find the business
    let business = await Business.findOne({ "ACCOUNT NO": accountNo });
    if (!business) {
      console.log(`No business found with account number: "${accountNo}"`);
      return res.status(404).json({ message: "Business not found" });
    }

    // Convert string fields to uppercase
    const processedBody = convertStringsToUppercase(req.body);

    // Update business with new data
    const updateData = {
      "NAME OF BUSINESS": processedBody.businessName,
      "NAME OF OWNER": processedBody.ownerName,
      ADDRESS: processedBody.address,
      BARANGAY: processedBody.barangay,
      "NATURE OF BUSINESS": processedBody.natureOfBusiness,
      STATUS: processedBody.status,
      "APPLICATION STATUS": processedBody.applicationStatus,
      "DATE OF APPLICATION": processedBody.dateOfApplication
        ? new Date(processedBody.dateOfApplication)
        : null,
      "OR NO": processedBody.orNo,
      "AMOUNT PAID": processedBody.amountPaid,
      "DATE OF PAYMENT": processedBody.dateOfPayment
        ? new Date(processedBody.dateOfPayment)
        : null,
      REMARKS: processedBody.remarks,
    };

    // Save the updated business
    business = await Business.findOneAndUpdate(
      { "ACCOUNT NO": accountNo },
      { $set: updateData },
      { new: true }
    );
    console.log("Business updated in 2025:", business);

    // Sync to 2026 (non-blocking)
    syncBusinessTo2026(business.toObject()).catch((err) => {
      console.error("Failed to sync to 2026:", err);
    });

    // Normalize the property names for response
    const normalizedBusiness = {
      accountNo: business["ACCOUNT NO"],
      dateOfApplication: business["DATE OF APPLICATION"],
      orNo: business["OR NO"],
      amountPaid: business["AMOUNT PAID"],
      dateOfPayment: business["DATE OF PAYMENT"],
      status: business["STATUS"],
      applicationStatus: business["APPLICATION STATUS"],
      businessName: business["NAME OF BUSINESS"],
      ownerName: business["NAME OF OWNER"],
      address: business["ADDRESS"],
      barangay: business["BARANGAY"],
      natureOfBusiness: business["NATURE OF BUSINESS"],
      remarks: business["REMARKS"],
    };

    res.json(normalizedBusiness);
  } catch (error) {
    console.error("Error updating business by account number:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new business
router.post("/", async (req, res) => {
  try {
    if (!Business) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }
    console.log("Adding new business");

    // Convert string fields to uppercase
    const processedBody = convertStringsToUppercase(req.body);

    // Check if account number already exists
    const existingBusiness = await Business.findOne({
      "ACCOUNT NO": processedBody.accountNo,
    });
    if (existingBusiness) {
      return res.status(400).json({ message: "Account number already exists" });
    }

    // Create new business
    const newBusiness = new Business({
      "ACCOUNT NO": processedBody.accountNo,
      "NAME OF BUSINESS": processedBody.businessName,
      "NAME OF OWNER": processedBody.ownerName,
      ADDRESS: processedBody.address,
      BARANGAY: processedBody.barangay,
      "NATURE OF BUSINESS": processedBody.natureOfBusiness,
      STATUS: processedBody.status,
      "APPLICATION STATUS": processedBody.applicationStatus,
      "DATE OF APPLICATION": processedBody.dateOfApplication
        ? new Date(processedBody.dateOfApplication)
        : null,
      "OR NO": processedBody.orNo,
      "AMOUNT PAID": processedBody.amountPaid,
      "DATE OF PAYMENT": processedBody.dateOfPayment
        ? new Date(processedBody.dateOfPayment)
        : null,
      REMARKS: processedBody.remarks,
    });

    // Save the new business
    const savedBusiness = await newBusiness.save();
    console.log("Business added to 2025:", savedBusiness);

    // Sync to 2026 (non-blocking)
    syncBusinessTo2026(savedBusiness.toObject()).catch((err) => {
      console.error("Failed to sync to 2026:", err);
    });

    // Normalize the property names for response
    const normalizedBusiness = {
      accountNo: savedBusiness["ACCOUNT NO"],
      dateOfApplication: savedBusiness["DATE OF APPLICATION"],
      orNo: savedBusiness["OR NO"],
      amountPaid: savedBusiness["AMOUNT PAID"],
      dateOfPayment: savedBusiness["DATE OF PAYMENT"],
      status: savedBusiness["STATUS"],
      applicationStatus: savedBusiness["APPLICATION STATUS"],
      businessName: savedBusiness["NAME OF BUSINESS"],
      ownerName: savedBusiness["NAME OF OWNER"],
      address: savedBusiness["ADDRESS"],
      barangay: savedBusiness["BARANGAY"],
      natureOfBusiness: savedBusiness["NATURE OF BUSINESS"],
      remarks: savedBusiness["REMARKS"],
    };

    res.status(201).json(normalizedBusiness);
  } catch (error) {
    console.error("Error adding business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete business by account number
router.delete("/account/:accountNo", async (req, res) => {
  try {
    if (!Business) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }
    const { accountNo } = req.params;
    console.log(`Deleting business with account number: "${accountNo}"`);
    // Find and delete the business
    const business = await Business.findOneAndDelete({
      "ACCOUNT NO": accountNo,
    });
    if (!business) {
      console.log(`No business found with account number: "${accountNo}"`);
      return res.status(404).json({ message: "Business not found" });
    }
    console.log("Business deleted from 2025:", business);
    // Delete from 2026 (non-blocking)
    deleteBusinessFrom2026(accountNo).catch((err) => {
      console.error("Failed to delete from 2026:", err);
    });
    res.status(200).json({ message: "Business deleted successfully" });
  } catch (error) {
    console.error("Error deleting business by account number:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
