// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "8a001b05f4cba9b638169f9836c7ff09";
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify the token with the secret
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
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
    return res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = { verifyToken };
