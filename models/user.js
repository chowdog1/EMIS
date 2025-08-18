// models/user.js
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  firstname: String,
  lastname: String,
  profilePicture: {
    data: Buffer,
    contentType: String,
    url: String,
  }, // Store as binary data instead of base64 string
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("User", userSchema);
