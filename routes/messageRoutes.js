// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Message = require("../models/message");
const { verifyToken } = require("../middleware/authMiddleware");

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Get messages between two users
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.userId;
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId },
      ],
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send a message
router.post("/", verifyToken, async (req, res) => {
  try {
    const { recipientId, content, type } = req.body;
    const senderId = req.user.userId;
    const message = new Message({
      senderId,
      recipientId,
      content,
      type: type || "text",
      status: "sent", // Set initial status
    });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Upload an image for a message
router.post(
  "/upload-image",
  verifyToken,
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  }
);

// Update message status
router.put("/:messageId/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { status },
      { new: true }
    );
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    res.json(message);
  } catch (error) {
    console.error("Error updating message status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete conversation between two users
router.delete("/conversation/:userId", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.userId;

    console.log(
      `Attempting to delete conversation between ${currentUserId} and ${otherUserId}`
    );

    // Delete all messages between the two users
    const result = await Message.deleteMany({
      $or: [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId },
      ],
    });

    console.log(
      `Deleted ${result.deletedCount} messages between users ${currentUserId} and ${otherUserId}`
    );

    res.json({
      success: true,
      message: "Conversation deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
