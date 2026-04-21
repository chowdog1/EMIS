// models/business2031.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2031Schema = new mongoose.Schema(
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
    "2031_STATUS": String,
    "2031_NOTES": String,
  },
  { collection: "business2031" },
);

let Business2031;
if (establishmentsDB) {
  Business2031 = establishmentsDB.model("Business2031", business2031Schema);
} else {
  console.error(
    "❌ Cannot create Business2031 model - database connection not available",
  );
}

module.exports = Business2031;
