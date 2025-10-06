// models/seminar2030.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../db.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2030" }
);

let Seminar2030;
if (establishmentsDB) {
  Seminar2030 = establishmentsDB.model("Seminar2030", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2030 model - database connection not available"
  );
}

module.exports = Seminar2030;
