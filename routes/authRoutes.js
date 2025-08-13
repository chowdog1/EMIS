// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Debug: Check if authController and its methods are properly loaded
console.log('AuthController loaded:', authController);
console.log('AuthController.login type:', typeof authController.login);
console.log('AuthController.register type:', typeof authController.register);
console.log('AuthController.checkEmail type:', typeof authController.checkEmail);
console.log('AuthController.verifyToken type:', typeof authController.verifyToken);

// POST /api/auth/login
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/check-email', authController.checkEmail);
router.post('/verify-token', authController.verifyToken);

module.exports = router;