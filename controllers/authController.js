// controllers/authController.js
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "8a001b05f4cba9b638169f9836c7ff09";
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
    // Check if account is locked
    if (user.isLocked === true) {
      console.log("❌ Account locked");
      return res.status(403).json({
        message: "This account is locked. Contact the administrator.",
      });
    }
    // Check if user is already logged in
    if (user.currentSessionId) {
      const sessionAge = Date.now() - user.lastLoginAt.getTime();
      const sessionThreshold = 30 * 60 * 1000; // 30 minutes
      // If session is older than threshold, clear it and allow login
      if (sessionAge > sessionThreshold) {
        console.log("🔄 Clearing stale session");
        user.currentSessionId = null;
        user.lastLoginAt = null;
        await user.save();
      } else {
        console.log("❌ User already logged in");
        return res.status(409).json({
          message:
            "This account is currently being used in another session. Please try again later.",
        });
      }
    }
    // Create JWT token
    const sessionId = require("crypto").randomBytes(16).toString("hex");
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, sessionId },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    // Update user session info
    user.currentSessionId = sessionId;
    user.lastLoginAt = new Date();
    user.isOnline = true;
    await user.save();
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

// logout function
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user) {
      // Update user's online status and clear session info
      user.currentSessionId = null;
      user.isOnline = false;
      user.lastActivity = new Date(); // Update last activity to logout time
      await user.save();
      console.log(`User ${user.email} logged out successfully`);
    }
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("❌ Logout error:", error);
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
      isLocked: false, // Initialize as not locked
    });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//for verifying user - renamed to avoid conflict with middleware
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    // Verify the token with the secret
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
    // Handle specific token errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token format" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
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

// Get all users with online status and current page
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password"); // Exclude password
    // Calculate online status based on lastActivity
    const usersWithStatus = users.map((user) => {
      const now = new Date();
      const lastActivity = user.lastActivity || new Date(0);
      const timeDiff = now - lastActivity;
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes threshold
      // If user is marked as online but hasn't had recent activity, update their status
      if (user.isOnline && timeDiff > fiveMinutes) {
        // Update user in database
        User.findByIdAndUpdate(user._id, { isOnline: false }).catch((err) => {
          console.error(`Failed to update user ${user.email} status:`, err);
        });
        return {
          id: user._id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role,
          isOnline: false, // Override with actual status
          currentPage: user.currentPage || "N/A",
          lastActivity: user.lastActivity,
          hasProfilePicture: !!(
            user.profilePicture && user.profilePicture.data
          ),
          isLocked: user.isLocked || false, // Include lock status
        };
      }
      return {
        id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        isOnline: user.isOnline,
        currentPage: user.currentPage || "N/A",
        lastActivity: user.lastActivity,
        hasProfilePicture: !!(user.profilePicture && user.profilePicture.data),
        isLocked: user.isLocked || false, // Include lock status
      };
    });
    res.json(usersWithStatus);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update user's current page
const updateCurrentPage = async (req, res) => {
  try {
    const { page } = req.body;
    if (!page) {
      return res.status(400).json({ message: "Page is required" });
    }
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.currentPage = page;
    user.lastActivity = new Date();
    user.isOnline = true;
    await user.save();
    res.json({ message: "Current page updated successfully" });
  } catch (error) {
    console.error("Error updating current page:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Lock user account
const lockUserAccount = async (req, res, io) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the requesting user is an admin
    const requestingUser = await User.findById(req.user.userId);
    if (requestingUser.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only administrators can lock user accounts" });
    }

    user.isLocked = true;
    await user.save();

    console.log(
      `User ${user.email} account locked by admin ${requestingUser.email}`
    );

    // Emit socket event to the user's room
    if (io) {
      io.to(userId.toString()).emit("accountLocked", {
        message:
          "Your account has been locked by administrator. You will be automatically logged out.",
      });
    }

    res.json({ message: "User account locked successfully" });
  } catch (error) {
    console.error("Error locking user account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Unlock user account
const unlockUserAccount = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the requesting user is an admin
    const requestingUser = await User.findById(req.user.userId);
    if (requestingUser.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only administrators can unlock user accounts" });
    }

    user.isLocked = false;
    await user.save();

    console.log(
      `User ${user.email} account unlocked by admin ${requestingUser.email}`
    );
    res.json({ message: "User account unlocked successfully" });
  } catch (error) {
    console.error("Error unlocking user account:", error);
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
  logout,
  getAllUsers,
  updateCurrentPage,
  lockUserAccount,
  unlockUserAccount,
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
  logout,
  getAllUsers,
  updateCurrentPage,
  lockUserAccount,
  unlockUserAccount,
};
