// seminar2028Service.js
const Seminar2028 = require("../models/seminar2028");

const getAllSeminars2028 = async () => {
  try {
    return await Seminar2028.find({});
  } catch (error) {
    console.error("Error fetching 2028 seminars:", error);
    throw error;
  }
};

const addSeminar2028 = async (seminarData) => {
  try {
    if (Array.isArray(seminarData)) {
      console.log("Inserting multiple seminars:", seminarData.length);
      return await Seminar2028.insertMany(seminarData);
    }
    console.log("Inserting single seminar:", seminarData);
    const newSeminar = new Seminar2028(seminarData);
    return await newSeminar.save();
  } catch (error) {
    console.error("Error adding 2028 seminar:", error);
    throw error;
  }
};

const updateSeminarStatus2028 = async (id, status) => {
  try {
    return await Seminar2028.findByIdAndUpdate(id, { status }, { new: true });
  } catch (error) {
    console.error("Error updating 2028 seminar status:", error);
    throw error;
  }
};

const getSeminarsByStatus2028 = async (status) => {
  try {
    return await Seminar2028.find({ status });
  } catch (error) {
    console.error("Error fetching 2028 seminars by status:", error);
    throw error;
  }
};

module.exports = {
  getAllSeminars2028,
  addSeminar2028,
  updateSeminarStatus2028,
  getSeminarsByStatus2028,
};
