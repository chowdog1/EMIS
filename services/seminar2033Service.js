// seminar2033Service.js
const Seminar2033 = require("../models/seminar2033");

const getAllSeminars2033 = async () => {
  try {
    return await Seminar2033.find({});
  } catch (error) {
    console.error("Error fetching 2033 seminars:", error);
    throw error;
  }
};

const addSeminar2033 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2033.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2033(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2033 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2033 = async (id, status) => {
  try {
    return await Seminar2033.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2033 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2033 = async (status) => {
  try {
    return await Seminar2033.find({ status });
  } catch (error) {
    console.error("Error fetching 2033 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2033,
  addSeminar2033,
  updateSeminarStatus2033,
  getSeminarsByStatus2033,
};
