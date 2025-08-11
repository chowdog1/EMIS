const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/login
router.post('/login', authController.login);
router.post('/register',authController.register);
router.post('/check-email', authController.checkEmail);

module.exports = router;
