// services/businessSyncService.js
const Business2026 = require("../models/business2026");
const Business2027 = require("../models/business2027");
const Business2028 = require("../models/business2028");
const Business2029 = require("../models/business2029");
const Business2030 = require("../models/business2030");

// Map years to their models - use string keys
const yearModels = {
  2026: Business2026,
  2027: Business2027,
  2028: Business2028,
  2029: Business2029,
  2030: Business2030,
};

// Get all future years from a source year
const getFutureYears = (sourceYear) => {
  const sourceYearNum = parseInt(sourceYear);
  const futureYears = [];

  for (let year = sourceYearNum + 1; year <= 2030; year++) {
    futureYears.push(year.toString());
  }

  return futureYears;
};

// Sync business to all future years
const syncBusinessToAllFutureYears = async (sourceYear, businessData) => {
  try {
    const futureYears = getFutureYears(sourceYear);
    console.log(
      `Syncing business from ${sourceYear} to future years: ${futureYears.join(
        ", "
      )}`
    );

    // Remove any year-specific fields from the business data
    const baseData = { ...businessData };

    // Remove all year-specific fields (2025_STATUS, 2025_NOTES, 2026_STATUS, etc.)
    for (let year = 2025; year <= 2030; year++) {
      delete baseData[`${year}_STATUS`];
      delete baseData[`${year}_NOTES`];
    }

    // Sync to each future year
    for (const targetYear of futureYears) {
      const TargetModel = yearModels[targetYear];

      if (!TargetModel) {
        console.error(`No model found for year ${targetYear}`);
        continue;
      }

      // Create target data with year-specific fields
      const targetData = { ...baseData };
      targetData[`${targetYear}_STATUS`] = "";
      targetData[`${targetYear}_NOTES`] = "";

      // Use findOneAndUpdate with upsert to either update or create
      const result = await TargetModel.findOneAndUpdate(
        { "ACCOUNT NO": targetData["ACCOUNT NO"] },
        targetData,
        { upsert: true, new: true }
      );

      console.log(
        `Synced business ${targetData["ACCOUNT NO"]} to ${targetYear}`
      );
    }

    return true;
  } catch (error) {
    console.error(
      `Error syncing business to all future years: ${error.message}`
    );
    throw error;
  }
};

// Delete business from all future years
const deleteBusinessFromAllFutureYears = async (sourceYear, accountNo) => {
  try {
    const futureYears = getFutureYears(sourceYear);
    console.log(
      `Deleting business ${accountNo} from future years: ${futureYears.join(
        ", "
      )}`
    );

    // Delete from each future year
    for (const targetYear of futureYears) {
      const TargetModel = yearModels[targetYear];

      if (!TargetModel) {
        console.error(`No model found for year ${targetYear}`);
        continue;
      }

      const result = await TargetModel.deleteOne({ "ACCOUNT NO": accountNo });
      console.log(`Deleted business ${accountNo} from ${targetYear}`);
    }

    return true;
  } catch (error) {
    console.error(
      `Error deleting business from all future years: ${error.message}`
    );
    throw error;
  }
};

// Specific functions for 2025 → all future years sync
const syncBusinessTo2026 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2025", businessData);
};

const deleteBusinessFrom2026 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2025", accountNo);
};

// Specific functions for 2026 → all future years sync
const syncBusinessTo2027 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2026", businessData);
};

const deleteBusinessFrom2027 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2026", accountNo);
};

// Specific functions for 2027 → all future years sync
const syncBusinessTo2028 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2027", businessData);
};

const deleteBusinessFrom2028 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2027", accountNo);
};

// Specific functions for 2028 → all future years sync
const syncBusinessTo2029 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2028", businessData);
};

const deleteBusinessFrom2029 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2028", accountNo);
};

// Specific functions for 2029 → 2030 sync (only one future year)
const syncBusinessTo2030 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2029", businessData);
};

const deleteBusinessFrom2030 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2029", accountNo);
};

module.exports = {
  // Generic functions
  syncBusinessToAllFutureYears,
  deleteBusinessFromAllFutureYears,

  // Specific functions for each year transition
  syncBusinessTo2026,
  deleteBusinessFrom2026,
  syncBusinessTo2027,
  deleteBusinessFrom2027,
  syncBusinessTo2028,
  deleteBusinessFrom2028,
  syncBusinessTo2029,
  deleteBusinessFrom2029,
  syncBusinessTo2030,
  deleteBusinessFrom2030,
};
