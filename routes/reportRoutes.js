// routes/reportRoutes.js
const express = require("express");
const mongoose = require("mongoose");

module.exports = function (establishmentsDB) {
  const router = express.Router();

  // ── Business model helper ────────────────────────────────────────────────────
  function getBusinessModel(year) {
    if (establishmentsDB.models[`business${year}`]) {
      return establishmentsDB.model(`business${year}`);
    }
    const businessSchema = new mongoose.Schema({}, { strict: false });
    return establishmentsDB.model(
      `business${year}`,
      businessSchema,
      `business${year}`,
    );
  }

  // ── Inspection / Violation / Compliance models (same DB) ────────────────────
  function getInspectionModel() {
    if (establishmentsDB.models["InspectionReport"])
      return establishmentsDB.model("InspectionReport");
    const s = new mongoose.Schema(
      {},
      { strict: false, collection: "inspectionReports" },
    );
    return establishmentsDB.model("InspectionReport", s, "inspectionReports");
  }
  function getViolationModel() {
    if (establishmentsDB.models["ViolationRecord"])
      return establishmentsDB.model("ViolationRecord");
    const s = new mongoose.Schema(
      {},
      { strict: false, collection: "violationRecords" },
    );
    return establishmentsDB.model("ViolationRecord", s, "violationRecords");
  }
  function getComplianceModel() {
    if (establishmentsDB.models["ComplianceRecord"])
      return establishmentsDB.model("ComplianceRecord");
    const s = new mongoose.Schema(
      {},
      { strict: false, collection: "complianceRecords" },
    );
    return establishmentsDB.model("ComplianceRecord", s, "complianceRecords");
  }

  // ── CSV helpers ──────────────────────────────────────────────────────────────
  function convertToCSV(headers, rows) {
    if (!rows || rows.length === 0) return headers.join(",");
    const escape = (val) => {
      let s = val === null || val === undefined ? "" : String(val);
      if (s.includes('"')) s = s.replace(/"/g, '""');
      if (s.includes(",") || s.includes("\n") || s.includes('"')) s = `"${s}"`;
      return s;
    };
    const csvRows = rows.map((obj) =>
      headers.map((h) => escape(obj[h])).join(","),
    );
    return headers.join(",") + "\n" + csvRows.join("\n");
  }

  function safeDate(v) {
    if (!v) return "";
    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    } catch (_) {
      return "";
    }
  }

  function boolLabel(v) {
    if (v === true) return "Yes";
    if (v === false) return "No";
    return v || "";
  }

  function ordinanceList(violatedOrdinances) {
    if (!Array.isArray(violatedOrdinances) || !violatedOrdinances.length)
      return "";
    return violatedOrdinances
      .map((o) => `${o.ordinanceLabel || o.ordinanceKey} (₱${o.fee || 0})`)
      .join(" | ");
  }

  function requirementList(requirements) {
    if (!Array.isArray(requirements) || !requirements.length) return "";
    return requirements
      .map(
        (r) =>
          `${r.requirementLabel || r.requirementKey}: ${r.status || "PENDING"}`,
      )
      .join(" | ");
  }

  function inspectorNames(inspectors) {
    if (!inspectors) return "";
    const map = {
      alvinMagbanua: "Alvin Magbanua",
      edwinPaderes: "Edwin Paderes",
      jaycelEden: "Jaycel Eden",
      jeffreyBasco: "Jeffrey Basco",
      jennySandrino: "Jenny Sandrino",
      jhonIvanMadronal: "Jhon Ivan Madronal",
      jovenSantiago: "Joven Santiago",
      marcJoelRato: "Marc Joel Rato",
      ninaTan: "Niña Tan",
      robinRomero: "Robin Romero",
    };
    return Object.entries(map)
      .filter(([k]) => inspectors[k])
      .map(([, v]) => v)
      .join(", ");
  }

  // ── Available years ──────────────────────────────────────────────────────────
  router.get("/available-years", async (req, res) => {
    try {
      const collections = await establishmentsDB.db.listCollections().toArray();
      const years = collections
        .map((col) => col.name)
        .filter((name) => name.startsWith("business") && name.length === 12)
        .map((name) => name.substring(8));
      years.sort((a, b) => b - a);
      res.json(years);
    } catch (error) {
      console.error("Error fetching available years:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── Business CSV (existing) ──────────────────────────────────────────────────
  router.get("/csv/:year", async (req, res) => {
    try {
      const { year } = req.params;
      const BusinessModel = getBusinessModel(year);
      const businesses = await BusinessModel.find({});

      const headers = [
        "accountNo",
        "dateOfApplication",
        "orNo",
        "amountPaid",
        "dateOfPayment",
        "status",
        "applicationStatus",
        "businessName",
        "ownerName",
        "address",
        "barangay",
        "natureOfBusiness",
        "remarks",
      ];

      const rows = businesses.map((b) => ({
        accountNo: b["ACCOUNT NO"] || "",
        dateOfApplication: safeDate(b["DATE OF APPLICATION"]),
        orNo: b["OR NO"] || "",
        amountPaid: b["AMOUNT PAID"] || 0,
        dateOfPayment: safeDate(b["DATE OF PAYMENT"]),
        status: b["STATUS"] || "",
        applicationStatus: b["APPLICATION STATUS"] || "",
        businessName: b["NAME OF BUSINESS"] || "",
        ownerName: b["NAME OF OWNER"] || "",
        address: b["ADDRESS"] || "",
        barangay: b["BARANGAY"] || "",
        natureOfBusiness: b["NATURE OF BUSINESS"] || "",
        remarks: b["REMARKS"] || "",
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="environmental_clearance_report_${year}.csv"`,
      );
      res.send(convertToCSV(headers, rows));
    } catch (error) {
      console.error("Error generating CSV report:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── Business no-payments CSV (existing) ─────────────────────────────────────
  router.get("/csv/:year/no-payments", async (req, res) => {
    try {
      const { year } = req.params;
      const BusinessModel = getBusinessModel(year);
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);

      const businesses = await BusinessModel.find({
        $or: [
          { "DATE OF PAYMENT": { $lt: startOfYear } },
          { "DATE OF PAYMENT": { $gt: endOfYear } },
          { "DATE OF PAYMENT": null },
          { "DATE OF PAYMENT": { $exists: false } },
          { "AMOUNT PAID": 0 },
          { "AMOUNT PAID": null },
        ],
      });

      const headers = [
        "accountNo",
        "dateOfApplication",
        "orNo",
        "amountPaid",
        "dateOfPayment",
        "status",
        "applicationStatus",
        "businessName",
        "ownerName",
        "address",
        "barangay",
        "natureOfBusiness",
        "remarks",
      ];

      const rows = businesses.map((b) => ({
        accountNo: b["ACCOUNT NO"] || "",
        dateOfApplication: safeDate(b["DATE OF APPLICATION"]),
        orNo: b["OR NO"] || "",
        amountPaid: b["AMOUNT PAID"] || 0,
        dateOfPayment: safeDate(b["DATE OF PAYMENT"]),
        status: b["STATUS"] || "",
        applicationStatus: b["APPLICATION STATUS"] || "",
        businessName: b["NAME OF BUSINESS"] || "",
        ownerName: b["NAME OF OWNER"] || "",
        address: b["ADDRESS"] || "",
        barangay: b["BARANGAY"] || "",
        natureOfBusiness: b["NATURE OF BUSINESS"] || "",
        remarks: b["REMARKS"] || "",
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="environmental_clearance_no_payments_report_${year}.csv"`,
      );
      res.send(convertToCSV(headers, rows));
    } catch (error) {
      console.error("Error generating no-payments CSV report:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── NEW: Inspection Reports CSV ──────────────────────────────────────────────
  router.get("/csv/:year/inspections", async (req, res) => {
    try {
      const { year } = req.params;
      const InspectionReport = getInspectionModel();
      const records = await InspectionReport.find({
        year: parseInt(year),
      }).sort({ createdAt: 1 });

      const headers = [
        "inspectionId",
        "isReinspection",
        "parentInspectionId",
        "reinspectionNumber",
        "accountNo",
        "businessName",
        "address",
        "barangay",
        "applicationStatus",
        "dateOfInspection",
        "inspectionResult",
        "inspectionStatus",
        "violationPriority",
        "ovrNo",
        "totalFine",
        "complianceDeadline",
        "violations",
        "recommendations",
        "operationStatus",
        "observationStatement",
        "directives",
        "afterRecommendations",
        "inspectors",
        "encodedByName",
        "encodedByEmail",
        "lastUpdatedByEmail",
        "createdAt",
        "updatedAt",
      ];

      const rows = records.map((r) => {
        // Collect checked violations
        const violKeys = [
          "ordinance35_2004_sec2a",
          "ordinance30_1999_sec5c",
          "ordinance94_1994_sec1",
          "ordinance91_2013_sec5F03d",
          "ordinance21_11_sec14_2",
          "ordinance91_2013_sec5F03e",
          "ordinance10_2011",
          "ordinance09_2011_sec3_1",
          "ordinance91_2013_sec5F03a",
          "ordinance91_2013_sec5F03b",
          "ordinance91_2013_sec5F03c",
          "ordinance15_11_sec1b",
          "ordinance14_2024_sec5w",
        ];
        const violLabels = {
          ordinance35_2004_sec2a: "Failure to segregate wastes",
          ordinance30_1999_sec5c: "Failure to specify garbage bin label",
          ordinance94_1994_sec1: "Failure to cover trash receptacle",
          ordinance91_2013_sec5F03d:
            "Failure to install anti-pollution devices",
          ordinance21_11_sec14_2: "Failure to desludge septic tank",
          ordinance91_2013_sec5F03e: "Failure to present clearances/permits",
          ordinance10_2011: "Dumping solid waste into canals/drainage",
          ordinance09_2011_sec3_1: "Littering / illegal dumping",
          ordinance91_2013_sec5F03a:
            "Failure to pay Environmental Protection Fee",
          ordinance91_2013_sec5F03b: "Failure to appoint PCO",
          ordinance91_2013_sec5F03c: "Refused entry to inspectors",
          ordinance15_11_sec1b: "Improper disposal of used cooking oil",
          ordinance14_2024_sec5w: "Tobacco Advertisement",
        };

        const checkedViols = r.violations?.isNA
          ? ["N/A"]
          : violKeys
              .filter((k) => r.violations?.[k])
              .map((k) => violLabels[k] || k);

        const recLabels = {
          environmentalComplianceCertificate:
            "Environmental Compliance Certificate",
          certificateOfNonCoverage: "Certificate of Non-Coverage",
          wastewaterDischargePerm: "Wastewater Discharge Permit",
          hazardousWasteGeneratorId: "Hazardous Waste Generator ID",
          permitToOperateAirPollution: "Permit to Operate (Air Pollution)",
          pcoAccreditationCertificate: "PCO Accreditation Certificate",
          tsdCertificate: "Transport/Storage/Disposal Certificate",
          environmentalProtectionFee: "Environmental Protection Fee",
          appointPCO: "Appoint PCO",
          provideSegregationBins: "Provide segregation bins",
          properWasteSegregation: "Proper waste segregation",
          installGreaseTrap: "Install grease trap",
          installExhaustSystem: "Install exhaust system",
          installSepticTank: "Install septic tank",
          attendSeminar: "Attend environmental seminar",
        };
        const checkedRecs = r.recommendations
          ? Object.entries(recLabels)
              .filter(([k]) => r.recommendations[k])
              .map(([, v]) => v)
          : [];

        const afterRecLabels = {
          forReinspection: "For reinspection",
          forSeminar: "For seminar",
          complianceMeasures: "For compliance measures",
          forCDO: "For CDO",
          issuanceCEC: "Issuance of CEC",
          forCaseConference: "For Case Conference",
          forCaseTermination: "For Case Termination",
        };
        const checkedAfterRecs = r.afterRecommendations
          ? Object.entries(afterRecLabels)
              .filter(([k]) => r.afterRecommendations[k])
              .map(([, v]) => v)
          : [];

        return {
          inspectionId: r.inspectionId || "",
          isReinspection: boolLabel(r.isReinspection),
          parentInspectionId: r.parentInspectionId || "",
          reinspectionNumber: r.reinspectionNumber ?? "",
          accountNo: r.accountNo || "",
          businessName: r.businessName || "",
          address: r.address || "",
          barangay: r.barangay || "",
          applicationStatus: r.applicationStatus || "",
          dateOfInspection: safeDate(r.dateOfInspection),
          inspectionResult: r.inspectionResult || "",
          inspectionStatus: r.inspectionStatus || "",
          violationPriority: r.violationPriority || "",
          ovrNo: r.violations?.ovrNo || "",
          totalFine: r.violations?.totalFine ?? "",
          complianceDeadline: r.complianceDeadline || "",
          violations: checkedViols.join(" | "),
          recommendations: checkedRecs.join(" | "),
          operationStatus: r.findings?.operationStatus || "",
          observationStatement: r.findings?.observationStatement || "",
          directives: r.directives || "",
          afterRecommendations: checkedAfterRecs.join(" | "),
          inspectors: inspectorNames(r.inspectors),
          encodedByName: r.encodedByName || "",
          encodedByEmail: r.encodedByEmail || "",
          lastUpdatedByEmail: r.lastUpdatedByEmail || "",
          createdAt: safeDate(r.createdAt),
          updatedAt: safeDate(r.updatedAt),
        };
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="inspection_reports_${year}.csv"`,
      );
      res.send(convertToCSV(headers, rows));
    } catch (error) {
      console.error("Error generating inspection reports CSV:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── NEW: Violation Records CSV ───────────────────────────────────────────────
  router.get("/csv/:year/violations", async (req, res) => {
    try {
      const { year } = req.params;
      const ViolationRecord = getViolationModel();
      const records = await ViolationRecord.find({ year: parseInt(year) }).sort(
        { createdAt: 1 },
      );

      const headers = [
        "inspectionId",
        "accountNo",
        "businessName",
        "address",
        "barangay",
        "ovrNo",
        "dateOfViolation",
        "violatedOrdinances",
        "totalFine",
        "paymentStatus",
        "paymentDate",
        "orNo",
        "remarks",
        "createdAt",
      ];

      const rows = records.map((r) => ({
        inspectionId: r.inspectionId || "",
        accountNo: r.accountNo || "",
        businessName: r.businessName || "",
        address: r.address || "",
        barangay: r.barangay || "",
        ovrNo: r.ovrNo || "",
        dateOfViolation: safeDate(r.dateOfViolation),
        violatedOrdinances: ordinanceList(r.violatedOrdinances),
        totalFine: r.totalFine ?? "",
        paymentStatus: r.paymentStatus || "",
        paymentDate: safeDate(r.paymentDate),
        orNo: r.orNo || "",
        remarks: r.remarks || "",
        createdAt: safeDate(r.createdAt),
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="violation_records_${year}.csv"`,
      );
      res.send(convertToCSV(headers, rows));
    } catch (error) {
      console.error("Error generating violations CSV:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── NEW: Compliance Records CSV ──────────────────────────────────────────────
  router.get("/csv/:year/compliance", async (req, res) => {
    try {
      const { year } = req.params;
      const ComplianceRecord = getComplianceModel();
      const records = await ComplianceRecord.find({
        year: parseInt(year),
      }).sort({ createdAt: 1 });

      const headers = [
        "inspectionId",
        "accountNo",
        "businessName",
        "address",
        "barangay",
        "complianceDeadline",
        "deadlineDate",
        "overallStatus",
        "requirements",
        "remarks",
        "createdAt",
      ];

      const rows = records.map((r) => ({
        inspectionId: r.inspectionId || "",
        accountNo: r.accountNo || "",
        businessName: r.businessName || "",
        address: r.address || "",
        barangay: r.barangay || "",
        complianceDeadline: r.complianceDeadline || "",
        deadlineDate: safeDate(r.deadlineDate),
        overallStatus: r.overallStatus || "",
        requirements: requirementList(r.requirements),
        remarks: r.remarks || "",
        createdAt: safeDate(r.createdAt),
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="compliance_records_${year}.csv"`,
      );
      res.send(convertToCSV(headers, rows));
    } catch (error) {
      console.error("Error generating compliance CSV:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
};
