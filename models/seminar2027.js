// models/seminar2027.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2027" },
);

let Seminar2027;
if (establishmentsDB) {
  Seminar2027 = establishmentsDB.model("Seminar2027", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2027 model - database connection not available",
  );
}

module.exports = Seminar2027;
