// seminar2039Service.js
const Seminar2039 = require("../models/seminar2039");

const getAllSeminars2039 = async () => {
  try {
    return await Seminar2039.find({});
  } catch (error) {
    console.error("Error fetching 2039 seminars:", error);
    throw error;
  }
};

const addSeminar2039 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2039.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2039(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2039 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2039 = async (id, status) => {
  try {
    return await Seminar2039.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2039 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2039 = async (status) => {
  try {
    return await Seminar2039.find({ status });
  } catch (error) {
    console.error("Error fetching 2039 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2039,
  addSeminar2039,
  updateSeminarStatus2039,
  getSeminarsByStatus2039,
};
