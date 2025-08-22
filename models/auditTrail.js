// models/auditTrail.js
const mongoose = require("mongoose");

const auditTrailSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ["CREATE", "UPDATE", "DELETE"],
  },
  collectionName: {
    type: String,
    required: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  accountNo: {
    type: String,
    required: false,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  changes: {
    type: Object,
    required: true,
  },
  ipAddress: String,
  userAgent: String,
});

module.exports = mongoose.model("AuditTrail", auditTrailSchema);
