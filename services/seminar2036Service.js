// seminar2036Service.js
const Seminar2036 = require("../models/seminar2036");

const getAllSeminars2036 = async () => {
  try {
    return await Seminar2036.find({});
  } catch (error) {
    console.error("Error fetching 2036 seminars:", error);
    throw error;
  }
};

const addSeminar2036 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2036.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2036(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2036 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2036 = async (id, status) => {
  try {
    return await Seminar2036.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2036 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2036 = async (status) => {
  try {
    return await Seminar2036.find({ status });
  } catch (error) {
    console.error("Error fetching 2036 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2036,
  addSeminar2036,
  updateSeminarStatus2036,
  getSeminarsByStatus2036,
};
