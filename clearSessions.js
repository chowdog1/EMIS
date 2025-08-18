// clearSessions.js
const mongoose = require("mongoose");
const User = require("./models/user");

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/logindb")
  .then(() => {
    console.log("✅ Connected to MongoDB");
    clearAllSessions();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Function to clear all user sessions
async function clearAllSessions() {
  try {
    console.log("Clearing all user sessions...");

    // Update all users to clear session data
    const result = await User.updateMany(
      {}, // Match all users
      {
        $unset: {
          currentSessionId: "",
          lastLoginAt: "",
        },
      }
    );

    console.log(`✅ Cleared sessions for ${result.modifiedCount} users`);

    // Close the connection
    mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing sessions:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}
