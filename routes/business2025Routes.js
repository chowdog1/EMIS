// routes/business2025Routes.js
const express = require("express");
const router = express.Router();
const Business2025 = require("../models/business2025");
const { verifyToken } = require("../middleware/authMiddleware");
const { logAction } = require("../services/auditService");
const {
  syncBusinessTo2026,
  deleteBusinessFrom2026,
} = require("../services/businessSyncService");

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
  };
}

// Helper function to get changes between documents
function getChanges(before, after) {
  const changes = {};
  for (const key in after) {
    if (before[key] !== after[key]) {
      changes[key] = {
        before: before[key],
        after: after[key],
      };
    }
  }
  return changes;
}

// Get all businesses from 2025
router.get("/", async (req, res) => {
  try {
    const businesses = await Business2025.find({});
    res.json(businesses);
  } catch (error) {
    console.error("Error fetching 2025 businesses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get business statistics for 2025
router.get("/stats", async (req, res) => {
  try {
    // Total businesses count
    const totalBusinesses = await Business2025.countDocuments();
    // Count by status
    const highRiskCount = await Business2025.countDocuments({
      STATUS: "HIGHRISK",
    });
    const lowRiskCount = await Business2025.countDocuments({
      STATUS: "LOWRISK",
    });
    // Count businesses with no payments
    const renewalPendingCount = await Business2025.countDocuments({
      $or: [{ "AMOUNT PAID": { $exists: false } }, { "AMOUNT PAID": null }],
    });
    // Count active businesses
    const activeBusinessesCount = await Business2025.countDocuments({
      "AMOUNT PAID": { $exists: true, $ne: null },
    });
    // Count by application status
    const renewalCount = await Business2025.countDocuments({
      "APPLICATION STATUS": "RENEWAL",
    });
    const newCount = await Business2025.countDocuments({
      "APPLICATION STATUS": "NEW",
    });
    // Count by barangay
    const barangayStats = await Business2025.aggregate([
      { $group: { _id: "$BARANGAY", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    // Calculate total amount paid
    const totalAmountResult = await Business2025.aggregate([
      { $group: { _id: null, totalAmount: { $sum: "$AMOUNT PAID" } } },
    ]);
    const totalAmountPaid =
      totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    // Calculate monthly payment totals
    const monthlyTotals = await Business2025.aggregate([
      {
        $match: {
          "DATE OF PAYMENT": { $exists: true, $ne: null },
          $expr: { $eq: [{ $year: "$DATE OF PAYMENT" }, 2025] },
        },
      },
      {
        $group: {
          _id: { $month: "$DATE OF PAYMENT" },
          totalAmount: { $sum: "$AMOUNT PAID" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
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
      monthlyTotals,
    });
  } catch (error) {
    console.error("Error fetching 2025 business stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search businesses in 2025
router.get("/search", async (req, res) => {
  try {
    const { query, field } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    let businesses;
    switch (field) {
      case "accountNo":
        businesses = await Business2025.find({
          "ACCOUNT NO": { $regex: query, $options: "i" },
        });
        break;
      case "businessName":
        businesses = await Business2025.find({
          "NAME OF BUSINESS": { $regex: query, $options: "i" },
        });
        break;
      case "ownerName":
        businesses = await Business2025.find({
          "NAME OF OWNER": { $regex: query, $options: "i" },
        });
        break;
      case "barangay":
        businesses = await Business2025.find({
          BARANGAY: { $regex: query, $options: "i" },
        });
        break;
      default:
        businesses = await Business2025.find({
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
    console.error("Error searching 2025 businesses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific business from 2025
router.get("/account/:accountNo", async (req, res) => {
  try {
    const business = await Business2025.findOne({
      "ACCOUNT NO": req.params.accountNo,
    });
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  } catch (error) {
    console.error("Error fetching 2025 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new business to 2025
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log("Received data for 2025 business:", req.body);

    // Convert string fields to uppercase
    const processedBody = convertStringsToUppercase(req.body);
    console.log("Processed data (uppercase):", processedBody);

    // Transform to database format
    const dbData = transformToDatabaseFormat(processedBody);
    console.log("Transformed data for database:", dbData);

    // Check if account number already exists
    const existingBusiness = await Business2025.findOne({
      "ACCOUNT NO": dbData["ACCOUNT NO"],
    });
    if (existingBusiness) {
      return res.status(400).json({ message: "Account number already exists" });
    }

    // Create and save the new business
    const newBusiness = new Business2025(dbData);
    const savedBusiness = await newBusiness.save();
    console.log("Business added to 2025:", savedBusiness);

    // Extract account number explicitly
    const accountNo = savedBusiness["ACCOUNT NO"];
    console.log("Account number for CREATE audit log:", accountNo);

    // Log the CREATE action with account number
    await logAction(
      "CREATE",
      "business2025",
      savedBusiness._id,
      req.user.userId,
      savedBusiness.toObject(),
      req,
      accountNo // Add account number
    );

    // Sync to 2026 collection
    try {
      await syncBusinessTo2026(savedBusiness);
      console.log("Business synced to 2026 collection");
    } catch (syncError) {
      console.error("Error syncing business to 2026:", syncError);
      // Don't fail the request if sync fails
    }

    res.status(201).json(savedBusiness);
  } catch (error) {
    console.error("Error adding 2025 business:", error);
    res.status(500).json({ message: "Server error", details: error.message });
  }
});

// Update a business in 2025
router.put("/account/:accountNo", verifyToken, async (req, res) => {
  try {
    // Get the current document before update
    const currentBusiness = await Business2025.findOne({
      "ACCOUNT NO": req.params.accountNo,
    });
    if (!currentBusiness) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Convert string fields to uppercase
    const processedBody = convertStringsToUppercase(req.body);

    // Transform to database format
    const dbData = transformToDatabaseFormat(processedBody);

    const updatedBusiness = await Business2025.findOneAndUpdate(
      { "ACCOUNT NO": req.params.accountNo },
      dbData,
      { new: true }
    );

    // Get the changes between the old and new document
    const changes = getChanges(
      currentBusiness.toObject(),
      updatedBusiness.toObject()
    );

    // Extract account number explicitly
    const accountNo = req.params.accountNo;
    console.log("Account number for UPDATE audit log:", accountNo);

    // Log the UPDATE action with account number
    await logAction(
      "UPDATE",
      "business2025",
      updatedBusiness._id,
      req.user.userId,
      changes,
      req,
      accountNo // Add account number
    );

    // Sync to 2026 collection
    try {
      await syncBusinessTo2026(updatedBusiness);
      console.log("Business changes synced to 2026 collection");
    } catch (syncError) {
      console.error("Error syncing business changes to 2026:", syncError);
      // Don't fail the request if sync fails
    }

    res.json(updatedBusiness);
  } catch (error) {
    console.error("Error updating 2025 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a business from 2025
router.delete("/account/:accountNo", verifyToken, async (req, res) => {
  try {
    // Get the document before deletion
    const businessToDelete = await Business2025.findOne({
      "ACCOUNT NO": req.params.accountNo,
    });
    if (!businessToDelete) {
      return res.status(404).json({ message: "Business not found" });
    }

    const result = await Business2025.deleteOne({
      "ACCOUNT NO": req.params.accountNo,
    });

    // Extract account number explicitly
    const accountNo = req.params.accountNo;
    console.log("Account number for DELETE audit log:", accountNo);

    // Log the DELETE action with account number
    await logAction(
      "DELETE",
      "business2025",
      businessToDelete._id,
      req.user.userId,
      businessToDelete.toObject(),
      req,
      accountNo // Add account number
    );

    // Delete from 2026 collection
    try {
      await deleteBusinessFrom2026(req.params.accountNo);
      console.log("Business deleted from 2026 collection");
    } catch (syncError) {
      console.error("Error deleting business from 2026:", syncError);
      // Don't fail the request if sync fails
    }

    res.json({ message: "Business deleted successfully" });
  } catch (error) {
    console.error("Error deleting 2025 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
