// seminar2027Service.js
const Seminar2027 = require("../models/seminar2027");

const getAllSeminars2027 = async () => {
  try {
    return await Seminar2027.find({});
  } catch (error) {
    console.error("Error fetching 2027 seminars:", error);
    throw error;
  }
};

const addSeminar2027 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2027.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2027(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2027 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2027 = async (id, status) => {
  try {
    return await Seminar2027.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2027 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2027 = async (status) => {
  try {
    return await Seminar2027.find({ status });
  } catch (error) {
    console.error("Error fetching 2027 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2027,
  addSeminar2027,
  updateSeminarStatus2027,
  getSeminarsByStatus2027,
};
