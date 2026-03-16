// routes/inspectionRoutes.js
const express = require("express");
const router = express.Router();
const InspectionReport = require("../models/inspectionReport");
const ViolationRecord = require("../models/violationRecord");
const ComplianceRecord = require("../models/complianceRecord");
const { verifyToken } = require("../middleware/authMiddleware");
const { logAction } = require("../services/auditService");
const { authDB } = require("../config/database");
// Safely get User model — may already be registered by server.js
let _UserModel = null;
function getUserModel() {
  if (_UserModel) return _UserModel;
  try {
    _UserModel = authDB.model("User");
  } catch (_) {
    _UserModel = authDB.model("User", require("../models/user").schema);
  }
  return _UserModel;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate next INSP-{YEAR}-{SEQ} for the given year */
async function generateInspectionId(year) {
  const prefix = `INSP-${year}-`;
  // Find highest existing sequence for this year
  const latest = await InspectionReport.findOne(
    { inspectionId: { $regex: `^${prefix}` } },
    { inspectionId: 1 },
    { sort: { inspectionId: -1 } },
  );
  let next = 1;
  if (latest && latest.inspectionId) {
    const parts = latest.inspectionId.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) next = lastSeq + 1;
  }
  return `${prefix}${String(next).padStart(3, "0")}`;
}

/**
 * Derive violationPriority from violations map AND recommendations.
 *
 * LOW_PRIORITY if ALL of the following are true:
 *   Violations side: only the 3 minor violation keys are checked (or none)
 *   Recommendations side: only the 3 minor recommendation keys are selected (or none)
 *
 * Minor violation keys (the 3 specified):
 *   ordinance35_2004_sec2a — Failure to segregate wastes
 *   ordinance30_1999_sec5c — Failure to specify appropriate garbage bin label
 *   ordinance94_1994_sec1  — Failure to cover trash receptacle
 *
 * Minor recommendation keys (the 3 specified):
 *   properWasteSegregation  — Proper waste segregation in accordance with the markings
 *   provideSegregationBins  — Provide waste segregation bins with properly labeled markings
 *   attendSeminar           — Attend business establishment environmental seminar
 *
 * PRIORITY if any non-minor violation OR any non-minor recommendation is present.
 * null if no violations AND no recommendations at all.
 */
function computeViolationPriority(violations, recommendations) {
  const MINOR_VIOL_KEYS = [
    "ordinance35_2004_sec2a",
    "ordinance30_1999_sec5c",
    "ordinance94_1994_sec1",
  ];
  const MINOR_REC_KEYS = [
    "properWasteSegregation",
    "provideSegregationBins",
    "attendSeminar",
  ];

  // Collect checked violation keys (excluding meta fields)
  const checkedViols = violations
    ? Object.keys(violations).filter(
        (k) =>
          !["ovrNo", "totalFine", "isNA"].includes(k) && violations[k] === true,
      )
    : [];

  // Collect checked recommendation keys
  const checkedRecs = recommendations
    ? Object.keys(recommendations).filter((k) => recommendations[k] === true)
    : [];

  const hasAnyViol = checkedViols.length > 0;
  const hasAnyRec = checkedRecs.length > 0;

  // Nothing at all → null
  if (!hasAnyViol && !hasAnyRec) return null;

  const hasNonMinorViol = checkedViols.some(
    (k) => !MINOR_VIOL_KEYS.includes(k),
  );
  const hasNonMinorRec = checkedRecs.some((k) => !MINOR_REC_KEYS.includes(k));

  if (hasNonMinorViol || hasNonMinorRec) return "PRIORITY";
  return "LOW_PRIORITY";
}

/** Look up encoder full name from userId via the User model */
async function getEncoderName(userId) {
  try {
    const User = getUserModel();
    const user = await User.findById(userId).select("firstname lastname email");
    if (!user) return userId;
    const full = [user.firstname, user.lastname]
      .filter(Boolean)
      .join(" ")
      .trim();
    return full || user.email || userId;
  } catch (_) {
    return userId;
  }
}

/** Strip empty string values that would fail enum validation */
function sanitizeEnumFields(data) {
  const cleaned = { ...data };
  if (
    cleaned.complianceDeadline === "" ||
    cleaned.complianceDeadline === undefined
  ) {
    cleaned.complianceDeadline = null;
  }
  return cleaned;
}

/** Compute inspectionStatus based on violations & recommendations */
function computeInspectionStatus(data) {
  const isViolated =
    data.inspectionResult === "VIOLATED" && data.violations?.ovrNo;
  const isNotice = data.inspectionResult === "NOTICE_WARNING";
  const hasCompliance =
    data.recommendations && Object.values(data.recommendations).some(Boolean);

  if (isNotice) return "NOTICE";
  if (isViolated && hasCompliance) return "BOTH";
  if (isViolated) return "WITH_VIOLATIONS";
  if (hasCompliance) return "WITH_COMPLIANCE";
  return "PASSED";
}

/** Sync violation record — upsert by inspectionId */
async function syncViolationRecord(inspection, userId) {
  const hasViolations =
    inspection.inspectionResult === "VIOLATED" && inspection.violations?.ovrNo;
  if (!hasViolations) {
    // If inspection was updated to no longer have violations, remove the record
    await ViolationRecord.deleteOne({ inspectionId: inspection.inspectionId });
    return;
  }

  const ordinances = ViolationRecord.buildFromInspection(inspection);
  const totalFine = ordinances.reduce((sum, o) => sum + (o.fee || 0), 0);

  await ViolationRecord.findOneAndUpdate(
    { inspectionId: inspection.inspectionId },
    {
      inspectionId: inspection.inspectionId,
      inspectionRef: inspection._id,
      accountNo: inspection.accountNo,
      businessName: inspection.businessName,
      address: inspection.address,
      barangay: inspection.barangay,
      year: inspection.year,
      ovrNo: inspection.violations.ovrNo,
      dateOfViolation: inspection.dateOfInspection,
      violatedOrdinances: ordinances,
      totalFine,
      createdBy: userId,
    },
    { upsert: true, new: true },
  );
}

/** Sync compliance record — upsert by inspectionId */
async function syncComplianceRecord(inspection, userId) {
  const hasCompliance =
    inspection.recommendations &&
    Object.values(inspection.recommendations).some(Boolean);

  if (!hasCompliance) {
    await ComplianceRecord.deleteOne({ inspectionId: inspection.inspectionId });
    return;
  }

  const requirements = ComplianceRecord.buildFromInspection(inspection);
  const deadlineDate = ComplianceRecord.computeDeadline(
    inspection.dateOfInspection,
    inspection.complianceDeadline,
  );

  // On update: preserve existing compliance status per item
  const existing = await ComplianceRecord.findOne({
    inspectionId: inspection.inspectionId,
  });
  const mergedReqs = requirements.map((req) => {
    if (existing) {
      const prev = existing.requirements.find(
        (r) => r.requirementKey === req.requirementKey,
      );
      if (prev)
        return {
          ...req,
          status: prev.status,
          complianceDate: prev.complianceDate,
          remarks: prev.remarks,
        };
    }
    return req;
  });

  // Derive overallStatus
  const total = mergedReqs.length;
  const complied = mergedReqs.filter((r) => r.status === "COMPLIED").length;
  const overdue = mergedReqs.filter((r) => r.status === "OVERDUE").length;
  let overallStatus = "PENDING";
  if (complied === total) overallStatus = "FULLY_COMPLIED";
  else if (complied > 0) overallStatus = "PARTIALLY_COMPLIED";
  else if (overdue > 0) overallStatus = "OVERDUE";

  await ComplianceRecord.findOneAndUpdate(
    { inspectionId: inspection.inspectionId },
    {
      inspectionId: inspection.inspectionId,
      inspectionRef: inspection._id,
      accountNo: inspection.accountNo,
      businessName: inspection.businessName,
      address: inspection.address,
      barangay: inspection.barangay,
      year: inspection.year,
      complianceDeadline: inspection.complianceDeadline,
      deadlineDate,
      requirements: mergedReqs,
      overallStatus,
      createdBy: userId,
    },
    { upsert: true, new: true },
  );
}

// ── GET all ───────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { year, accountNo } = req.query;
    const filter = {};
    if (year) filter.year = parseInt(year);
    if (accountNo) filter.accountNo = { $regex: accountNo, $options: "i" };
    const reports = await InspectionReport.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET by account ────────────────────────────────────────────────────────────
router.get("/account/:accountNo", async (req, res) => {
  try {
    const reports = await InspectionReport.find({
      accountNo: req.params.accountNo,
    }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET single ────────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const report = await InspectionReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST create ───────────────────────────────────────────────────────────────
router.post("/", verifyToken, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const inspectionId = await generateInspectionId(year);
    const inspectionStatus = computeInspectionStatus(req.body);
    const violationPriority = computeViolationPriority(
      req.body.violations,
      req.body.recommendations,
    );

    const newReport = new InspectionReport({
      ...sanitizeEnumFields(req.body),
      inspectionId,
      inspectionStatus,
      violationPriority,
      year,
      createdBy: req.user.userId,
      encodedByEmail: req.user.email || req.user.userId,
      encodedByName: await getEncoderName(req.user.userId),
    });
    const saved = await newReport.save();

    // Sync to violations & compliance
    await syncViolationRecord(saved, req.user.userId);
    await syncComplianceRecord(saved, req.user.userId);

    await logAction(
      "CREATE",
      "inspectionReports",
      saved._id,
      req.user.userId,
      saved.toObject(),
      req,
      saved.accountNo,
    );
    res.status(201).json(saved);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error", details: e.message });
  }
});

// ── PUT update ────────────────────────────────────────────────────────────────
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const existing = await InspectionReport.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Report not found" });

    const inspectionStatus = computeInspectionStatus(req.body);
    const violationPriority = computeViolationPriority(
      req.body.violations,
      req.body.recommendations,
    );
    const updated = await InspectionReport.findByIdAndUpdate(
      req.params.id,
      {
        ...sanitizeEnumFields(req.body),
        inspectionStatus,
        violationPriority,
        lastUpdatedByEmail: await getEncoderName(req.user.userId),
      },
      { new: true },
    );

    await syncViolationRecord(updated, req.user.userId);
    await syncComplianceRecord(updated, req.user.userId);

    await logAction(
      "UPDATE",
      "inspectionReports",
      updated._id,
      req.user.userId,
      updated.toObject(),
      req,
      updated.accountNo,
    );
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const report = await InspectionReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    // Remove linked records
    await ViolationRecord.deleteOne({ inspectionId: report.inspectionId });
    await ComplianceRecord.deleteOne({ inspectionId: report.inspectionId });

    await InspectionReport.findByIdAndDelete(req.params.id);
    await logAction(
      "DELETE",
      "inspectionReports",
      report._id,
      req.user.userId,
      report.toObject(),
      req,
      report.accountNo,
    );
    res.json({ message: "Deleted successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST create reinspection from existing inspection ────────────────────────
router.post("/:id/reinspect", verifyToken, async (req, res) => {
  try {
    const original = await InspectionReport.findById(req.params.id);
    if (!original)
      return res.status(404).json({ message: "Original inspection not found" });

    // Find the root of this chain (walk up if the original is itself a reinspection)
    const rootId = original.parentInspectionId || original.inspectionId;

    // Count how many reinspections already exist under this root
    const existingCount = await InspectionReport.countDocuments({
      parentInspectionId: rootId,
      isReinspection: true,
    });

    const year = new Date().getFullYear();
    const inspectionId = await generateInspectionId(year);

    // Clone all data from the original, allow caller to override via req.body
    const baseData = original.toObject();
    // Strip mongo internals and identity fields
    delete baseData._id;
    delete baseData.inspectionId;
    delete baseData.isReinspection;
    delete baseData.parentInspectionId;
    delete baseData.reinspectionNumber;
    delete baseData.createdAt;
    delete baseData.updatedAt;
    delete baseData.__v;

    // Merge caller overrides (the form data from all 3 parts)
    const mergedData = sanitizeEnumFields({ ...baseData, ...req.body });

    const inspectionStatus = computeInspectionStatus(mergedData);
    const violationPriority = computeViolationPriority(
      mergedData.violations,
      mergedData.recommendations,
    );

    const reinspection = new InspectionReport({
      ...mergedData,
      inspectionId,
      inspectionStatus,
      violationPriority,
      year,
      isReinspection: true,
      parentInspectionId: rootId,
      reinspectionNumber: existingCount + 1,
      createdBy: req.user.userId,
      encodedByEmail: req.user.email || req.user.userId,
      encodedByName: await getEncoderName(req.user.userId),
    });

    const saved = await reinspection.save();

    await syncViolationRecord(saved, req.user.userId);
    await syncComplianceRecord(saved, req.user.userId);

    await logAction(
      "CREATE",
      "inspectionReports",
      saved._id,
      req.user.userId,
      {
        reinspection: true,
        parentInspectionId: rootId,
        reinspectionNumber: saved.reinspectionNumber,
      },
      req,
      saved.accountNo,
    );

    res.status(201).json(saved);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error", details: e.message });
  }
});

// ── GET full inspection chain (original + all reinspections) ─────────────────
router.get("/:id/history", async (req, res) => {
  try {
    const target = await InspectionReport.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Not found" });

    // Find root inspectionId
    const rootId = target.isReinspection
      ? target.parentInspectionId
      : target.inspectionId;

    // Get the original
    const original = await InspectionReport.findOne({ inspectionId: rootId });

    // Get all reinspections under this root, sorted by number
    const reinspections = await InspectionReport.find({
      parentInspectionId: rootId,
      isReinspection: true,
    }).sort({ reinspectionNumber: 1 });

    const chain = original ? [original, ...reinspections] : reinspections;
    res.json(chain);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
