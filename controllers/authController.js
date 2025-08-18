// controllers/authController.js
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "your_jwt_secret_key";

// Debug: Log when the controller is loaded
console.log("AuthController loaded");

//for logging in
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log(`🔐 Login attempt for: ${email}`);
    const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Incorrect password");
      return res.status(401).json({ message: "Incorrect password" });
    }
    if (user.isActive === false) {
      console.log("❌ Account inactive");
      return res.status(403).json({ message: "Account is inactive" });
    }
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    console.log("✅ Login successful");
    // Return the token and user information
    res.json({
      message: "Login successful",
      role: user.role,
      token: token,
      user: {
        id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        hasProfilePicture: !!(user.profilePicture && user.profilePicture.data),
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Check if email exists
const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    // Validate email input
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    console.log(`🔍 Checking if email exists: ${email}`);
    // Check if email exists in database (case insensitive)
    const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
    if (user) {
      console.log(`✅ Email exists: ${email}`);
      return res.json({ exists: true });
    } else {
      console.log(`❌ Email does not exist: ${email}`);
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("❌ Error checking email:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//for user register
const register = async (req, res) => {
  const { firstname, lastname, email, password, role } = req.body;
  try {
    const existingUser = await User.findOne({
      email: new RegExp(`^${email}$`, "i"),
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      role: role || "user",
      createdAt: new Date(),
      isActive: true,
    });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//for verifying user
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // First, try to decode the token without verification to check if it's malformed
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Check if the token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({ message: "Token expired" });
    }

    // If the token looks valid, verify it with the secret
    const verified = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(verified.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid token" });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        hasProfilePicture: !!(user.profilePicture && user.profilePicture.data),
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);

    // Only return 401 if the token is actually invalid
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // For other errors, return 500
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstname, lastname, email } = req.body;
    const userId = req.user.userId; // From middleware
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Check if email is being changed and if it already exists
    if (email !== user.email) {
      const existingUser = await User.findOne({
        email: new RegExp(`^${email}$`, "i"),
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }
    // Update user
    user.firstname = firstname;
    user.lastname = lastname;
    user.email = email;
    await user.save();
    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Store image as binary data
    user.profilePicture = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
    };
    await user.save();
    // Return a simple success response without the image data
    res.json({
      message: "Profile picture uploaded successfully",
      hasProfilePicture: true,
    });
  } catch (error) {
    console.error("❌ Error uploading profile picture:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get profile picture
const getProfilePicture = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const user = await User.findById(userId);
    if (!user || !user.profilePicture || !user.profilePicture.data) {
      return res.status(404).json({ message: "Profile picture not found" });
    }
    res.set("Content-Type", user.profilePicture.contentType);
    res.send(user.profilePicture.data);
  } catch (error) {
    console.error("❌ Error getting profile picture:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Update password
    user.password = hashedPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("❌ Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Debug: Log before exporting
console.log("Exporting methods:", {
  login,
  register,
  checkEmail,
  verifyToken,
  updateProfile,
  uploadProfilePicture,
  changePassword,
  getProfilePicture,
});

module.exports = {
  login,
  register,
  checkEmail,
  verifyToken,
  updateProfile,
  uploadProfilePicture,
  changePassword,
  getProfilePicture,
};
