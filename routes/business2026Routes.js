// routes/business2026Routes.js
const express = require("express");
const router = express.Router();
const Business2026 = require("../models/business2026");
const {
  getAllBusinesses2026,
  getBusinessByAccountNo2026,
  addBusiness2026,
  updateBusiness2026,
  deleteBusiness2026,
} = require("../services/business2026Service.js");

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

// Helper function to transform camelCase to database format
function transformToDatabaseFormat(data) {
  return {
    "ACCOUNT NO": data.accountNo,
    "DATE OF APPLICATION": data.dateOfApplication
      ? new Date(data.dateOfApplication)
      : null,
    "OR NO": data.orNo,
    "AMOUNT PAID": data.amountPaid,
    "DATE OF PAYMENT": data.dateOfPayment ? new Date(data.dateOfPayment) : null,
    STATUS: data.status,
    "APPLICATION STATUS": data.applicationStatus,
    "NAME OF BUSINESS": data.businessName,
    "NAME OF OWNER": data.ownerName,
    ADDRESS: data.address,
    BARANGAY: data.barangay,
    "NATURE OF BUSINESS": data.natureOfBusiness,
    REMARKS: data.remarks,
    "2026_STATUS": data.status2026, // Map 2026 specific fields
    "2026_NOTES": data.notes2026, // Map 2026 specific fields
  };
}

// Get all businesses from 2026
router.get("/", async (req, res) => {
  try {
    const businesses = await getAllBusinesses2026();
    res.json(businesses);
  } catch (error) {
    console.error("Error fetching 2026 businesses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get business statistics for 2026
router.get("/stats", async (req, res) => {
  try {
    // Total businesses count
    const totalBusinesses = await Business2026.countDocuments();
    // Count by status
    const highRiskCount = await Business2026.countDocuments({
      STATUS: "HIGHRISK",
    });
    const lowRiskCount = await Business2026.countDocuments({
      STATUS: "LOWRISK",
    });
    // Count businesses with no payments
    const renewalPendingCount = await Business2026.countDocuments({
      $or: [{ "AMOUNT PAID": { $exists: false } }, { "AMOUNT PAID": null }],
    });
    // Count active businesses
    const activeBusinessesCount = await Business2026.countDocuments({
      "AMOUNT PAID": { $exists: true, $ne: null },
    });
    // Count by application status
    const renewalCount = await Business2026.countDocuments({
      "APPLICATION STATUS": "RENEWAL",
    });
    const newCount = await Business2026.countDocuments({
      "APPLICATION STATUS": "NEW",
    });
    // Count by barangay
    const barangayStats = await Business2026.aggregate([
      { $group: { _id: "$BARANGAY", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    // Calculate total amount paid
    const totalAmountResult = await Business2026.aggregate([
      { $group: { _id: null, totalAmount: { $sum: "$AMOUNT PAID" } } },
    ]);
    const totalAmountPaid =
      totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
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
    console.error("Error fetching 2026 business stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search businesses in 2026
router.get("/search", async (req, res) => {
  try {
    const { query, field } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    let businesses;
    switch (field) {
      case "accountNo":
        businesses = await Business2026.find({
          "ACCOUNT NO": { $regex: query, $options: "i" },
        });
        break;
      case "businessName":
        businesses = await Business2026.find({
          "NAME OF BUSINESS": { $regex: query, $options: "i" },
        });
        break;
      case "ownerName":
        businesses = await Business2026.find({
          "NAME OF OWNER": { $regex: query, $options: "i" },
        });
        break;
      case "barangay":
        businesses = await Business2026.find({
          BARANGAY: { $regex: query, $options: "i" },
        });
        break;
      default:
        businesses = await Business2026.find({
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
    res.json(businesses);
  } catch (error) {
    console.error("Error searching 2026 businesses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific business from 2026
router.get("/account/:accountNo", async (req, res) => {
  try {
    const business = await getBusinessByAccountNo2026(req.params.accountNo);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  } catch (error) {
    console.error("Error fetching 2026 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new business to 2026
router.post("/", async (req, res) => {
  try {
    console.log("Received data for 2026 business:", req.body);
    // Convert string fields to uppercase
    const processedBody = convertStringsToUppercase(req.body);
    console.log("Processed data (uppercase):", processedBody);
    // Transform to database format
    const dbData = transformToDatabaseFormat(processedBody);
    console.log("Transformed data for database:", dbData);
    // Check if account number already exists
    const existingBusiness = await Business2026.findOne({
      "ACCOUNT NO": dbData["ACCOUNT NO"],
    });
    if (existingBusiness) {
      return res.status(400).json({ message: "Account number already exists" });
    }
    // Use the service function instead of directly creating and saving
    const savedBusiness = await addBusiness2026(dbData);
    console.log("Business added to 2026:", savedBusiness);
    res.status(201).json(savedBusiness);
  } catch (error) {
    console.error("Error adding 2026 business:", error);
    res.status(500).json({ message: "Server error", details: error.message });
  }
});

// Update a business in 2026
router.put("/account/:accountNo", async (req, res) => {
  try {
    // Convert string fields to uppercase
    const processedBody = convertStringsToUppercase(req.body);
    // Transform to database format
    const dbData = transformToDatabaseFormat(processedBody);
    const business = await updateBusiness2026(req.params.accountNo, dbData);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  } catch (error) {
    console.error("Error updating 2026 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a business from 2026
router.delete("/account/:accountNo", async (req, res) => {
  try {
    const result = await deleteBusiness2026(req.params.accountNo);
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json({ message: "Business deleted successfully" });
  } catch (error) {
    console.error("Error deleting 2026 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
