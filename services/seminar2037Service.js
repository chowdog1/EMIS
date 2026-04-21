// seminar2037Service.js
const Seminar2037 = require("../models/seminar2037");

const getAllSeminars2037 = async () => {
  try {
    return await Seminar2037.find({});
  } catch (error) {
    console.error("Error fetching 2037 seminars:", error);
    throw error;
  }
};

const addSeminar2037 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2037.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2037(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2037 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2037 = async (id, status) => {
  try {
    return await Seminar2037.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2037 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2037 = async (status) => {
  try {
    return await Seminar2037.find({ status });
  } catch (error) {
    console.error("Error fetching 2037 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2037,
  addSeminar2037,
  updateSeminarStatus2037,
  getSeminarsByStatus2037,
};
