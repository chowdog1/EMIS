// services/businessSyncService.js
const Business2026 = require("../models/business2026");
const Business2027 = require("../models/business2027");
const Business2028 = require("../models/business2028");
const Business2029 = require("../models/business2029");
const Business2030 = require("../models/business2030");
const Business2031 = require("../models/business2031");
const Business2032 = require("../models/business2032");
const Business2033 = require("../models/business2033");
const Business2034 = require("../models/business2034");
const Business2035 = require("../models/business2035");
const Business2036 = require("../models/business2036");
const Business2037 = require("../models/business2037");
const Business2038 = require("../models/business2038");
const Business2039 = require("../models/business2039");
const Business2040 = require("../models/business2040");

// Map years to their models - use string keys
const yearModels = {
  2026: Business2026,
  2027: Business2027,
  2028: Business2028,
  2029: Business2029,
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

// Get all future years from a source year
const getFutureYears = (sourceYear) => {
  const sourceYearNum = parseInt(sourceYear);
  const futureYears = [];

  for (let year = sourceYearNum + 1; year <= 2040; year++) {
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
        ", ",
      )}`,
    );

    // Remove any year-specific fields from the business data
    const baseData = { ...businessData };

    // Remove all year-specific fields (2025_STATUS, 2025_NOTES, 2026_STATUS, etc.)
    for (let year = 2025; year <= 2040; year++) {
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

      // Find existing document to preserve year-specific fields
      const existingDoc = await TargetModel.findOne({
        "ACCOUNT NO": targetData["ACCOUNT NO"],
      });

      if (existingDoc) {
        // Preserve existing values for these specific fields
        targetData["DATE OF APPLICATION"] = existingDoc["DATE OF APPLICATION"];
        targetData["AMOUNT PAID"] = existingDoc["AMOUNT PAID"];
        targetData["DATE OF PAYMENT"] = existingDoc["DATE OF PAYMENT"];
        targetData["OR NO"] = existingDoc["OR NO"];
        targetData["REMARKS"] = existingDoc["REMARKS"];
        // Preserve the target year's own STATUS and NOTES if already set
        targetData[`${targetYear}_STATUS`] =
          existingDoc[`${targetYear}_STATUS`] || "";
        targetData[`${targetYear}_NOTES`] =
          existingDoc[`${targetYear}_NOTES`] || "";
        console.log(
          `Preserved protected fields for ${targetData["ACCOUNT NO"]} in ${targetYear}`,
        );
      } else {
        // For new documents, set these fields to empty values
        targetData["DATE OF APPLICATION"] = "";
        targetData["AMOUNT PAID"] = "";
        targetData["DATE OF PAYMENT"] = "";
        targetData["OR NO"] = "";
        console.log(
          `Set empty protected fields for new document ${targetData["ACCOUNT NO"]} in ${targetYear}`,
        );
      }

      // Use findOneAndUpdate with upsert to either update or create
      await TargetModel.findOneAndUpdate(
        { "ACCOUNT NO": targetData["ACCOUNT NO"] },
        targetData,
        { upsert: true, new: true },
      );

      console.log(
        `Synced business ${targetData["ACCOUNT NO"]} to ${targetYear}`,
      );
    }

    return true;
  } catch (error) {
    console.error(
      `Error syncing business to all future years: ${error.message}`,
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
        ", ",
      )}`,
    );

    // Delete from each future year
    for (const targetYear of futureYears) {
      const TargetModel = yearModels[targetYear];

      if (!TargetModel) {
        console.error(`No model found for year ${targetYear}`);
        continue;
      }

      await TargetModel.deleteOne({ "ACCOUNT NO": accountNo });
      console.log(`Deleted business ${accountNo} from ${targetYear}`);
    }

    return true;
  } catch (error) {
    console.error(
      `Error deleting business from all future years: ${error.message}`,
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

// Specific functions for 2029 → all future years sync
const syncBusinessTo2030 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2029", businessData);
};

const deleteBusinessFrom2030 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2029", accountNo);
};

// Specific functions for 2030 → all future years sync
const syncBusinessTo2031 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2030", businessData);
};

const deleteBusinessFrom2031 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2030", accountNo);
};

// Specific functions for 2031 → all future years sync
const syncBusinessTo2032 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2031", businessData);
};

const deleteBusinessFrom2032 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2031", accountNo);
};

// Specific functions for 2032 → all future years sync
const syncBusinessTo2033 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2032", businessData);
};

const deleteBusinessFrom2033 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2032", accountNo);
};

// Specific functions for 2033 → all future years sync
const syncBusinessTo2034 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2033", businessData);
};

const deleteBusinessFrom2034 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2033", accountNo);
};

// Specific functions for 2034 → all future years sync
const syncBusinessTo2035 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2034", businessData);
};

const deleteBusinessFrom2035 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2034", accountNo);
};

// Specific functions for 2035 → all future years sync
const syncBusinessTo2036 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2035", businessData);
};

const deleteBusinessFrom2036 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2035", accountNo);
};

// Specific functions for 2036 → all future years sync
const syncBusinessTo2037 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2036", businessData);
};

const deleteBusinessFrom2037 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2036", accountNo);
};

// Specific functions for 2037 → all future years sync
const syncBusinessTo2038 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2037", businessData);
};

const deleteBusinessFrom2038 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2037", accountNo);
};

// Specific functions for 2038 → all future years sync
const syncBusinessTo2039 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2038", businessData);
};

const deleteBusinessFrom2039 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2038", accountNo);
};

// Specific functions for 2039 → 2040 sync (last year)
const syncBusinessTo2040 = async (businessData) => {
  return await syncBusinessToAllFutureYears("2039", businessData);
};

const deleteBusinessFrom2040 = async (accountNo) => {
  return await deleteBusinessFromAllFutureYears("2039", accountNo);
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
  syncBusinessTo2031,
  deleteBusinessFrom2031,
  syncBusinessTo2032,
  deleteBusinessFrom2032,
  syncBusinessTo2033,
  deleteBusinessFrom2033,
  syncBusinessTo2034,
  deleteBusinessFrom2034,
  syncBusinessTo2035,
  deleteBusinessFrom2035,
  syncBusinessTo2036,
  deleteBusinessFrom2036,
  syncBusinessTo2037,
  deleteBusinessFrom2037,
  syncBusinessTo2038,
  deleteBusinessFrom2038,
  syncBusinessTo2039,
  deleteBusinessFrom2039,
  syncBusinessTo2040,
  deleteBusinessFrom2040,
};
