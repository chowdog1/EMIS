// services/businessSyncService.js
const Business2026 = require("../models/business2026");

// Sync specific fields from 2025 to 2026
const syncBusinessTo2026 = async (business2025) => {
  try {
    const syncData = {
      "ACCOUNT NO": business2025["ACCOUNT NO"],
      "NAME OF BUSINESS": business2025["NAME OF BUSINESS"],
      "NAME OF OWNER": business2025["NAME OF OWNER"],
      ADDRESS: business2025.ADDRESS,
      BARANGAY: business2025.BARANGAY,
    };

    // Use findOneAndUpdate with upsert to either update or create
    await Business2026.findOneAndUpdate(
      { "ACCOUNT NO": business2025["ACCOUNT NO"] },
      syncData,
      { upsert: true, new: true }
    );

    console.log(`Synced business ${business2025["ACCOUNT NO"]} to 2026`);
  } catch (error) {
    console.error(`Error syncing business to 2026: ${error.message}`);
  }
};

// Delete a business from 2026 collection
const deleteBusinessFrom2026 = async (accountNo) => {
  try {
    await Business2026.deleteOne({ "ACCOUNT NO": accountNo });
    console.log(`Deleted business ${accountNo} from 2026 collection`);
  } catch (error) {
    console.error(`Error deleting business from 2026: ${error.message}`);
  }
};

module.exports = {
  syncBusinessTo2026,
  deleteBusinessFrom2026,
};
