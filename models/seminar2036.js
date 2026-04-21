// models/seminar2036.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2036" },
);

let Seminar2036;
if (establishmentsDB) {
  Seminar2036 = establishmentsDB.model("Seminar2036", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2036 model - database connection not available",
  );
}

module.exports = Seminar2036;
