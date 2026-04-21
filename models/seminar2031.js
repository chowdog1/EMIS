// models/seminar2031.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("../config/database.js");

const seminarSchema = new mongoose.Schema(
  {
    email: String,
    businessName: String,
    address: String,
    status: { type: String, default: "uploaded" }, // uploaded, invitation sent
  },
  { collection: "seminar2031" },
);

let Seminar2031;
if (establishmentsDB) {
  Seminar2031 = establishmentsDB.model("Seminar2031", seminarSchema);
} else {
  console.error(
    "❌ Cannot create Seminar2031 model - database connection not available",
  );
}

module.exports = Seminar2031;
