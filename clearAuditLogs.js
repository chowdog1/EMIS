//ONLY USE IT IF THE ADMIN ALLOWS TO DELETE THE LOGS

// clearAuditLogs.js
const mongoose = require("mongoose");
const AuditTrail = require("./models/auditTrail");

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/logindb")
  .then(() => {
    console.log("Connected to MongoDB");

    // Clear all audit logs
    return AuditTrail.deleteMany({});
  })
  .then((result) => {
    console.log(`Deleted ${result.deletedCount} audit logs`);
    mongoose.connection.close();
  })
  .catch((error) => {
    console.error("Error:", error);
    mongoose.connection.close();
  });
