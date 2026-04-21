require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const { authDB, establishmentsDB } = require("./config/database");
const inspectionRoutes = require("./routes/inspectionRoutes");
const violationRoutes = require("./routes/violationRoutes");
const complianceRoutes = require("./routes/complianceRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditRoutes = require("./routes/auditRoutes.js");
const {
  router: certificateRoutes,
  cleanupOldCertificates,
} = require("./routes/certificateRoutes.js");
const http = require("http");
const socketIo = require("socket.io");
const messageRoutes = require("./routes/messageRoutes");
const cron = require("node-cron");
const app = express();
const PORT = process.env.PORT;

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
  }),
);

app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));
app.use("/certificates", express.static(path.join(__dirname, "certificates")));
app.use("/signatures", express.static(path.join(__dirname, "signatures")));

// Now require businessRoutes AFTER establishing the connection
const business2025Routes = require("./routes/business2025Routes.js");
// connection for 2026
const business2026Routes = require("./routes/business2026Routes.js");
// connection for 2027
const business2027Routes = require("./routes/business2027Routes.js");
// connection for 2028
const business2028Routes = require("./routes/business2028Routes.js");
// connection for 2029
const business2029Routes = require("./routes/business2029Routes.js");
// connection for 2030
const business2030Routes = require("./routes/business2030Routes.js");
// connection for 2031
const business2031Routes = require("./routes/business2031Routes.js");
// connection for 2032
const business2032Routes = require("./routes/business2032Routes.js");
// connection for 2033
const business2033Routes = require("./routes/business2033Routes.js");
// connection for 2034
const business2034Routes = require("./routes/business2034Routes.js");
// connection for 2035
const business2035Routes = require("./routes/business2035Routes.js");
// connection for 2036
const business2036Routes = require("./routes/business2036Routes.js");
// connection for 2037
const business2037Routes = require("./routes/business2037Routes.js");
// connection for 2038
const business2038Routes = require("./routes/business2038Routes.js");
// connection for 2039
const business2039Routes = require("./routes/business2039Routes.js");
// connection for 2040
const business2040Routes = require("./routes/business2040Routes.js");
// seminar2025
const seminar2025Routes = require("./routes/seminar2025Routes.js");
// seminar2026
const seminar2026Routes = require("./routes/seminar2026Routes.js");
// seminar2027
const seminar2027Routes = require("./routes/seminar2027Routes.js");
// seminar2028
const seminar2028Routes = require("./routes/seminar2028Routes.js");
// seminar2029
const seminar2029Routes = require("./routes/seminar2029Routes.js");
// seminar2030
const seminar2030Routes = require("./routes/seminar2030Routes.js");
// seminar2031
const seminar2031Routes = require("./routes/seminar2031Routes.js");
// seminar2032
const seminar2032Routes = require("./routes/seminar2032Routes.js");
// seminar2033
const seminar2033Routes = require("./routes/seminar2033Routes.js");
// seminar2034
const seminar2034Routes = require("./routes/seminar2034Routes.js");
// seminar2035
const seminar2035Routes = require("./routes/seminar2035Routes.js");
// seminar2036
const seminar2036Routes = require("./routes/seminar2036Routes.js");
// seminar2037
const seminar2037Routes = require("./routes/seminar2037Routes.js");
// seminar2038
const seminar2038Routes = require("./routes/seminar2038Routes.js");
// seminar2039
const seminar2039Routes = require("./routes/seminar2039Routes.js");
// seminar2040
const seminar2040Routes = require("./routes/seminar2040Routes.js");

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store io instance in app for access in routes
app.set("io", io);

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

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/business2025", business2025Routes);
app.use("/api/business2026", business2026Routes);
app.use("/api/business2027", business2027Routes);
app.use("/api/business2028", business2028Routes);
app.use("/api/business2029", business2029Routes);
app.use("/api/business2030", business2030Routes);
app.use("/api/business2031", business2031Routes);
app.use("/api/business2032", business2032Routes);
app.use("/api/business2033", business2033Routes);
app.use("/api/business2034", business2034Routes);
app.use("/api/business2035", business2035Routes);
app.use("/api/business2036", business2036Routes);
app.use("/api/business2037", business2037Routes);
app.use("/api/business2038", business2038Routes);
app.use("/api/business2039", business2039Routes);
app.use("/api/business2040", business2040Routes);
app.use("/api/seminar2025", seminar2025Routes);
app.use("/api/seminar2026", seminar2026Routes);
app.use("/api/seminar2027", seminar2027Routes);
app.use("/api/seminar2028", seminar2028Routes);
app.use("/api/seminar2029", seminar2029Routes);
app.use("/api/seminar2030", seminar2030Routes);
app.use("/api/seminar2031", seminar2031Routes);
app.use("/api/seminar2032", seminar2032Routes);
app.use("/api/seminar2033", seminar2033Routes);
app.use("/api/seminar2034", seminar2034Routes);
app.use("/api/seminar2035", seminar2035Routes);
app.use("/api/seminar2036", seminar2036Routes);
app.use("/api/seminar2037", seminar2037Routes);
app.use("/api/seminar2038", seminar2038Routes);
app.use("/api/seminar2039", seminar2039Routes);
app.use("/api/seminar2040", seminar2040Routes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/certificates", certificateRoutes);

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

// Seminars route
app.get("/seminars", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "seminars.html"));
});

// Certificate route
app.get("/certifications", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "certifications.html"));
});

// Inspection Route
app.get("/inspections", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "inspections.html")),
);

// Violations Route
app.get("/violations", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "violations.html")),
);

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

// Schedule certificate cleanup to run on weekdays at 3:45 PM
cron.schedule(
  "45 15 * * 1-5", // Runs at 3:45 PM Monday to Friday (1-5)
  async () => {
    try {
      console.log(
        "Running weekday certificate cleanup job at:",
        new Date().toLocaleString(),
      );
      await cleanupOldCertificates();
      console.log(
        "Weekday certificate cleanup job completed successfully at:",
        new Date().toLocaleString(),
      );
    } catch (error) {
      console.error("Error running weekday certificate cleanup job:", error);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Manila", // Philippines timezone
  },
);

// Start server - listen on all interfaces (0.0.0.0) to allow network access
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`CENRO Network: http://192.168.55.38:${PORT}`);
  console.log(`CGSJ_OSS Network: http://192.168.55.229:${PORT}`);
  console.log(`Any device on 192.168.55.x subnet can access the server`);
  console.log(`Server Hours: 7:00 AM - 4:00 PM Weekdays`);
  console.log(`Certificate cleanup scheduled: 3:45 PM Monday-Friday`);
});
