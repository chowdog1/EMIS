// models/complianceRecord.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

// Maps the recommendation keys from Part 1 to human-readable labels
const RECOMMENDATION_LABELS = {
  environmentalComplianceCertificate: "Environmental Compliance Certificate",
  certificateOfNonCoverage: "Certificate of Non-Coverage",
  wastewaterDischargePerm: "Wastewater Discharge Permit",
  hazardousWasteGeneratorId: "Hazardous Waste Generator ID",
  permitToOperateAirPollution:
    "Permit to Operate for Air Pollution Source Installation/Equipment",
  pcoAccreditationCertificate:
    "Pollution Control Officer Accreditation Certificate",
  tsdCertificate: "Transport, Storage and Disposal Certificate",
  environmentalProtectionFee:
    "Environmental Protection and Preservation Fee / Environmental Compliance Fee",
  appointPCO: "Appoint an accredited Pollution Control Officer",
  provideSegregationBins:
    "Provide waste segregation bins with properly labeled markings",
  properWasteSegregation:
    "Proper waste segregation in accordance with the markings",
  installGreaseTrap: "Installation of grease trap",
  installExhaustSystem: "Installation of exhaust system",
  installSepticTank:
    "Installation of septic tank / desludging certificate issued by DENR-EMB accredited hauler",
  attendSeminar: "Attend business establishment environmental seminar",
};

const complianceItemSchema = new mongoose.Schema(
  {
    requirementKey: String,
    requirementLabel: String,
    status: {
      type: String,
      enum: ["PENDING", "COMPLIED", "OVERDUE"],
      default: "PENDING",
    },
    complianceDate: Date, // date they submitted/complied
    remarks: String,
  },
  { _id: false },
);

const complianceRecordSchema = new mongoose.Schema(
  {
    // Links back to the inspection
    inspectionId: { type: String, required: true, index: true },
    inspectionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionReport",
    },

    // Business info (denormalized)
    accountNo: { type: String, required: true, index: true },
    businessName: String,
    address: String,
    barangay: String,
    year: { type: Number, default: () => new Date().getFullYear() },

    // Overall deadline from Part 1
    complianceDeadline: String, // "7 days" | "1 month" | "2 months"
    deadlineDate: Date, // computed actual calendar date

    // Individual requirements to comply
    requirements: [complianceItemSchema],

    // Overall status — auto-derived
    overallStatus: {
      type: String,
      enum: ["PENDING", "PARTIALLY_COMPLIED", "FULLY_COMPLIED", "OVERDUE"],
      default: "PENDING",
    },

    remarks: String,
    createdBy: String,
  },
  { timestamps: true, collection: "complianceRecords" },
);

// Static helper — builds requirements array from the recommendations map in the inspection
complianceRecordSchema.statics.buildFromInspection = function (inspection) {
  const items = [];
  if (!inspection.recommendations) return items;
  Object.entries(RECOMMENDATION_LABELS).forEach(([key, label]) => {
    if (inspection.recommendations[key]) {
      items.push({
        requirementKey: key,
        requirementLabel: label,
        status: "PENDING",
      });
    }
  });
  return items;
};

// Compute deadlineDate from inspection date + complianceDeadline string
complianceRecordSchema.statics.computeDeadline = function (
  dateOfInspection,
  complianceDeadline,
) {
  if (!dateOfInspection || !complianceDeadline) return null;
  const d = new Date(dateOfInspection);
  if (complianceDeadline === "7 days") d.setDate(d.getDate() + 7);
  if (complianceDeadline === "1 month") d.setMonth(d.getMonth() + 1);
  if (complianceDeadline === "2 months") d.setMonth(d.getMonth() + 2);
  return d;
};

let ComplianceRecord;
if (establishmentsDB) {
  ComplianceRecord = establishmentsDB.model(
    "ComplianceRecord",
    complianceRecordSchema,
  );
} else {
  console.error("❌ Cannot create ComplianceRecord model");
}

module.exports = ComplianceRecord;
