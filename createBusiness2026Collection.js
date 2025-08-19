// scripts/createBusiness2026Collection.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("./db.js");
const Business2026 = require("./models/business2026.js");

async function createBusiness2026Collection() {
  try {
    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/establishments");
    console.log("Connected to MongoDB");

    // Create a test document to ensure the collection is created
    const testBusiness = new Business2026({
      "ACCOUNT NO": "TEST-001",
      "NAME OF BUSINESS": "Test Business",
      "NAME OF OWNER": "Test Owner",
      ADDRESS: "Test Address",
      BARANGAY: "Test Barangay",
      "NATURE OF BUSINESS": "Test Nature",
    });

    await testBusiness.save();
    console.log("Test business created in business2026 collection");

    // Delete the test document
    await Business2026.deleteOne({ "ACCOUNT NO": "TEST-001" });
    console.log("Test business deleted");

    console.log("Business2026 collection is ready!");
  } catch (error) {
    console.error("Error creating business2026 collection:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

createBusiness2026Collection();
