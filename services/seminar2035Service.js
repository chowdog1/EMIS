// seminar2035Service.js
const Seminar2035 = require("../models/seminar2035");

const getAllSeminars2035 = async () => {
  try {
    return await Seminar2035.find({});
  } catch (error) {
    console.error("Error fetching 2035 seminars:", error);
    throw error;
  }
};

const addSeminar2035 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2035.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2035(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2035 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2035 = async (id, status) => {
  try {
    return await Seminar2035.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2035 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2035 = async (status) => {
  try {
    return await Seminar2035.find({ status });
  } catch (error) {
    console.error("Error fetching 2035 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2035,
  addSeminar2035,
  updateSeminarStatus2035,
  getSeminarsByStatus2035,
};
