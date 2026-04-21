// models/seminar2040.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2040" },
);

let Seminar2040;
if (establishmentsDB) {
  Seminar2040 = establishmentsDB.model("Seminar2040", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2040 model - database connection not available",
  );
}

module.exports = Seminar2040;
