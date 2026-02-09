// models/business2026.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

// Define Business2026 Schema with all fields
const business2026Schema = new mongoose.Schema(
  {
    "ACCOUNT NO": { type: String, unique: true },
    "DATE OF APPLICATION": Date,
    "OR NO": String,
    "AMOUNT PAID": Number,
    "DATE OF PAYMENT": Date,
    STATUS: String,
    "APPLICATION STATUS": String,
    "NAME OF BUSINESS": String,
    "NAME OF OWNER": String,
    ADDRESS: String,
    BARANGAY: String,
    "NATURE OF BUSINESS": String,
    REMARKS: String,
    // Add any new fields you need for 2026
    "2026_STATUS": String, // Example: New field specific to 2026
    "2026_NOTES": String, // Example: Another new field
  },
  { collection: "business2026" },
);

// Create the Business2026 model
let Business2026;
if (establishmentsDB) {
  Business2026 = establishmentsDB.model("Business2026", business2026Schema);
} else {
  console.error(
    "❌ Cannot create Business2026 model - database connection not available",
  );
}

module.exports = Business2026;
