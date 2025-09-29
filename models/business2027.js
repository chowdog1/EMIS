// models/business2027.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../db.js");

const business2027Schema = new mongoose.Schema(
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
    "2027_STATUS": String,
    "2027_NOTES": String,
  },
  { collection: "business2027" }
);

let Business2027;
if (establishmentsDB) {
  Business2027 = establishmentsDB.model("Business2027", business2027Schema);
} else {
  console.error(
    "❌ Cannot create Business2027 model - database connection not available"
  );
}

module.exports = Business2027;
