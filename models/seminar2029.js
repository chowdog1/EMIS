// models/seminar2029.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2029" },
);

let Seminar2029;
if (establishmentsDB) {
  Seminar2029 = establishmentsDB.model("Seminar2029", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2029 model - database connection not available",
  );
}

module.exports = Seminar2029;
