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
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  // For session tracking
  currentSessionId: String,
  lastLoginAt: Date,
  // user tracking
  currentPage: String,
  lastActivity: Date,
  isOnline: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("User", userSchema);
