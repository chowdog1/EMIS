// models/business2033.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2033Schema = new mongoose.Schema(
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
    "2033_STATUS": String,
    "2033_NOTES": String,
  },
  { collection: "business2033" },
);

let Business2033;
if (establishmentsDB) {
  Business2033 = establishmentsDB.model("Business2033", business2033Schema);
} else {
  console.error(
    "❌ Cannot create Business2033 model - database connection not available",
  );
}

module.exports = Business2033;
