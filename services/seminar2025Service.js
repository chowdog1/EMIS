const Seminar2025 = require("../models/seminar2025");

// Get all seminars for 2025
const getAllSeminars2025 = async () => {
  try {
    return await Seminar2025.find({});
  } catch (error) {
    console.error("Error fetching 2025 seminars:", error);
    throw error;
  }
};

// Add a new seminar to 2025
const addSeminar2025 = async (seminarData) => {
  try {
    // If seminarData is an array (from CSV upload), use insertMany
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2025.insertMany(seminarData);
    }
    // Otherwise, create a single document
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2025(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2025 seminar:", error);
    throw error;
  }
};

// Update seminar status in 2025
const updateSeminarStatus2025 = async (id, status) => {
  try {
    return await Seminar2025.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2025 seminar status:", error);
    throw error;
  }
};

// Get seminars by status in 2025
const getSeminarsByStatus2025 = async (status) => {
  try {
    return await Seminar2025.find({ status });
  } catch (error) {
    console.error("Error fetching 2025 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2025,
  addSeminar2025,
  updateSeminarStatus2025,
  getSeminarsByStatus2025,
};
