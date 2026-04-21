// models/business2037.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const business2037Schema = new mongoose.Schema(
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
    "2037_STATUS": String,
    "2037_NOTES": String,
  },
  { collection: "business2037" },
);

let Business2037;
if (establishmentsDB) {
  Business2037 = establishmentsDB.model("Business2037", business2037Schema);
} else {
  console.error(
    "❌ Cannot create Business2037 model - database connection not available",
  );
}

module.exports = Business2037;
