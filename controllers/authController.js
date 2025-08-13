// controllers/authController.js
const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret_key';

// Debug: Log when the controller is loaded
console.log('AuthController loaded');

//for logging in
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log(`🔐 Login attempt for: ${email}`);
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Incorrect password');
      return res.status(401).json({ message: 'Incorrect password' });
    }
    if (user.isActive === false) {
      console.log('❌ Account inactive');
      return res.status(403).json({ message: 'Account is inactive' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Login successful');
    // Return the token and user information
    res.json({ 
      message: 'Login successful', 
      role: user.role,
      token: token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email input
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    console.log(`🔍 Checking if email exists: ${email}`);
    
    // Check if email exists in database (case insensitive)
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    
    if (user) {
      console.log(`✅ Email exists: ${email}`);
      return res.json({ exists: true });
    } else {
      console.log(`❌ Email does not exist: ${email}`);
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('❌ Error checking email:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//for user register
const register = async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
      role: role || 'user',
      createdAt: new Date(),
      isActive: true
    });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Debug: Log before exporting
console.log('Exporting methods:', { login, register, checkEmail });

module.exports = {
  login,
  register,
  checkEmail
};