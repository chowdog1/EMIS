// seminar2030Service.js
const Seminar2030 = require("../models/seminar2030");

const getAllSeminars2030 = async () => {
  try {
    return await Seminar2030.find({});
  } catch (error) {
    console.error("Error fetching 2030 seminars:", error);
    throw error;
  }
};

const addSeminar2030 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2030.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2030(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2030 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2030 = async (id, status) => {
  try {
    return await Seminar2030.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2030 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2030 = async (status) => {
  try {
    return await Seminar2030.find({ status });
  } catch (error) {
    console.error("Error fetching 2030 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2030,
  addSeminar2030,
  updateSeminarStatus2030,
  getSeminarsByStatus2030,
};
