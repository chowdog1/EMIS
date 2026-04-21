// models/seminar2032.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2032" },
);

let Seminar2032;
if (establishmentsDB) {
  Seminar2032 = establishmentsDB.model("Seminar2032", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2032 model - database connection not available",
  );
}

module.exports = Seminar2032;
