const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2026" },
);

let Seminar2026;
if (establishmentsDB) {
  Seminar2026 = establishmentsDB.model("Seminar2026", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2026 model - database connection not available",
  );
}

module.exports = Seminar2026;
