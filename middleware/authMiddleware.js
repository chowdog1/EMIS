// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = "your_jwt_secret_key";

const verifyToken = (req, res, next) => {
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
    req.user = verified;
    next();
  } catch (error) {
    console.error("Token verification error:", error);

    // Only return 401 if the token is actually invalid (expired, malformed, etc.)
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // For other errors (like network issues), continue
    next();
  }
};

module.exports = { verifyToken };
