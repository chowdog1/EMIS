// seminar2034Service.js
const Seminar2034 = require("../models/seminar2034");

const getAllSeminars2034 = async () => {
  try {
    return await Seminar2034.find({});
  } catch (error) {
    console.error("Error fetching 2034 seminars:", error);
    throw error;
  }
};

const addSeminar2034 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2034.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2034(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2034 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2034 = async (id, status) => {
  try {
    return await Seminar2034.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2034 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2034 = async (status) => {
  try {
    return await Seminar2034.find({ status });
  } catch (error) {
    console.error("Error fetching 2034 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2034,
  addSeminar2034,
  updateSeminarStatus2034,
  getSeminarsByStatus2034,
};
