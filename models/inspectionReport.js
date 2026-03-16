// models/inspectionReport.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const inspectionReportSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    inspectionId: { type: String, unique: true }, // INSP-2026-001
    year: { type: Number, default: () => new Date().getFullYear() },

    // Table status badge:
    // "PASSED" | "WITH_VIOLATIONS" | "WITH_COMPLIANCE" | "BOTH" | "NOTICE"
    inspectionStatus: {
      type: String,
      enum: ["PASSED", "WITH_VIOLATIONS", "WITH_COMPLIANCE", "BOTH", "NOTICE"],
      default: "PASSED",
    },

    // Violation priority shown as a separate badge in the table:
    // "PRIORITY"     = any violation with fee >= 1000 is checked
    // "LOW_PRIORITY" = only the 3 minor 500-peso violations checked
    // null           = no violations
    violationPriority: {
      type: String,
      enum: ["PRIORITY", "LOW_PRIORITY", null],
      default: null,
    },

    // ── PART 1: Notice of Inspection ─────────────────────────────────────────
    accountNo: { type: String, required: true },
    businessName: String,
    address: String,
    applicationStatus: String, // "NEW" | "RENEWAL"
    barangay: String,
    dateOfInspection: Date,

    inspectionResult: {
      type: String,
      enum: ["PASSED", "VIOLATED", "NOTICE_WARNING"],
      required: true,
    },

    violations: {
      ordinance35_2004_sec2a: { type: Boolean, default: false },
      ordinance30_1999_sec5c: { type: Boolean, default: false },
      ordinance94_1994_sec1: { type: Boolean, default: false },
      ordinance91_2013_sec5F03d: { type: Boolean, default: false },
      ordinance21_11_sec14_2: { type: Boolean, default: false },
      ordinance91_2013_sec5F03e: { type: Boolean, default: false },
      ordinance10_2011: { type: Boolean, default: false },
      ordinance09_2011_sec3_1: { type: Boolean, default: false },
      ordinance91_2013_sec5F03a: { type: Boolean, default: false },
      ordinance91_2013_sec5F03b: { type: Boolean, default: false },
      ordinance91_2013_sec5F03c: { type: Boolean, default: false },
      ordinance15_11_sec1b: { type: Boolean, default: false },
      ordinance14_2024_sec5w: { type: Boolean, default: false },
      isNA: { type: Boolean, default: false }, // N/A selected — no specific violation
      ovrNo: String,
      totalFine: { type: Number, default: 0 },
    },

    complianceDeadline: {
      type: String,
      enum: ["7 days", "1 month", "2 months", null, ""],
      default: null,
    },

    recommendations: {
      environmentalComplianceCertificate: { type: Boolean, default: false },
      certificateOfNonCoverage: { type: Boolean, default: false },
      wastewaterDischargePerm: { type: Boolean, default: false },
      hazardousWasteGeneratorId: { type: Boolean, default: false },
      permitToOperateAirPollution: { type: Boolean, default: false },
      pcoAccreditationCertificate: { type: Boolean, default: false },
      tsdCertificate: { type: Boolean, default: false },
      environmentalProtectionFee: { type: Boolean, default: false },
      appointPCO: { type: Boolean, default: false },
      provideSegregationBins: { type: Boolean, default: false },
      properWasteSegregation: { type: Boolean, default: false },
      installGreaseTrap: { type: Boolean, default: false },
      installExhaustSystem: { type: Boolean, default: false },
      installSepticTank: { type: Boolean, default: false },
      attendSeminar: { type: Boolean, default: false },
    },

    // ── PART 2: Inspection Checklist ─────────────────────────────────────────
    permits: {
      mayorsPermit: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
      environmentalProtectionFee: {
        type: String,
        enum: ["YES", "NO", "NA"],
        default: "NA",
      },
      ecc: {
        status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
        eccNumber: String,
        dateIssued: Date,
      },
      cnc: {
        status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
        cncNumber: String,
        dateIssued: Date,
      },
      wdp: {
        status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
        wdpNumber: String,
        validity: String,
      },
      pto: {
        status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
        ptoNumber: String,
        validity: String,
      },
      hwid: {
        status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
        hwidNumber: String,
        dateIssued: Date,
      },
    },

    pco: {
      name: String,
      accreditationNo: String,
      contactNo: String,
      email: String,
    },

    wasteManagement: {
      solidWaste: {
        wasteBinsProvided: { type: String, enum: ["YES", "NO"], default: "NO" },
        binsProperlyLabelled: {
          type: String,
          enum: ["YES", "NO"],
          default: "NO",
        },
        binsCovered: { type: String, enum: ["YES", "NO"], default: "NO" },
        properSegregation: { type: String, enum: ["YES", "NO"], default: "NO" },
        mrf: { type: String, enum: ["YES", "NO"], default: "NO" },
        wastesCollected: { type: String, enum: ["YES", "NO"], default: "NO" },
        frequencyOfHauling: String,
        hauler: String,
      },
      liquidWaste: {
        septicTank: {
          status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
          location: String,
          capacity: String,
          frequencyOfDesludging: String,
          dateOfDesludging: Date,
          serviceProvider: String,
        },
        greaseTrap: {
          status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
          location: String,
          capacity: String,
          frequencyOfHauling: String,
          hauler: String,
        },
        wwtp: {
          status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
          laboratoryAnalysisResult: String,
        },
        usedOil: {
          status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
          typeOfOil: String,
          frequencyOfHauling: String,
          hauler: String,
        },
      },
      airPollution: {
        pollutionControlDevices: {
          status: { type: String, enum: ["YES", "NO", "NA"], default: "NA" },
          deviceType: String,
          maintenanceProvider: String,
        },
      },
    },

    // ── PART 3: After Inspection Report ──────────────────────────────────────
    purposeOfInspection: {
      newEstablishment: { type: Boolean, default: false },
      complianceCheck: { type: Boolean, default: false },
    },

    physicalEnvironment: {
      landUse: {
        commercial: Boolean,
        residential: Boolean,
        industrial: Boolean,
        institutional: Boolean,
      },
      ownershipTerms: {
        proprietorship: Boolean,
        privateCorporation: Boolean,
        multiNational: Boolean,
      },
      occupancyTerms: {
        lessee: { type: String, enum: ["YES", "NO"], default: "NO" },
        standAlone: { type: String, enum: ["YES", "NO"], default: "NO" },
      },
    },

    findings: {
      // Single-select radio: "OPERATIONAL" | "NO_OPERATION" | "CLOSED" | "UNLOCATED" | "NO_PERSON_IN_CHARGE"
      operationStatus: String,
      observationStatement: String,
    },

    directives: String,

    afterRecommendations: {
      forReinspection: Boolean,
      forSeminar: Boolean,
      complianceMeasures: Boolean,
      forCDO: Boolean,
      issuanceCEC: Boolean,
      forCaseConference: Boolean,
      forCaseTermination: Boolean,
    },

    inspectors: {
      alvinMagbanua: Boolean,
      edwinPaderes: Boolean,
      jaycelEden: Boolean,
      jeffreyBasco: Boolean,
      jennySandrino: Boolean,
      jhonIvanMadronal: Boolean,
      jovenSantiago: Boolean,
      marcJoelRato: Boolean,
      ninaTan: Boolean,
      robinRomero: Boolean,
    },

    createdBy: String, // userId from JWT
    encodedByEmail: String, // email of whoever encoded/created this report
    encodedByName: String, // display name (if available from token)
    // For reinspections — track who last updated too
    lastUpdatedByEmail: String,

    // ── Reinspection linkage ──────────────────────────────────────────────────
    isReinspection: { type: Boolean, default: false },
    // inspectionId of the original (root) inspection in this chain
    parentInspectionId: { type: String, default: null },
    // 1 = first reinspection, 2 = second, etc. null for originals
    reinspectionNumber: { type: Number, default: null },
  },
  { timestamps: true, collection: "inspectionReports" },
);

let InspectionReport;
if (establishmentsDB) {
  InspectionReport = establishmentsDB.model(
    "InspectionReport",
    inspectionReportSchema,
  );
} else {
  console.error("❌ Cannot create InspectionReport model");
}

module.exports = InspectionReport;
