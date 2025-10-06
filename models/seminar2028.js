// models/seminar2028.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../db.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2028" }
);

let Seminar2028;
if (establishmentsDB) {
  Seminar2028 = establishmentsDB.model("Seminar2028", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2028 model - database connection not available"
  );
}

module.exports = Seminar2028;
