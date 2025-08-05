const User = require('../models/user');
const bcrypt = require('bcrypt');


//for logging in
exports.login = async (req, res) => {
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

    console.log('✅ Login successful');
    res.json({ message: 'Login successful', role: user.role });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

//for user register

exports.register = async (req, res) => {
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