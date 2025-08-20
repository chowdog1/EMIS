// models/business2025.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../db.js");

const businessSchema = new mongoose.Schema(
  {
    "ACCOUNT NO": String,
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
  },
  { collection: "business2025" }
);

let Business2025;
if (establishmentsDB) {
  Business2025 = establishmentsDB.model("Business2025", businessSchema);
} else {
  console.error(
    "❌ Cannot create Business2025 model - database connection not available"
  );
}

module.exports = Business2025;
