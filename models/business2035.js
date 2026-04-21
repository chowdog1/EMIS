// models/business2035.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2035Schema = new mongoose.Schema(
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
    "2035_STATUS": String,
    "2035_NOTES": String,
  },
  { collection: "business2035" },
);

let Business2035;
if (establishmentsDB) {
  Business2035 = establishmentsDB.model("Business2035", business2035Schema);
} else {
  console.error(
    "❌ Cannot create Business2035 model - database connection not available",
  );
}

module.exports = Business2035;
