const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2025" },
);

let Seminar2025;
if (establishmentsDB) {
  Seminar2025 = establishmentsDB.model("Seminar2025", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2025 model - database connection not available",
  );
}

module.exports = Seminar2025;
