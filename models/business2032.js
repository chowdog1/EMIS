// models/business2032.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2032Schema = new mongoose.Schema(
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
    "2032_STATUS": String,
    "2032_NOTES": String,
  },
  { collection: "business2032" },
);

let Business2032;
if (establishmentsDB) {
  Business2032 = establishmentsDB.model("Business2032", business2032Schema);
} else {
  console.error(
    "❌ Cannot create Business2032 model - database connection not available",
  );
}

module.exports = Business2032;
