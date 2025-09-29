const mongoose = require("mongoose");
const { establishmentsDB } = require("./db.js");

// Import all models
const Business2026 = require("./models/business2026.js");
const Business2027 = require("./models/business2027.js");
const Business2028 = require("./models/business2028.js");
const Business2029 = require("./models/business2029.js");
const Business2030 = require("./models/business2030.js");

// Map years to their models
const yearModels = {
  2026: Business2026,
  2027: Business2027,
  2028: Business2028,
  2029: Business2029,
  2030: Business2030,
};

// Transform data for next year (remove source year fields, add next year fields)
function transformDataForNextYear(sourceYear, nextYear, data) {
  const newData = { ...data };

  // Remove source year specific fields
  delete newData[`${sourceYear}_STATUS`];
  delete newData[`${sourceYear}_NOTES`];

  // Add next year specific fields (set to empty)
  newData[`${nextYear}_STATUS`] = "";
  newData[`${nextYear}_NOTES`] = "";

  return newData;
}

// Migrate businesses from one year to the next
async function migrateYearToNext(sourceYear, nextYear) {
  try {
    console.log(`Starting migration from ${sourceYear} to ${nextYear}...`);

    const SourceModel = yearModels[sourceYear];
    const NextYearModel = yearModels[nextYear];

    if (!SourceModel || !NextYearModel) {
      console.error(`Model not found for ${sourceYear} or ${nextYear}`);
      return { success: false, error: "Model not found" };
    }

    // Get all businesses from source year
    const sourceBusinesses = await SourceModel.find({});
    console.log(`Found ${sourceBusinesses.length} businesses in ${sourceYear}`);

    if (sourceBusinesses.length === 0) {
      console.log(`No businesses found in ${sourceYear} to migrate`);
      return { success: true, migrated: 0 };
    }

    // Clear the next year collection before migration (optional)
    await NextYearModel.deleteMany({});
    console.log(`Cleared existing data in ${nextYear} collection`);

    // Prepare data for next year
    const nextYearData = sourceBusinesses.map((business) => {
      return transformDataForNextYear(
        sourceYear,
        nextYear,
        business.toObject()
      );
    });

    // Insert into next year collection in batches
    const batchSize = 100;
    let migratedCount = 0;

    for (let i = 0; i < nextYearData.length; i += batchSize) {
      const batch = nextYearData.slice(i, i + batchSize);
      await NextYearModel.insertMany(batch);
      migratedCount += batch.length;
      console.log(
        `Migrated batch ${
          Math.floor(i / batchSize) + 1
        }: ${migratedCount} documents`
      );
    }

    console.log(
      `Migration from ${sourceYear} to ${nextYear} completed successfully!`
    );
    console.log(
      `Migrated ${migratedCount} businesses from ${sourceYear} to ${nextYear}`
    );

    return { success: true, migrated: migratedCount };
  } catch (error) {
    console.error(`Error migrating from ${sourceYear} to ${nextYear}:`, error);
    return { success: false, error: error.message };
  }
}

// Main migration function
async function migrateAllYears() {
  try {
    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/establishments");
    console.log("✅ Connected to MongoDB");

    const migrationResults = [];

    // Migrate 2026 to 2027
    const result1 = await migrateYearToNext("2026", "2027");
    migrationResults.push({ from: "2026", to: "2027", ...result1 });

    // Migrate 2027 to 2028
    const result2 = await migrateYearToNext("2027", "2028");
    migrationResults.push({ from: "2027", to: "2028", ...result2 });

    // Migrate 2028 to 2029
    const result3 = await migrateYearToNext("2028", "2029");
    migrationResults.push({ from: "2028", to: "2029", ...result3 });

    // Migrate 2029 to 2030
    const result4 = await migrateYearToNext("2029", "2030");
    migrationResults.push({ from: "2029", to: "2030", ...result4 });

    // Print summary
    console.log("\n=== MIGRATION SUMMARY ===");
    migrationResults.forEach((result) => {
      if (result.success) {
        console.log(
          `✅ ${result.from} → ${result.to}: ${result.migrated} businesses migrated`
        );
      } else {
        console.log(
          `❌ ${result.from} → ${result.to}: Failed - ${result.error}`
        );
      }
    });

    // Verify counts
    console.log("\n=== VERIFICATION ===");
    for (const year of ["2026", "2027", "2028", "2029", "2030"]) {
      const Model = yearModels[year];
      const count = await Model.countDocuments();
      console.log(`${year}: ${count} businesses`);
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
migrateAllYears();
