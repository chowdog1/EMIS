// updateNatureOfBusiness.js
const mongoose = require("mongoose");
const { establishmentsDB } = require("./db.js");
const Business2025 = require("./models/business2025.js");
const Business2026 = require("./models/business2026.js");

async function updateNatureOfBusiness() {
  try {
    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/establishments");
    console.log("Connected to MongoDB");

    // Find all businesses in 2026 where NATURE OF BUSINESS is blank or "N/A"
    console.log("Finding businesses with missing NATURE OF BUSINESS...");
    const businessesToUpdate = await Business2026.find({
      $or: [
        { "NATURE OF BUSINESS": { $exists: false } },
        { "NATURE OF BUSINESS": "" },
        { "NATURE OF BUSINESS": null },
        { "NATURE OF BUSINESS": "N/A" },
        { "NATURE OF BUSINESS": "n/a" },
        { "NATURE OF BUSINESS": "N/A" },
      ],
    });

    console.log(`Found ${businessesToUpdate.length} businesses to update`);

    if (businessesToUpdate.length === 0) {
      console.log("No businesses need updating.");
      return;
    }

    let updatedCount = 0;
    let notFoundCount = 0;

    // Process each business
    for (const business2026 of businessesToUpdate) {
      try {
        // Find the corresponding business in 2025
        const business2025 = await Business2025.findOne({
          "ACCOUNT NO": business2026["ACCOUNT NO"],
        });

        if (business2025 && business2025["NATURE OF BUSINESS"]) {
          // Update the NATURE OF BUSINESS in 2026
          await Business2026.updateOne(
            { _id: business2026._id },
            {
              $set: {
                "NATURE OF BUSINESS": business2025["NATURE OF BUSINESS"],
              },
            }
          );
          updatedCount++;

          // Log progress every 100 updates
          if (updatedCount % 100 === 0) {
            console.log(`Updated ${updatedCount} businesses so far...`);
          }
        } else {
          notFoundCount++;
          console.log(
            `No matching business in 2025 or no NATURE OF BUSINESS data for account ${business2026["ACCOUNT NO"]}`
          );
        }
      } catch (error) {
        console.error(
          `Error updating business with account ${business2026["ACCOUNT NO"]}:`,
          error
        );
      }
    }

    console.log(`Update completed successfully!`);
    console.log(`Updated ${updatedCount} businesses`);
    console.log(`Could not find or update ${notFoundCount} businesses`);

    // Show a sample of updated data
    const sampleBusiness = await Business2026.findOne({
      "NATURE OF BUSINESS": { $ne: "", $ne: null, $ne: "N/A" },
    });
    if (sampleBusiness) {
      console.log("\nSample updated business:");
      console.log(`Account No: ${sampleBusiness["ACCOUNT NO"]}`);
      console.log(`Business Name: ${sampleBusiness["NAME OF BUSINESS"]}`);
      console.log(
        `Nature of Business: ${sampleBusiness["NATURE OF BUSINESS"]}`
      );
    }
  } catch (error) {
    console.error("Update failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the update
updateNatureOfBusiness();
