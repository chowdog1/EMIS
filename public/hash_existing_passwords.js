// hash_existing_passwords.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/logindb', {
  useNewUrlParser: true, // these options can be removed if using mongoose 6+
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB connected");
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});

// Define the schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  createdAt: Date,
  isActive: Boolean
});

const User = mongoose.model('User', userSchema);

// Hash all existing passwords
async function hashAllPasswords() {
  try {
    const users = await User.find({});

    for (let user of users) {
      // Log current password for reference
      console.log(`🔎 Original password for ${user.email}: ${user.password}`);

      // Always hash regardless of format
      const hashedPassword = await bcrypt.hash(user.password, 10);

      user.password = hashedPassword;
      await user.save();

      console.log(`🔐 Hashed and saved password for: ${user.email}`);
    }

    console.log("✅ Password hashing complete.");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error hashing passwords:", err);
    mongoose.connection.close();
  }
}

hashAllPasswords();
