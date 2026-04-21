// models/business2034.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2034Schema = new mongoose.Schema(
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
    "2034_STATUS": String,
    "2034_NOTES": String,
  },
  { collection: "business2034" },
);

let Business2034;
if (establishmentsDB) {
  Business2034 = establishmentsDB.model("Business2034", business2034Schema);
} else {
  console.error(
    "❌ Cannot create Business2034 model - database connection not available",
  );
}

module.exports = Business2034;
