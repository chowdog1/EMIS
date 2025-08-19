// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const { establishmentsDB } = require("./db.js"); // Add .js extension
const reportRoutes = require("./routes/reportRoutes");
const app = express();
const PORT = 3000;

// Enhanced CORS configuration for the same subnet
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow localhost for development
      if (
        !origin ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1")
      ) {
        return callback(null, true);
      }
      // Allow any IP in the 192.168.55.x subnet (both CENRO and CGSJ_OSS)
      if (origin && origin.match(/^http:\/\/192\.168\.55\.\d{1,3}:3000$/)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Connect to MongoDB for auth
mongoose
  .connect("mongodb://localhost:27017/logindb")
  .then(() => console.log("✅ Auth MongoDB connected"))
  .catch((err) => {
    console.error("❌ Auth MongoDB connection error:", err);
    process.exit(1); // Exit if auth DB fails
  });

// Now require businessRoutes AFTER establishing the connection
const business2025Routes = require("./routes/business2025Routes.js");
// connection for 2026
const business2026Routes = require("./routes/business2026Routes.js");

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/business2025", business2025Routes);
app.use("/api/business2026", business2026Routes);

// Initialize reportRoutes with the establishmentsDB connection
app.use("/api/reports", reportRoutes(establishmentsDB));

// Dashboard route
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Dashboard.html route (for backward compatibility)
app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Businesses route
app.get("/businesses", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "businesses.html"));
});

// Reports route
app.get("/reports", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reports.html"));
});

//for profile.html route
app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

// Root route - serves login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle 404 for any other routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server - listen on all interfaces (0.0.0.0) to allow network access
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌐 CENRO Network: http://192.168.55.38:${PORT}`);
  console.log(`🏢 CGSJ_OSS Network: http://192.168.55.229:${PORT}`);
  console.log(`📡 Any device on 192.168.55.x subnet can access the server`);
});
