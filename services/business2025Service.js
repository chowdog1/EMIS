// services/business2025Service.js
const Business2025 = require("../models/business2025");

// Get all businesses from 2025
const getAllBusinesses2025 = async () => {
  try {
    return await Business2025.find({});
  } catch (error) {
    console.error("Error fetching 2025 businesses:", error);
    throw error;
  }
};

// Get a specific business from 2025
const getBusinessByAccountNo2025 = async (accountNo) => {
  try {
    return await Business2025.findOne({ "ACCOUNT NO": accountNo });
  } catch (error) {
    console.error("Error fetching 2025 business:", error);
    throw error;
  }
};

// Add a new business to 2025
const addBusiness2025 = async (businessData) => {
  try {
    const newBusiness = new Business2025(businessData);
    return await newBusiness.save();
  } catch (error) {
    console.error("Error adding 2025 business:", error);
    throw error;
  }
};

// Update a business in 2025
const updateBusiness2025 = async (accountNo, updateData) => {
  try {
    return await Business2025.findOneAndUpdate(
      { "ACCOUNT NO": accountNo },
      updateData,
      { new: true }
    );
  } catch (error) {
    console.error("Error updating 2025 business:", error);
    throw error;
  }
};

// Delete a business from 2025
const deleteBusiness2025 = async (accountNo) => {
  try {
    return await Business2025.deleteOne({ "ACCOUNT NO": accountNo });
  } catch (error) {
    console.error("Error deleting 2025 business:", error);
    throw error;
  }
};

module.exports = {
  getAllBusinesses2025,
  getBusinessByAccountNo2025,
  addBusiness2025,
  updateBusiness2025,
  deleteBusiness2025,
};
