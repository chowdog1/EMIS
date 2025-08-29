const Seminar2026 = require("../models/seminar2026");

// Get all seminars for 2026
const getAllSeminars2026 = async () => {
  try {
    return await Seminar2026.find({});
  } catch (error) {
    console.error("Error fetching 2026 seminars:", error);
    throw error;
  }
};

// Add a new seminar to 2026
const addSeminar2026 = async (seminarData) => {
  try {
    // If seminarData is an array (from CSV upload), use insertMany
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2026.insertMany(seminarData);
    }
    // Otherwise, create a single document
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2026(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2026 seminar:", error);
    throw error;
  }
};

// Update seminar status in 2026
const updateSeminarStatus2026 = async (id, status) => {
  try {
    return await Seminar2026.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2026 seminar status:", error);
    throw error;
  }
};

// Get seminars by status in 2026
const getSeminarsByStatus2026 = async (status) => {
  try {
    return await Seminar2026.find({ status });
  } catch (error) {
    console.error("Error fetching 2026 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2026,
  addSeminar2026,
  updateSeminarStatus2026,
  getSeminarsByStatus2026,
};
