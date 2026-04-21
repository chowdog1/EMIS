// models/business2039.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2039Schema = new mongoose.Schema(
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
    "2039_STATUS": String,
    "2039_NOTES": String,
  },
  { collection: "business2039" },
);

let Business2039;
if (establishmentsDB) {
  Business2039 = establishmentsDB.model("Business2039", business2039Schema);
} else {
  console.error(
    "❌ Cannot create Business2039 model - database connection not available",
  );
}

module.exports = Business2039;
