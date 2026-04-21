// seminar2031Service.js
const Seminar2031 = require("../models/seminar2031");

const getAllSeminars2031 = async () => {
  try {
    return await Seminar2031.find({});
  } catch (error) {
    console.error("Error fetching 2031 seminars:", error);
    throw error;
  }
};

const addSeminar2031 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2031.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2031(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2031 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2031 = async (id, status) => {
  try {
    return await Seminar2031.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2031 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2031 = async (status) => {
  try {
    return await Seminar2031.find({ status });
  } catch (error) {
    console.error("Error fetching 2031 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2031,
  addSeminar2031,
  updateSeminarStatus2031,
  getSeminarsByStatus2031,
};
