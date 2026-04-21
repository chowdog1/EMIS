// seminar2032Service.js
const Seminar2032 = require("../models/seminar2032");

const getAllSeminars2032 = async () => {
  try {
    return await Seminar2032.find({});
  } catch (error) {
    console.error("Error fetching 2032 seminars:", error);
    throw error;
  }
};

const addSeminar2032 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2032.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2032(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2032 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2032 = async (id, status) => {
  try {
    return await Seminar2032.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2032 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2032 = async (status) => {
  try {
    return await Seminar2032.find({ status });
  } catch (error) {
    console.error("Error fetching 2032 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2032,
  addSeminar2032,
  updateSeminarStatus2032,
  getSeminarsByStatus2032,
};
