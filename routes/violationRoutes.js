// routes/violationRoutes.js
const express = require("express");
const router = express.Router();
const ViolationRecord = require("../models/violationRecord");
const { verifyToken } = require("../middleware/authMiddleware");
const { logAction } = require("../services/auditService");

// GET all violations
router.get("/", async (req, res) => {
  try {
    const { year, accountNo, paymentStatus } = req.query;
    const filter = {};
    if (year) filter.year = parseInt(year);
    if (accountNo) filter.accountNo = { $regex: accountNo, $options: "i" };
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    const records = await ViolationRecord.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET by ID
router.get("/:id", async (req, res) => {
  try {
    const record = await ViolationRecord.findById(req.params.id);
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
    const [total, unpaid, paid, waived, fineResult] = await Promise.all([
      ViolationRecord.countDocuments(filter),
      ViolationRecord.countDocuments({ ...filter, paymentStatus: "UNPAID" }),
      ViolationRecord.countDocuments({ ...filter, paymentStatus: "PAID" }),
      ViolationRecord.countDocuments({ ...filter, paymentStatus: "WAIVED" }),
      ViolationRecord.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$totalFine" } } },
      ]),
    ]);
    res.json({
      total,
      unpaid,
      paid,
      waived,
      totalFines: fineResult[0]?.total || 0,
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH update payment status
router.patch("/:id/payment", verifyToken, async (req, res) => {
  try {
    const { paymentStatus, paymentDate, orNo, remarks } = req.body;
    const updated = await ViolationRecord.findByIdAndUpdate(
      req.params.id,
      { paymentStatus, paymentDate, orNo, remarks },
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    await logAction(
      "UPDATE",
      "violationRecords",
      updated._id,
      req.user.userId,
      { paymentStatus, paymentDate, orNo },
      req,
      updated.accountNo,
    );
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update remarks only
router.patch("/:id/remarks", verifyToken, async (req, res) => {
  try {
    const updated = await ViolationRecord.findByIdAndUpdate(
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
