// models/business2036.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2036Schema = new mongoose.Schema(
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
    "2036_STATUS": String,
    "2036_NOTES": String,
  },
  { collection: "business2036" },
);

let Business2036;
if (establishmentsDB) {
  Business2036 = establishmentsDB.model("Business2036", business2036Schema);
} else {
  console.error(
    "❌ Cannot create Business2036 model - database connection not available",
  );
}

module.exports = Business2036;
