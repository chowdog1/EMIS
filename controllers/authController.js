const User = require('../models/user');
const bcrypt = require('bcrypt');

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
