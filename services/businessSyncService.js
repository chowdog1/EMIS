// services/businessSyncService.js
const Business2026 = require("../models/business2026");

// Sync specific fields from 2025 to 2026
const syncBusinessTo2026 = async (business2025) => {
  try {
    const accountNo = business2025["ACCOUNT NO"];

    if (!accountNo) {
      console.error("Cannot sync business without account number");
      return;
    }

    const syncData = {
      "ACCOUNT NO": accountNo,
      "NAME OF BUSINESS": business2025["NAME OF BUSINESS"],
      "NAME OF OWNER": business2025["NAME OF OWNER"],
      ADDRESS: business2025.ADDRESS,
      BARANGAY: business2025.BARANGAY,
    };

    // Use findOneAndUpdate with upsert to either update or create
    const result = await Business2026.findOneAndUpdate(
      { "ACCOUNT NO": accountNo },
      syncData,
      { upsert: true, new: true }
    );

    console.log(`Synced business ${accountNo} to 2026`, result);
    return result;
  } catch (error) {
    console.error(`Error syncing business to 2026: ${error.message}`);
    throw error;
  }
};

// Delete a business from 2026 collection
const deleteBusinessFrom2026 = async (accountNo) => {
  try {
    if (!accountNo) {
      console.error("Cannot delete business without account number");
      return;
    }

    const result = await Business2026.deleteOne({ "ACCOUNT NO": accountNo });
    console.log(`Deleted business ${accountNo} from 2026 collection`, result);
    return result;
  } catch (error) {
    console.error(`Error deleting business from 2026: ${error.message}`);
    throw error;
  }
};

// Sync all businesses from 2025 to 2026 (for manual sync if needed)
const syncAllBusinessesTo2026 = async () => {
  try {
    console.log("Starting full sync from 2025 to 2026");

    // Get all businesses from 2025
    const Business2025 = require("../models/business2025");
    const businesses2025 = await Business2025.find({});

    console.log(`Found ${businesses2025.length} businesses in 2025 to sync`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const business of businesses2025) {
      try {
        await syncBusinessTo2026(business);
        syncedCount++;
      } catch (error) {
        console.error(
          `Error syncing business ${business["ACCOUNT NO"]}:`,
          error
        );
        errorCount++;
      }
    }

    console.log(`Sync completed: ${syncedCount} synced, ${errorCount} errors`);
    return { syncedCount, errorCount, total: businesses2025.length };
  } catch (error) {
    console.error("Error in full sync from 2025 to 2026:", error);
    throw error;
  }
};

module.exports = {
  syncBusinessTo2026,
  deleteBusinessFrom2026,
  syncAllBusinessesTo2026,
};
