// models/business2030.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2030Schema = new mongoose.Schema(
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
    "2030_STATUS": String,
    "2030_NOTES": String,
  },
  { collection: "business2030" },
);

let Business2030;
if (establishmentsDB) {
  Business2030 = establishmentsDB.model("Business2030", business2030Schema);
} else {
  console.error(
    "❌ Cannot create Business2030 model - database connection not available",
  );
}

module.exports = Business2030;
