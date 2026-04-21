const express = require("express");
const router = express.Router();
const Business2031 = require("../models/business2031");
const { verifyToken } = require("../middleware/authMiddleware");
const { logAction } = require("../services/auditService");
const barangayCoordinates = require("../public/js/barangayCoordinates");
const {
  syncBusinessToAllFutureYears,
  deleteBusinessFromAllFutureYears,
} = require("../services/businessSyncService");

function convertStringsToUppercase(data) {
  const processedData = { ...data };
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
  stringFields.forEach((field) => {
    if (processedData[field] && typeof processedData[field] === "string") {
      processedData[field] = processedData[field].toUpperCase();
    }
  });
  return processedData;
}

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
    "2031_STATUS": data.status2031,
    "2031_NOTES": data.notes2031,
  };
}

function getChanges(before, after) {
  const changes = {};
  for (const key in after) {
    if (before[key] !== after[key]) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }
  return changes;
}

// Get all businesses from 2031
router.get("/", async (req, res) => {
  try {
    const businesses = await Business2031.find({});
    res.json(businesses);
  } catch (error) {
    console.error("Error fetching 2031 businesses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get business statistics for 2031
router.get("/stats", async (req, res) => {
  try {
    const totalBusinesses = await Business2031.countDocuments();
    const highRiskCount = await Business2031.countDocuments({
      STATUS: "HIGHRISK",
    });
    const lowRiskCount = await Business2031.countDocuments({
      STATUS: "LOWRISK",
    });
    const renewalPendingCount = await Business2031.countDocuments({
      $or: [{ "AMOUNT PAID": { $exists: false } }, { "AMOUNT PAID": null }],
    });
    const activeBusinessesCount = await Business2031.countDocuments({
      "AMOUNT PAID": { $exists: true, $ne: null },
    });
    const renewalCount = await Business2031.countDocuments({
      "APPLICATION STATUS": "RENEWAL",
    });
    const newCount = await Business2031.countDocuments({
      "APPLICATION STATUS": "NEW",
    });
    const barangayStats = await Business2031.aggregate([
      { $group: { _id: "$BARANGAY", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const totalAmountResult = await Business2031.aggregate([
      { $group: { _id: null, totalAmount: { $sum: "$AMOUNT PAID" } } },
    ]);
    const totalAmountPaid =
      totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    const monthlyTotals = await Business2031.aggregate([
      {
        $match: {
          "DATE OF PAYMENT": { $exists: true, $ne: null },
          $expr: { $eq: [{ $year: "$DATE OF PAYMENT" }, 2031] },
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
      statusCounts: { HIGHRISK: highRiskCount, LOWRISK: lowRiskCount },
      renewalPendingCount,
      applicationStatusCounts: { RENEWAL: renewalCount, NEW: newCount },
      barangayStats,
      totalAmountPaid,
      monthlyTotals,
    });
  } catch (error) {
    console.error("Error fetching 2031 business stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search businesses in 2031
router.get("/search", async (req, res) => {
  try {
    const { query, field } = req.query;
    if (!query)
      return res.status(400).json({ message: "Search query is required" });
    let businesses;
    switch (field) {
      case "accountNo":
        businesses = await Business2031.find({
          "ACCOUNT NO": { $regex: query, $options: "i" },
        });
        break;
      case "businessName":
        businesses = await Business2031.find({
          "NAME OF BUSINESS": { $regex: query, $options: "i" },
        });
        break;
      case "ownerName":
        businesses = await Business2031.find({
          "NAME OF OWNER": { $regex: query, $options: "i" },
        });
        break;
      case "barangay":
        businesses = await Business2031.find({
          BARANGAY: { $regex: query, $options: "i" },
        });
        break;
      default:
        businesses = await Business2031.find({
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
    console.error("Error searching 2031 businesses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific business from 2031
router.get("/account/:accountNo", async (req, res) => {
  try {
    const business = await Business2031.findOne({
      "ACCOUNT NO": req.params.accountNo,
    });
    if (!business)
      return res.status(404).json({ message: "Business not found" });
    res.json(business);
  } catch (error) {
    console.error("Error fetching 2031 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get businesses grouped by barangay for map
router.get("/map", async (req, res) => {
  try {
    const businessesByBarangay = await Business2031.aggregate([
      {
        $group: {
          _id: "$BARANGAY",
          businesses: {
            $push: {
              name: "$NAME OF BUSINESS",
              address: "$ADDRESS",
              accountNo: "$ACCOUNT NO",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);
    const result = businessesByBarangay.map((item) => {
      const barangayName = item._id.toUpperCase();
      const coords =
        barangayCoordinates[barangayName] ||
        barangayCoordinates["SAN JUAN CITY"];
      return {
        barangay: item._id,
        coordinates: coords,
        businesses: item.businesses,
        count: item.count,
      };
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching businesses for map:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new business to 2031
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log("Received data for 2031 business:", req.body);
    const processedBody = convertStringsToUppercase(req.body);
    const dbData = transformToDatabaseFormat(processedBody);
    const existingBusiness = await Business2031.findOne({
      "ACCOUNT NO": dbData["ACCOUNT NO"],
    });
    if (existingBusiness)
      return res.status(400).json({ message: "Account number already exists" });
    const newBusiness = new Business2031(dbData);
    const savedBusiness = await newBusiness.save();
    console.log("Business added to 2031:", savedBusiness);
    const accountNo = savedBusiness["ACCOUNT NO"];
    await logAction(
      "CREATE",
      "business2031",
      savedBusiness._id,
      req.user.userId,
      savedBusiness.toObject(),
      req,
      accountNo,
    );
    // Sync to all future years
    try {
      await syncBusinessToAllFutureYears("2031", savedBusiness.toObject());
      console.log("Business synced to all future years");
    } catch (syncError) {
      console.error("Error syncing business to future years:", syncError);
      // Don't fail the request if sync fails
    }
    res.status(201).json(savedBusiness);
  } catch (error) {
    console.error("Error adding 2031 business:", error);
    res.status(500).json({ message: "Server error", details: error.message });
  }
});

// Update a business in 2031
router.put("/account/:accountNo", verifyToken, async (req, res) => {
  try {
    const currentBusiness = await Business2031.findOne({
      "ACCOUNT NO": req.params.accountNo,
    });
    if (!currentBusiness)
      return res.status(404).json({ message: "Business not found" });
    const processedBody = convertStringsToUppercase(req.body);
    const dbData = transformToDatabaseFormat(processedBody);
    const updatedBusiness = await Business2031.findOneAndUpdate(
      { "ACCOUNT NO": req.params.accountNo },
      dbData,
      { new: true },
    );
    const changes = getChanges(
      currentBusiness.toObject(),
      updatedBusiness.toObject(),
    );
    const accountNo = req.params.accountNo;
    await logAction(
      "UPDATE",
      "business2031",
      updatedBusiness._id,
      req.user.userId,
      changes,
      req,
      accountNo,
    );
    // Sync to all future years
    try {
      await syncBusinessToAllFutureYears("2031", updatedBusiness.toObject());
      console.log("Business changes synced to all future years");
    } catch (syncError) {
      console.error(
        "Error syncing business changes to future years:",
        syncError,
      );
      // Don't fail the request if sync fails
    }
    res.json(updatedBusiness);
  } catch (error) {
    console.error("Error updating 2031 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a business from 2031
router.delete("/account/:accountNo", verifyToken, async (req, res) => {
  try {
    const businessToDelete = await Business2031.findOne({
      "ACCOUNT NO": req.params.accountNo,
    });
    if (!businessToDelete)
      return res.status(404).json({ message: "Business not found" });
    await Business2031.deleteOne({ "ACCOUNT NO": req.params.accountNo });
    const accountNo = req.params.accountNo;
    await logAction(
      "DELETE",
      "business2031",
      businessToDelete._id,
      req.user.userId,
      businessToDelete.toObject(),
      req,
      accountNo,
    );
    // Delete from all future years
    try {
      await deleteBusinessFromAllFutureYears("2031", req.params.accountNo);
      console.log("Business deleted from all future years");
    } catch (syncError) {
      console.error("Error deleting business from future years:", syncError);
      // Don't fail the request if sync fails
    }
    res.json({ message: "Business deleted successfully" });
  } catch (error) {
    console.error("Error deleting 2031 business:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
