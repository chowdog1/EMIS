// models/business2040.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2040Schema = new mongoose.Schema(
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
    "2040_STATUS": String,
    "2040_NOTES": String,
  },
  { collection: "business2040" },
);

let Business2040;
if (establishmentsDB) {
  Business2040 = establishmentsDB.model("Business2040", business2040Schema);
} else {
  console.error(
    "❌ Cannot create Business2040 model - database connection not available",
  );
}

module.exports = Business2040;
