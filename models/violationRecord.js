// models/violationRecord.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const ORDINANCE_LABELS = {
  ordinance35_2004_sec2a: {
    label: "City Ordinance No. 35-2004 sec.2a — Failure to segregate wastes",
    fee: 1000,
  },
  ordinance30_1999_sec5c: {
    label:
      "City Ordinance No. 30-1999 sec.5c — Failure to specify appropriate garbage bin label",
    fee: 500,
  },
  ordinance94_1994_sec1: {
    label:
      "City Ordinance No. 94-1994 sec.1 — Failure to cover trash receptacle",
    fee: 500,
  },
  ordinance91_2013_sec5F03d: {
    label:
      "City Ordinance No. 91-2013 sec.5F-03d — Failure to install adequate anti-pollution devices",
    fee: 5000,
  },
  ordinance21_11_sec14_2: {
    label:
      "City Ordinance No. 21-11 sec 14.2 — Failure to desludge septic tank",
    fee: 3000,
  },
  ordinance91_2013_sec5F03e: {
    label:
      "City Ordinance No. 91-2013 sec.5F-03e — Failure to present/provide a true copy of all clearances, permits and certifications",
    fee: 5000,
  },
  ordinance10_2011: {
    label:
      "City Ordinance No. 10-2011 — Dumping of solid waste in any form into canals, drainage & water systems",
    fee: 5000,
  },
  ordinance09_2011_sec3_1: {
    label:
      "City Ordinance No. 09-2011 sec.3-1 — Littering and illegally dumping of solid wastes in any public/private places",
    fee: 500,
  },
  ordinance91_2013_sec5F03a: {
    label:
      "City Ordinance No. 91-2013 sec.5F-03a — Failure to pay Environmental Protection and Preservation Fee",
    fee: 2500,
  },
  ordinance91_2013_sec5F03b: {
    label:
      "City Ordinance No. 91-2013 sec.5F-03b — Failure to appoint/designate Pollution Control Officer (PCO)",
    fee: 2500,
  },
  ordinance91_2013_sec5F03c: {
    label:
      "City Ordinance No. 91-2013 sec.5F-03c — Refuse to allow inspectors to enter and inspect the premises",
    fee: 2500,
  },
  ordinance15_11_sec1b: {
    label:
      "City Ordinance No. 15-11 sec.1b — Improper disposal of used cooking oil",
    fee: 5000,
  },
  ordinance14_2024_sec5w: {
    label: "City Ordinance No. 14-2024 sec.5w — Tobacco Advertisement",
    fee: 5000,
  },
};

const violationItemSchema = new mongoose.Schema(
  {
    ordinanceKey: { type: String }, // e.g. "ordinance35_2004_sec2a"
    ordinanceLabel: { type: String },
    fee: { type: Number },
  },
  { _id: false },
);

const violationRecordSchema = new mongoose.Schema(
  {
    // Links back to the inspection
    inspectionId: { type: String, required: true, index: true }, // INSP-2026-001
    inspectionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionReport",
    },

    // Business info (denormalized for quick display)
    accountNo: { type: String, required: true, index: true },
    businessName: String,
    address: String,
    barangay: String,
    year: { type: Number, default: () => new Date().getFullYear() },

    // OVR ticket
    ovrNo: { type: String, required: true },
    dateOfViolation: { type: Date },

    // Which ordinances were breached
    violatedOrdinances: [violationItemSchema],
    totalFine: { type: Number, default: 0 },

    // Payment / resolution
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "WAIVED"],
      default: "UNPAID",
    },
    paymentDate: Date,
    orNo: String, // OR number when paid
    remarks: String,

    createdBy: String,
  },
  { timestamps: true, collection: "violationRecords" },
);

// Static helper — builds violatedOrdinances array from the violations map in the inspection
violationRecordSchema.statics.buildFromInspection = function (inspection) {
  const items = [];
  if (!inspection.violations) return items;
  Object.entries(ORDINANCE_LABELS).forEach(([key, meta]) => {
    if (inspection.violations[key]) {
      items.push({
        ordinanceKey: key,
        ordinanceLabel: meta.label,
        fee: meta.fee,
      });
    }
  });
  return items;
};

let ViolationRecord;
if (establishmentsDB) {
  ViolationRecord = establishmentsDB.model(
    "ViolationRecord",
    violationRecordSchema,
  );
} else {
  console.error("❌ Cannot create ViolationRecord model");
}

module.exports = ViolationRecord;
