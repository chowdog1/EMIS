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
        // ── Identity
        "Inspection ID",
        "Is Reinspection",
        "Parent Inspection ID",
        "Reinspection No.",
        // ── Part 1: Business info
        "Account No.",
        "Business Name",
        "Address",
        "Barangay",
        "Application Status",
        // ── Part 1: Inspection result
        "Date of Inspection",
        "Inspection Result",
        "Inspection Status",
        "Violation Priority",
        "OVR No.",
        "Total Fine (₱)",
        "Compliance Deadline",
        "Violations",
        "Recommendations",
        // ── Part 2: Permits
        "Mayor's Permit",
        "Environmental Protection Fee",
        "Environmental Compliance Certificate",
        "ECC No.",
        "ECC Date Issued",
        "Certificate of Non-Coverage",
        "CNC No.",
        "CNC Date Issued",
        "Wastewater Discharge Permit",
        "WDP No.",
        "WDP Validity",
        "Permit to Operate (Air Pollution)",
        "PTO No.",
        "PTO Validity",
        "Hazardous Waste Generator ID",
        "HWID No.",
        "HWID Date Issued",
        // ── Part 2: PCO
        "PCO Name",
        "PCO Accreditation No.",
        "PCO Contact No.",
        "PCO Email",
        // ── Part 2: Solid Waste
        "Waste Bins Provided",
        "Bins Properly Labelled",
        "Bins Covered",
        "Proper Waste Segregation",
        "MRF Provided",
        "Wastes Collected",
        "Hauling Frequency",
        "Hauler",
        // ── Part 2: Liquid Waste — Septic Tank
        "Septic Tank Installed",
        "Septic Tank Location",
        "Septic Tank Capacity",
        "Desludging Frequency",
        "Date of Desludging",
        "Septic Tank Service Provider",
        // ── Part 2: Liquid Waste — Grease Trap
        "Grease Trap Installed",
        "Grease Trap Location",
        "Grease Trap Capacity",
        "Grease Trap Hauling Frequency",
        "Grease Trap Hauler",
        // ── Part 2: Liquid Waste — WWTP
        "Wastewater Treatment Plant",
        "WWTP Laboratory Analysis Result",
        // ── Part 2: Liquid Waste — Used Oil
        "Used Oil Properly Disposed",
        "Type of Oil",
        "Oil Hauling Frequency",
        "Oil Hauler",
        // ── Part 2: Air Pollution
        "Pollution Control Devices Installed",
        "Device Type",
        "Maintenance Provider",
        // ── Part 3: Purpose
        "Purpose: New Establishment",
        "Purpose: Compliance Check",
        // ── Part 3: Physical Environment
        "Land Use: Commercial",
        "Land Use: Residential",
        "Land Use: Industrial",
        "Land Use: Institutional",
        "Ownership: Proprietorship",
        "Ownership: Private Corporation",
        "Ownership: Multi-National",
        "Occupancy: Lessee",
        "Occupancy: Stand Alone",
        // ── Part 3: Findings
        "Operation Status During Inspection",
        "Inspector's Observation Statement",
        "Directives",
        // ── Part 3: After Recommendations
        "After-Inspection Recommendations",
        // ── Meta
        "Inspectors",
        "Encoded By",
        "Encoder Email",
        "Last Modified By",
        "Date Created",
        "Date Updated",
      ];

      const yn = (v) =>
        v === "YES"
          ? "Yes"
          : v === "NO"
            ? "No"
            : v === "NA"
              ? "N/A"
              : v || "N/A";
      const bl = (v) => (v ? "Yes" : "No");

      const violLabels = {
        ordinance35_2004_sec2a:
          "CO 35-2004 sec.2a — Failure to segregate wastes",
        ordinance30_1999_sec5c:
          "CO 30-1999 sec.5c — Failure to specify garbage bin label",
        ordinance94_1994_sec1:
          "CO 94-1994 sec.1 — Failure to cover trash receptacle",
        ordinance91_2013_sec5F03d:
          "CO 91-2013 sec.5F-03d — Failure to install anti-pollution devices",
        ordinance21_11_sec14_2:
          "CO 21-11 sec 14.2 — Failure to desludge septic tank",
        ordinance91_2013_sec5F03e:
          "CO 91-2013 sec.5F-03e — Failure to present clearances/permits",
        ordinance10_2011:
          "CO 10-2011 — Dumping solid waste into canals/drainage",
        ordinance09_2011_sec3_1:
          "CO 09-2011 sec.3-1 — Littering / illegal dumping",
        ordinance91_2013_sec5F03a:
          "CO 91-2013 sec.5F-03a — Failure to pay Environmental Protection Fee",
        ordinance91_2013_sec5F03b:
          "CO 91-2013 sec.5F-03b — Failure to appoint PCO",
        ordinance91_2013_sec5F03c:
          "CO 91-2013 sec.5F-03c — Refused entry to inspectors",
        ordinance15_11_sec1b:
          "CO 15-11 sec.1b — Improper disposal of used cooking oil",
        ordinance14_2024_sec5w: "CO 14-2024 sec.5w — Tobacco Advertisement",
      };
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
      const afterRecLabels = {
        forReinspection: "For reinspection",
        forSeminar: "For seminar",
        complianceMeasures: "For compliance measures",
        forCDO: "For CDO",
        issuanceCEC: "Issuance of CEC",
        forCaseConference: "For Case Conference",
        forCaseTermination: "For Case Termination",
      };

      const rows = records.map((r) => {
        const p = r.permits || {};
        const pco = r.pco || {};
        const sw = r.wasteManagement?.solidWaste || {};
        const lw = r.wasteManagement?.liquidWaste || {};
        const st = lw.septicTank || {};
        const gt = lw.greaseTrap || {};
        const wt = lw.wwtp || {};
        const oil = lw.usedOil || {};
        const air =
          r.wasteManagement?.airPollution?.pollutionControlDevices || {};
        const pe = r.physicalEnvironment || {};
        const lu = pe.landUse || {};
        const ot = pe.ownershipTerms || {};
        const occ = pe.occupancyTerms || {};
        const fi = r.findings || {};
        const pur = r.purposeOfInspection || {};
        const ar = r.afterRecommendations || {};

        const checkedViols = r.violations?.isNA
          ? ["N/A"]
          : Object.keys(violLabels)
              .filter((k) => r.violations?.[k])
              .map((k) => violLabels[k]);
        const checkedRecs = Object.entries(recLabels)
          .filter(([k]) => r.recommendations?.[k])
          .map(([, v]) => v);
        const checkedAfterRecs = Object.entries(afterRecLabels)
          .filter(([k]) => ar[k])
          .map(([, v]) => v);

        return {
          // Identity
          "Inspection ID": r.inspectionId || "",
          "Is Reinspection": boolLabel(r.isReinspection),
          "Parent Inspection ID": r.parentInspectionId || "",
          "Reinspection No.": r.reinspectionNumber ?? "",
          // Part 1: Business info
          "Account No.": r.accountNo || "",
          "Business Name": r.businessName || "",
          Address: r.address || "",
          Barangay: r.barangay || "",
          "Application Status": r.applicationStatus || "",
          // Part 1: Result
          "Date of Inspection": safeDate(r.dateOfInspection),
          "Inspection Result":
            r.inspectionResult === "NOTICE_WARNING"
              ? "Notice/Warning"
              : r.inspectionResult || "",
          "Inspection Status": r.inspectionStatus || "",
          "Violation Priority": r.violationPriority || "",
          "OVR No.": r.violations?.ovrNo || "",
          "Total Fine (₱)": r.violations?.totalFine ?? "",
          "Compliance Deadline": r.complianceDeadline || "",
          Violations: checkedViols.join(" | "),
          Recommendations: checkedRecs.join(" | "),
          // Part 2: Permits
          "Mayor's Permit": yn(p.mayorsPermit),
          "Environmental Protection Fee": yn(p.environmentalProtectionFee),
          "Environmental Compliance Certificate": yn(p.ecc?.status),
          "ECC No.": p.ecc?.status === "YES" ? p.ecc?.eccNumber || "" : "",
          "ECC Date Issued":
            p.ecc?.status === "YES" ? safeDate(p.ecc?.dateIssued) : "",
          "Certificate of Non-Coverage": yn(p.cnc?.status),
          "CNC No.": p.cnc?.status === "YES" ? p.cnc?.cncNumber || "" : "",
          "CNC Date Issued":
            p.cnc?.status === "YES" ? safeDate(p.cnc?.dateIssued) : "",
          "Wastewater Discharge Permit": yn(p.wdp?.status),
          "WDP No.": p.wdp?.status === "YES" ? p.wdp?.wdpNumber || "" : "",
          "WDP Validity": p.wdp?.status === "YES" ? p.wdp?.validity || "" : "",
          "Permit to Operate (Air Pollution)": yn(p.pto?.status),
          "PTO No.": p.pto?.status === "YES" ? p.pto?.ptoNumber || "" : "",
          "PTO Validity": p.pto?.status === "YES" ? p.pto?.validity || "" : "",
          "Hazardous Waste Generator ID": yn(p.hwid?.status),
          "HWID No.": p.hwid?.status === "YES" ? p.hwid?.hwidNumber || "" : "",
          "HWID Date Issued":
            p.hwid?.status === "YES" ? safeDate(p.hwid?.dateIssued) : "",
          // Part 2: PCO
          "PCO Name": pco.name || "",
          "PCO Accreditation No.": pco.accreditationNo || "",
          "PCO Contact No.": pco.contactNo || "",
          "PCO Email": pco.email || "",
          // Part 2: Solid Waste
          "Waste Bins Provided": yn(sw.wasteBinsProvided),
          "Bins Properly Labelled": yn(sw.binsProperlyLabelled),
          "Bins Covered": yn(sw.binsCovered),
          "Proper Waste Segregation": yn(sw.properSegregation),
          "MRF Provided": yn(sw.mrf),
          "Wastes Collected": yn(sw.wastesCollected),
          "Hauling Frequency": sw.frequencyOfHauling || "",
          Hauler: sw.hauler || "",
          // Part 2: Septic Tank
          "Septic Tank Installed": yn(st.status),
          "Septic Tank Location": st.status === "YES" ? st.location || "" : "",
          "Septic Tank Capacity": st.status === "YES" ? st.capacity || "" : "",
          "Desludging Frequency":
            st.status === "YES" ? st.frequencyOfDesludging || "" : "",
          "Date of Desludging":
            st.status === "YES" ? safeDate(st.dateOfDesludging) : "",
          "Septic Tank Service Provider":
            st.status === "YES" ? st.serviceProvider || "" : "",
          // Part 2: Grease Trap
          "Grease Trap Installed": yn(gt.status),
          "Grease Trap Location": gt.status === "YES" ? gt.location || "" : "",
          "Grease Trap Capacity": gt.status === "YES" ? gt.capacity || "" : "",
          "Grease Trap Hauling Frequency":
            gt.status === "YES" ? gt.frequencyOfHauling || "" : "",
          "Grease Trap Hauler": gt.status === "YES" ? gt.hauler || "" : "",
          // Part 2: WWTP
          "Wastewater Treatment Plant": yn(wt.status),
          "WWTP Laboratory Analysis Result":
            wt.status === "YES" ? wt.laboratoryAnalysisResult || "" : "",
          // Part 2: Used Oil
          "Used Oil Properly Disposed": yn(oil.status),
          "Type of Oil": oil.status === "YES" ? oil.typeOfOil || "" : "",
          "Oil Hauling Frequency":
            oil.status === "YES" ? oil.frequencyOfHauling || "" : "",
          "Oil Hauler": oil.status === "YES" ? oil.hauler || "" : "",
          // Part 2: Air Pollution
          "Pollution Control Devices Installed": yn(air.status),
          "Device Type": air.status === "YES" ? air.deviceType || "" : "",
          "Maintenance Provider":
            air.status === "YES" ? air.maintenanceProvider || "" : "",
          // Part 3: Purpose
          "Purpose: New Establishment": bl(pur.newEstablishment),
          "Purpose: Compliance Check": bl(pur.complianceCheck),
          // Part 3: Physical Environment
          "Land Use: Commercial": bl(lu.commercial),
          "Land Use: Residential": bl(lu.residential),
          "Land Use: Industrial": bl(lu.industrial),
          "Land Use: Institutional": bl(lu.institutional),
          "Ownership: Proprietorship": bl(ot.proprietorship),
          "Ownership: Private Corporation": bl(ot.privateCorporation),
          "Ownership: Multi-National": bl(ot.multiNational),
          "Occupancy: Lessee": yn(occ.lessee),
          "Occupancy: Stand Alone": yn(occ.standAlone),
          // Part 3: Findings
          "Operation Status During Inspection": (
            fi.operationStatus || ""
          ).replace(/_/g, " "),
          "Inspector's Observation Statement": fi.observationStatement || "",
          Directives: r.directives || "",
          // Part 3: After Recommendations
          "After-Inspection Recommendations": checkedAfterRecs.join(" | "),
          // Meta
          Inspectors: inspectorNames(r.inspectors),
          "Encoded By": r.encodedByName || "",
          "Encoder Email": r.encodedByEmail || "",
          "Last Modified By": r.lastUpdatedByEmail || "",
          "Date Created": safeDate(r.createdAt),
          "Date Updated": safeDate(r.updatedAt),
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
        "Inspection ID",
        "Account No.",
        "Business Name",
        "Address",
        "Barangay",
        "OVR No.",
        "Date of Violation",
        "Violated Ordinances",
        "Total Fine (₱)",
        "Payment Status",
        "Date of Payment",
        "OR No.",
        "Remarks",
        "Date Created",
      ];

      const rows = records.map((r) => ({
        "Inspection ID": r.inspectionId || "",
        "Account No.": r.accountNo || "",
        "Business Name": r.businessName || "",
        Address: r.address || "",
        Barangay: r.barangay || "",
        "OVR No.": r.ovrNo || "",
        "Date of Violation": safeDate(r.dateOfViolation),
        "Violated Ordinances": ordinanceList(r.violatedOrdinances),
        "Total Fine (₱)": r.totalFine ?? "",
        "Payment Status": r.paymentStatus || "",
        "Date of Payment": safeDate(r.paymentDate),
        "OR No.": r.orNo || "",
        Remarks: r.remarks || "",
        "Date Created": safeDate(r.createdAt),
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
        "Inspection ID",
        "Account No.",
        "Business Name",
        "Address",
        "Barangay",
        "Compliance Deadline",
        "Deadline Date",
        "Overall Status",
        "Requirements",
        "Remarks",
        "Date Created",
      ];

      const rows = records.map((r) => ({
        "Inspection ID": r.inspectionId || "",
        "Account No.": r.accountNo || "",
        "Business Name": r.businessName || "",
        Address: r.address || "",
        Barangay: r.barangay || "",
        "Compliance Deadline": r.complianceDeadline || "",
        "Deadline Date": safeDate(r.deadlineDate),
        "Overall Status": r.overallStatus || "",
        Requirements: requirementList(r.requirements),
        Remarks: r.remarks || "",
        "Date Created": safeDate(r.createdAt),
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
