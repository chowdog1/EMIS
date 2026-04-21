// models/seminar2039.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2039" },
);

let Seminar2039;
if (establishmentsDB) {
  Seminar2039 = establishmentsDB.model("Seminar2039", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2039 model - database connection not available",
  );
}

module.exports = Seminar2039;
