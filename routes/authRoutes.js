// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");
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
console.log(
  "AuthController.getAllUsers type:",
  typeof authController.getAllUsers
);
console.log(
  "AuthController.updateCurrentPage type:",
  typeof authController.updateCurrentPage
);
// Debug: Check if middleware is properly loaded
console.log("verifyToken middleware type:", typeof verifyToken);
// POST /api/auth/login
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/check-email", authController.checkEmail);
router.post("/verify-token", authController.verifyToken); // This now uses the renamed method
router.post("/logout", authController.logout); // Add logout route
router.post("/lock-account", verifyToken, (req, res) => {
  // Get io instance from app
  const io = req.app.get("io");
  authController.lockUserAccount(req, res, io);
});
router.post("/unlock-account", verifyToken, authController.unlockUserAccount);
// Protected routes - use the middleware
router.put("/update-profile", verifyToken, authController.updateProfile);
router.post(
  "/upload-profile-picture",
  verifyToken,
  upload.single("profilePicture"),
  authController.uploadProfilePicture
);
router.post("/change-password", verifyToken, authController.changePassword);
router.get(
  "/profile-picture/:userId",
  verifyToken,
  authController.getProfilePicture
);
router.get("/users", verifyToken, authController.getAllUsers);
router.put("/current-page", verifyToken, authController.updateCurrentPage);
module.exports = router;
