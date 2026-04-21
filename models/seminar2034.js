// models/seminar2034.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2034" },
);

let Seminar2034;
if (establishmentsDB) {
  Seminar2034 = establishmentsDB.model("Seminar2034", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2034 model - database connection not available",
  );
}

module.exports = Seminar2034;
