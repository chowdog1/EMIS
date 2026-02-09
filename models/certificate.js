const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const certificateSchema = new mongoose.Schema(
  {
    email: String,
    accountNo: String,
    businessName: String,
    address: String,
    certificateDate: Date,
    status: {
      type: String,
      default: "for approval",
      enum: [
        "for approval",
        "approved",
        "for signatory",
        "signed",
        "sent",
        "resent",
      ],
    },
    // Base64 storage fields
    pdfBase64: String,
    signatureBase64: String,
    generatedAt: Date,
    cleanedAt: Date,
    // Approval fields
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    signatureName: String,
    // Signatory fields
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    signedAt: Date,
    // Send tracking
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sentAt: Date,
    resentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resentAt: Date,
  },
  {
    collection: "certificates",
    timestamps: true,
  },
);

let Certificate;
if (establishmentsDB) {
  Certificate = establishmentsDB.model("Certificate", certificateSchema);
} else {
  console.error(
    "❌ Cannot create Certificate model - database connection not available",
  );
}

module.exports = Certificate;
