require("dotenv").config();
const { establishmentsDB } = require("./config/database.js");

const Business2030 = require("./models/business2030.js");
const Business2031 = require("./models/business2031.js");
const Business2032 = require("./models/business2032.js");
const Business2033 = require("./models/business2033.js");
const Business2034 = require("./models/business2034.js");
const Business2035 = require("./models/business2035.js");
const Business2036 = require("./models/business2036.js");
const Business2037 = require("./models/business2037.js");
const Business2038 = require("./models/business2038.js");
const Business2039 = require("./models/business2039.js");
const Business2040 = require("./models/business2040.js");

const yearModels = {
  2030: Business2030,
  2031: Business2031,
  2032: Business2032,
  2033: Business2033,
  2034: Business2034,
  2035: Business2035,
  2036: Business2036,
  2037: Business2037,
  2038: Business2038,
  2039: Business2039,
  2040: Business2040,
};

function transformDataForNextYear(sourceYear, nextYear, data) {
  const newData = { ...data };
  delete newData[`${sourceYear}_STATUS`];
  delete newData[`${sourceYear}_NOTES`];
  newData[`${nextYear}_STATUS`] = "";
  newData[`${nextYear}_NOTES`] = "";
  return newData;
}

async function migrateYearToNext(sourceYear, nextYear) {
  try {
    console.log(`Starting migration from ${sourceYear} to ${nextYear}...`);
    const SourceModel = yearModels[sourceYear];
    const NextYearModel = yearModels[nextYear];
    if (!SourceModel || !NextYearModel) {
      console.error(`Model not found for ${sourceYear} or ${nextYear}`);
      return { success: false, error: "Model not found" };
    }
    const sourceBusinesses = await SourceModel.find({});
    console.log(`Found ${sourceBusinesses.length} businesses in ${sourceYear}`);
    if (sourceBusinesses.length === 0) {
      console.log(`No businesses found in ${sourceYear} to migrate`);
      return { success: true, migrated: 0 };
    }
    await NextYearModel.deleteMany({});
    console.log(`Cleared existing data in ${nextYear} collection`);
    const nextYearData = sourceBusinesses.map((business) =>
      transformDataForNextYear(sourceYear, nextYear, business.toObject()),
    );
    const batchSize = 100;
    let migratedCount = 0;
    for (let i = 0; i < nextYearData.length; i += batchSize) {
      const batch = nextYearData.slice(i, i + batchSize);
      await NextYearModel.insertMany(batch);
      migratedCount += batch.length;
      console.log(
        `Migrated batch ${Math.floor(i / batchSize) + 1}: ${migratedCount} documents`,
      );
    }
    console.log(
      `Migration from ${sourceYear} to ${nextYear} completed successfully!`,
    );
    return { success: true, migrated: migratedCount };
  } catch (error) {
    console.error(`Error migrating from ${sourceYear} to ${nextYear}:`, error);
    return { success: false, error: error.message };
  }
}

async function migrateAllYears() {
  try {
    await establishmentsDB.asPromise();
    console.log("✅ Connected to MongoDB");

    const migrationResults = [];

    const result1 = await migrateYearToNext("2030", "2031");
    migrationResults.push({ from: "2030", to: "2031", ...result1 });

    const result2 = await migrateYearToNext("2031", "2032");
    migrationResults.push({ from: "2031", to: "2032", ...result2 });

    const result3 = await migrateYearToNext("2032", "2033");
    migrationResults.push({ from: "2032", to: "2033", ...result3 });

    const result4 = await migrateYearToNext("2033", "2034");
    migrationResults.push({ from: "2033", to: "2034", ...result4 });

    const result5 = await migrateYearToNext("2034", "2035");
    migrationResults.push({ from: "2034", to: "2035", ...result5 });

    const result6 = await migrateYearToNext("2035", "2036");
    migrationResults.push({ from: "2035", to: "2036", ...result6 });

    const result7 = await migrateYearToNext("2036", "2037");
    migrationResults.push({ from: "2036", to: "2037", ...result7 });

    const result8 = await migrateYearToNext("2037", "2038");
    migrationResults.push({ from: "2037", to: "2038", ...result8 });

    const result9 = await migrateYearToNext("2038", "2039");
    migrationResults.push({ from: "2038", to: "2039", ...result9 });

    const result10 = await migrateYearToNext("2039", "2040");
    migrationResults.push({ from: "2039", to: "2040", ...result10 });

    console.log("\n=== MIGRATION SUMMARY ===");
    migrationResults.forEach((result) => {
      if (result.success) {
        console.log(
          `✅ ${result.from} → ${result.to}: ${result.migrated} businesses migrated`,
        );
      } else {
        console.log(
          `❌ ${result.from} → ${result.to}: Failed - ${result.error}`,
        );
      }
    });

    console.log("\n=== VERIFICATION ===");
    for (const year of [
      "2030",
      "2031",
      "2032",
      "2033",
      "2034",
      "2035",
      "2036",
      "2037",
      "2038",
      "2039",
      "2040",
    ]) {
      const Model = yearModels[year];
      const count = await Model.countDocuments();
      console.log(`${year}: ${count} businesses`);
    }
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await establishmentsDB.close();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

migrateAllYears();
