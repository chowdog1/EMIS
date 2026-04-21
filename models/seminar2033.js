// models/seminar2033.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2033" },
);

let Seminar2033;
if (establishmentsDB) {
  Seminar2033 = establishmentsDB.model("Seminar2033", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2033 model - database connection not available",
  );
}

module.exports = Seminar2033;
