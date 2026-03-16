// routes/complianceRoutes.js
const express = require("express");
const router = express.Router();
const ComplianceRecord = require("../models/complianceRecord");
const { verifyToken } = require("../middleware/authMiddleware");
const { logAction } = require("../services/auditService");

// GET all compliance records
router.get("/", async (req, res) => {
  try {
    const { year, accountNo, overallStatus } = req.query;
    const filter = {};
    if (year) filter.year = parseInt(year);
    if (accountNo) filter.accountNo = { $regex: accountNo, $options: "i" };
    if (overallStatus) filter.overallStatus = overallStatus;
    const records = await ComplianceRecord.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET by ID
router.get("/:id", async (req, res) => {
  try {
    const record = await ComplianceRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Not found" });
    res.json(record);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET stats
router.get("/stats/summary", async (req, res) => {
  try {
    const { year } = req.query;
    const filter = year ? { year: parseInt(year) } : {};
    const [total, pending, partial, full, overdue] = await Promise.all([
      ComplianceRecord.countDocuments(filter),
      ComplianceRecord.countDocuments({ ...filter, overallStatus: "PENDING" }),
      ComplianceRecord.countDocuments({
        ...filter,
        overallStatus: "PARTIALLY_COMPLIED",
      }),
      ComplianceRecord.countDocuments({
        ...filter,
        overallStatus: "FULLY_COMPLIED",
      }),
      ComplianceRecord.countDocuments({ ...filter, overallStatus: "OVERDUE" }),
    ]);
    res.json({ total, pending, partial, full, overdue });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH update individual requirement status
router.patch("/:id/requirement", verifyToken, async (req, res) => {
  try {
    const { requirementKey, status, complianceDate, remarks } = req.body;
    const record = await ComplianceRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Not found" });

    const req_item = record.requirements.find(
      (r) => r.requirementKey === requirementKey,
    );
    if (!req_item)
      return res.status(404).json({ message: "Requirement not found" });

    req_item.status = status;
    if (complianceDate) req_item.complianceDate = complianceDate;
    if (remarks) req_item.remarks = remarks;

    // Recompute overallStatus
    const total = record.requirements.length;
    const complied = record.requirements.filter(
      (r) => r.status === "COMPLIED",
    ).length;
    const overdueN = record.requirements.filter(
      (r) => r.status === "OVERDUE",
    ).length;
    if (complied === total) record.overallStatus = "FULLY_COMPLIED";
    else if (complied > 0) record.overallStatus = "PARTIALLY_COMPLIED";
    else if (overdueN > 0) record.overallStatus = "OVERDUE";
    else record.overallStatus = "PENDING";

    await record.save();
    await logAction(
      "UPDATE",
      "complianceRecords",
      record._id,
      req.user.userId,
      { requirementKey, status },
      req,
      record.accountNo,
    );
    res.json(record);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH update overall remarks
router.patch("/:id/remarks", verifyToken, async (req, res) => {
  try {
    const updated = await ComplianceRecord.findByIdAndUpdate(
      req.params.id,
      { remarks: req.body.remarks },
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
