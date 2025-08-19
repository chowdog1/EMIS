// scripts/migrate2025To2026.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("./db.js");
const Business2025 = require("./models/business2025.js");
const Business2026 = require("./models/business2026.js");

async function migrate2025To2026() {
  try {
    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/establishments");
    console.log("Connected to MongoDB");

    // Check if business2026 collection already has data
    const existingCount = await Business2026.countDocuments();
    if (existingCount > 0) {
      console.log(
        `Business2026 collection already has ${existingCount} documents.`
      );
      // Ask user if they want to proceed
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await new Promise((resolve) => {
        rl.question(
          "Do you want to clear existing data and re-migrate? (y/n): ",
          resolve
        );
      });
      rl.close();
      if (answer.toLowerCase() !== "y") {
        console.log("Migration cancelled.");
        return;
      }
      // Clear existing data
      await Business2026.deleteMany({});
      console.log("Cleared existing business2026 data.");
    }

    // Get all businesses from 2025
    console.log("Fetching businesses from 2025...");
    const businesses2025 = await Business2025.find({});
    console.log(`Found ${businesses2025.length} businesses in 2025`);

    if (businesses2025.length === 0) {
      console.log("No businesses found in 2025 to migrate.");
      return;
    }

    // Prepare data for migration (only the required fields)
    const businesses2026Data = businesses2025.map((business) => ({
      "ACCOUNT NO": business["ACCOUNT NO"],
      "NAME OF BUSINESS": business["NAME OF BUSINESS"],
      "NAME OF OWNER": business["NAME OF OWNER"],
      ADDRESS: business.ADDRESS,
      BARANGAY: business.BARANGAY,
      // Set all other fields to null or empty string
      "DATE OF APPLICATION": null,
      "OR NO": "",
      "AMOUNT PAID": null,
      "DATE OF PAYMENT": null,
      STATUS: "",
      "APPLICATION STATUS": "",
      REMARKS: "",
      // New fields specific to 2026
      "2026_STATUS": "",
      "2026_NOTES": "",
    }));

    // Insert into 2026 collection in batches for better performance
    const batchSize = 100;
    let insertedCount = 0;
    for (let i = 0; i < businesses2026Data.length; i += batchSize) {
      const batch = businesses2026Data.slice(i, i + batchSize);
      await Business2026.insertMany(batch);
      insertedCount += batch.length;
      console.log(
        `Inserted batch ${
          Math.floor(i / batchSize) + 1
        }: ${insertedCount} documents`
      );
    }

    console.log(`Migration completed successfully!`);
    console.log(
      `Migrated ${businesses2026Data.length} businesses from 2025 to 2026`
    );

    // Verify the count
    const count2026 = await Business2026.countDocuments();
    console.log(
      `Verification: Business2026 collection now has ${count2026} documents`
    );

    // Show sample data
    const sampleBusiness = await Business2026.findOne();
    if (sampleBusiness) {
      console.log("\nSample migrated business:");
      console.log(`Account No: ${sampleBusiness["ACCOUNT NO"]}`);
      console.log(`Business Name: ${sampleBusiness["NAME OF BUSINESS"]}`);
      console.log(`Owner: ${sampleBusiness["NAME OF OWNER"]}`);
      console.log(`Address: ${sampleBusiness.ADDRESS}`);
      console.log(`Barangay: ${sampleBusiness.BARANGAY}`);
      console.log(
        `Date of Application: ${sampleBusiness["DATE OF APPLICATION"]}`
      );
      console.log(`OR No: ${sampleBusiness["OR NO"]}`);
    }
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the migration
migrate2025To2026();
