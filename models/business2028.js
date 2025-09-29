// models/business2028.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../db.js");

const business2028Schema = new mongoose.Schema(
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
    "2028_STATUS": String,
    "2028_NOTES": String,
  },
  { collection: "business2028" }
);

let Business2028;
if (establishmentsDB) {
  Business2028 = establishmentsDB.model("Business2028", business2028Schema);
} else {
  console.error(
    "❌ Cannot create Business2028 model - database connection not available"
  );
}

module.exports = Business2028;
