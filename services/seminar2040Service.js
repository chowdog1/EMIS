// seminar2040Service.js
const Seminar2040 = require("../models/seminar2040");

const getAllSeminars2040 = async () => {
  try {
    return await Seminar2040.find({});
  } catch (error) {
    console.error("Error fetching 2040 seminars:", error);
    throw error;
  }
};

const addSeminar2040 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2040.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2040(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2040 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2040 = async (id, status) => {
  try {
    return await Seminar2040.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2040 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2040 = async (status) => {
  try {
    return await Seminar2040.find({ status });
  } catch (error) {
    console.error("Error fetching 2040 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2040,
  addSeminar2040,
  updateSeminarStatus2040,
  getSeminarsByStatus2040,
};
