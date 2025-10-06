// seminar2029Service.js
const Seminar2029 = require("../models/seminar2029");

const getAllSeminars2029 = async () => {
  try {
    return await Seminar2029.find({});
  } catch (error) {
    console.error("Error fetching 2029 seminars:", error);
    throw error;
  }
};

const addSeminar2029 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2029.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2029(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2029 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2029 = async (id, status) => {
  try {
    return await Seminar2029.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2029 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2029 = async (status) => {
  try {
    return await Seminar2029.find({ status });
  } catch (error) {
    console.error("Error fetching 2029 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2029,
  addSeminar2029,
  updateSeminarStatus2029,
  getSeminarsByStatus2029,
};
