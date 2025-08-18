// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware"); // Import middleware
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// Debug: Check if authController and its methods are properly loaded
console.log("AuthController loaded:", authController);
console.log("AuthController.login type:", typeof authController.login);
console.log("AuthController.register type:", typeof authController.register);
console.log(
  "AuthController.checkEmail type:",
  typeof authController.checkEmail
);
console.log(
  "AuthController.verifyToken type:",
  typeof authController.verifyToken
);

// POST /api/auth/login
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/check-email", authController.checkEmail);
router.post("/verify-token", authController.verifyToken); // This is the endpoint, not middleware

// Protected routes - use the middleware
router.put("/update-profile", verifyToken, authController.updateProfile);
router.post(
  "/upload-profile-picture",
  verifyToken,
  upload.single("profilePicture"),
  authController.uploadProfilePicture
);
router.post("/change-password", verifyToken, authController.changePassword);
// Fix this line - use middleware instead of controller method
router.get(
  "/profile-picture/:userId",
  verifyToken,
  authController.getProfilePicture
);

module.exports = router;
