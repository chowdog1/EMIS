// models/business2038.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2038Schema = new mongoose.Schema(
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
    "2038_STATUS": String,
    "2038_NOTES": String,
  },
  { collection: "business2038" },
);

let Business2038;
if (establishmentsDB) {
  Business2038 = establishmentsDB.model("Business2038", business2038Schema);
} else {
  console.error(
    "❌ Cannot create Business2038 model - database connection not available",
  );
}

module.exports = Business2038;
