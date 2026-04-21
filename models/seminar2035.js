// models/seminar2035.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2035" },
);

let Seminar2035;
if (establishmentsDB) {
  Seminar2035 = establishmentsDB.model("Seminar2035", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2035 model - database connection not available",
  );
}

module.exports = Seminar2035;
