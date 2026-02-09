// routes/auditRoutes.js
const express = require("express");
const router = express.Router();
const AuditTrail = require("../models/auditTrail");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all audit logs
router.get("/", verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, action, collectionName, userId } = req.query;
    const query = {};
    if (action) query.action = action;
    if (collectionName) query.collectionName = collectionName;
    if (userId) query.userId = userId;

    const logs = await AuditTrail.find(query)
      .populate("userId", "firstname lastname email")
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AuditTrail.countDocuments(query);

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET search audit logs
router.get("/search", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Start with an empty $or array
    const searchConditions = [];

    // Add regex searches for fields that are strings
    searchConditions.push(
      { action: { $regex: q, $options: "i" } },
      { collectionName: { $regex: q, $options: "i" } },
      { accountNo: { $regex: q, $options: "i" } }, // Assuming accountNo is a string
    );

    // For documentId, only add it to the search if the query is a valid 24-character hex string
    if (/^[0-9a-fA-F]{24}$/.test(q)) {
      searchConditions.push({ documentId: q });
    }

    // Note: We cannot directly search populated fields like 'userId.firstname'.
    // The query below only searches fields directly on the AuditTrail document.

    const logs = await AuditTrail.find({ $or: searchConditions })
      .populate("userId", "firstname lastname email")
      .sort({ timestamp: -1 });

    res.json(logs); // This will successfully send an array of logs
  } catch (error) {
    console.error("Error searching audit logs:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET audit log by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const log = await AuditTrail.findById(req.params.id).populate(
      "userId",
      "firstname lastname email",
    );
    if (!log) {
      return res.status(404).json({ message: "Audit log not found" });
    }
    res.json(log);
  } catch (error) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
