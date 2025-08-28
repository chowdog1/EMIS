// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const { establishmentsDB } = require("./db.js");
const reportRoutes = require("./routes/reportRoutes");
const auditRoutes = require("./routes/auditRoutes.js");
const http = require("http");
const socketIo = require("socket.io");
const messageRoutes = require("./routes/messageRoutes"); // Make sure this is imported
const app = express();
const PORT = 3000;

// Enhanced CORS configuration for the same subnet
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow all origins from the private 192.168.x.x range
      // Also allow localhost/undefined for development/server-side rendering
      if (
        !origin ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://192.168.")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
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
app.use("/api/messages", messageRoutes); // Add this line - this is crucial!
app.use("/api/audit", auditRoutes);

// Initialize reportRoutes with the establishmentsDB connection
app.use("/api/reports", reportRoutes(establishmentsDB));

// Audit trail page
app.get("/audit", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "audit.html"));
});

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

//users route - serving from root directory
app.get("/users", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "users.html"));
});

// Serve users.js from root directory
app.get("/users.js", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "users.js"));
});

// Root route - serves login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle 404 for any other routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  // Join a room based on user ID
  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    socket.userId = userId; // Store userId in socket object
    console.log(`User ${userId} joined their room`);
  });

  // Handle sending messages
  socket.on("sendMessage", (data) => {
    // Save message to database (we'll do this via HTTP, so just broadcast)
    // Broadcast to recipient
    io.to(data.recipientId).emit("newMessage", data);
    // Mark as delivered
    io.to(data.senderId).emit("messageDelivered", {
      messageId: data.messageId,
    });
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    socket.to(data.recipientId).emit("userTyping", {
      userId: data.senderId,
      isTyping: true,
    });
  });

  socket.on("stopTyping", (data) => {
    socket.to(data.recipientId).emit("userTyping", {
      userId: data.senderId,
      isTyping: false,
    });
  });

  // Handle marking messages as seen
  socket.on("markAsSeen", (data) => {
    // Update message status in database
    // Notify sender
    io.to(data.senderId).emit("messageSeen", {
      messageId: data.messageId,
      seenBy: data.seenBy,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Start server - listen on all interfaces (0.0.0.0) to allow network access
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌐 CENRO Network: http://192.168.55.38:${PORT}`);
  console.log(`🏢 CGSJ_OSS Network: http://192.168.55.229:${PORT}`);
  console.log(`📡 Any device on 192.168.55.x subnet can access the server`);
});
