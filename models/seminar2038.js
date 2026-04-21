// models/seminar2038.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2038" },
);

let Seminar2038;
if (establishmentsDB) {
  Seminar2038 = establishmentsDB.model("Seminar2038", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2038 model - database connection not available",
  );
}

module.exports = Seminar2038;
