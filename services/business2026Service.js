// services/business2026Service.js
const Business2026 = require("../models/business2026");

// Get all businesses from 2026
const getAllBusinesses2026 = async () => {
  try {
    return await Business2026.find({});
  } catch (error) {
    console.error("Error fetching 2026 businesses:", error);
    throw error;
  }
};

// Get a specific business from 2026
const getBusinessByAccountNo2026 = async (accountNo) => {
  try {
    return await Business2026.findOne({ "ACCOUNT NO": accountNo });
  } catch (error) {
    console.error("Error fetching 2026 business:", error);
    throw error;
  }
};

// Add a new business to 2026
const addBusiness2026 = async (businessData) => {
  try {
    const newBusiness = new Business2026(businessData);
    return await newBusiness.save();
  } catch (error) {
    console.error("Error adding 2026 business:", error);
    throw error;
  }
};

// Update a business in 2026
const updateBusiness2026 = async (accountNo, updateData) => {
  try {
    return await Business2026.findOneAndUpdate(
      { "ACCOUNT NO": accountNo },
      updateData,
      { new: true }
    );
  } catch (error) {
    console.error("Error updating 2026 business:", error);
    throw error;
  }
};

// Delete a business from 2026
const deleteBusiness2026 = async (accountNo) => {
  try {
    return await Business2026.deleteOne({ "ACCOUNT NO": accountNo });
  } catch (error) {
    console.error("Error deleting 2026 business:", error);
    throw error;
  }
};

module.exports = {
  getAllBusinesses2026,
  getBusinessByAccountNo2026,
  addBusiness2026,
  updateBusiness2026,
  deleteBusiness2026,
};
