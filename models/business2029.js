// models/business2029.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2029Schema = new mongoose.Schema(
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
    "2029_STATUS": String,
    "2029_NOTES": String,
  },
  { collection: "business2029" },
);

let Business2029;
if (establishmentsDB) {
  Business2029 = establishmentsDB.model("Business2029", business2029Schema);
} else {
  console.error(
    "❌ Cannot create Business2029 model - database connection not available",
  );
}

module.exports = Business2029;
