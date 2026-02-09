// config/database.js
const mongoose = require("mongoose");

// Auth database connection
const authDB = mongoose.createConnection(process.env.MONGODB_AUTH_URI);

// Establishments database connection
const establishmentsDB = mongoose.createConnection(
  process.env.MONGODB_ESTABLISHMENTS_URI,
);

// Handle connection events
mongoose
  .connect(process.env.MONGODB_AUTH_URI)
  .then(() => console.log("Auth MongoDB connected"))
  .catch((err) => {
    console.error("Auth MongoDB connection error:", err);
    process.exit(1); // Exit if auth DB fails
  });

establishmentsDB.on("error", (err) => {
  console.error("Establishments DB connection error:", err);
});

establishmentsDB.once("open", () => {
  console.log("Establishments MongoDB connected");
});

// Export all connections
module.exports = {
  authDB,
  establishmentsDB,
};
