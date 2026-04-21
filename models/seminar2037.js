// models/seminar2037.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2037" },
);

let Seminar2037;
if (establishmentsDB) {
  Seminar2037 = establishmentsDB.model("Seminar2037", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2037 model - database connection not available",
  );
}

module.exports = Seminar2037;
