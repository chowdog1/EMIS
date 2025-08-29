const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const nodemailer = require("nodemailer");
const Seminar2025 = require("../models/seminar2025");
require("dotenv").config();

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Create email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Get all seminars for 2025
router.get("/", async (req, res) => {
  try {
    const seminars = await Seminar2025.find().sort({ createdAt: -1 });
    res.json(seminars);
  } catch (error) {
    console.error("Error fetching 2025 seminars:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Upload CSV file and save to database
router.post("/upload", verifyToken, upload.single("csvFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const results = [];
  let headerMap = {}; // Will store mapping of normalized headers to actual headers

  console.log("Processing CSV file...");

  // Define possible header variations for each field
  const fieldPossibleNames = {
    email: ["email", "e-mail", "emailaddress", "email address"],
    businessName: [
      "businessname",
      "business name",
      "business",
      "company",
      "company name",
      "businessname",
    ],
    address: ["address", "location", "business address", "address"],
  };

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("headers", (headers) => {
      // Normalize headers (lowercase, remove special characters)
      const normalizedHeaders = headers.map((header) =>
        header.toLowerCase().replace(/[^a-z0-9]/g, "")
      );

      // Create mapping from our field names to actual CSV headers
      for (const [field, possibleNames] of Object.entries(fieldPossibleNames)) {
        for (const name of possibleNames) {
          const normalizedName = name.replace(/[^a-z0-9]/g, "");
          const index = normalizedHeaders.indexOf(normalizedName);
          if (index !== -1) {
            headerMap[field] = headers[index];
            break;
          }
        }
      }

      console.log("Header mapping:", headerMap);
    })
    .on("data", (data) => {
      // Log each row for debugging
      console.log("Raw CSV row:", data);

      // Get values using our header mapping
      const getEmail = () => {
        if (headerMap.email && data[headerMap.email]) {
          return data[headerMap.email].trim();
        }
        // Fallback: try common email variations directly
        const emailVariations = ["email", "Email", "EMAIL", "e-mail", "E-Mail"];
        for (const key of emailVariations) {
          if (data[key]) return data[key].trim();
        }
        return "";
      };

      const getBusinessName = () => {
        if (headerMap.businessName && data[headerMap.businessName]) {
          return data[headerMap.businessName].trim();
        }
        // Fallback: try common business name variations
        const bizVariations = [
          "businessName",
          "Business Name",
          "business name",
          "BusinessName",
          "businessname",
          "Business",
          "business",
        ];
        for (const key of bizVariations) {
          if (data[key]) return data[key].trim();
        }
        return "";
      };

      const getAddress = () => {
        if (headerMap.address && data[headerMap.address]) {
          return data[headerMap.address].trim();
        }
        // Fallback: try common address variations
        const addressVariations = [
          "address",
          "Address",
          "ADDRESS",
          "location",
          "Location",
        ];
        for (const key of addressVariations) {
          if (data[key]) return data[key].trim();
        }
        return "";
      };

      // Transform data to match schema
      const seminarData = {
        email: getEmail(),
        businessName: getBusinessName(),
        address: getAddress(),
        status: "uploaded",
      };

      // Log the transformed data
      console.log("Transformed data:", seminarData);

      // Only add if we have at least an email
      if (seminarData.email) {
        results.push(seminarData);
      } else {
        console.log("Skipping row with no email:", data);
      }
    })
    .on("end", async () => {
      try {
        console.log(
          "Finished processing CSV. Found",
          results.length,
          "valid records"
        );
        console.log("Results array:", results);

        if (results.length === 0) {
          return res
            .status(400)
            .json({ message: "No valid records found in CSV file" });
        }

        // Save to database
        const savedSeminars = await Seminar2025.insertMany(results);
        console.log("Saved seminars to database:", savedSeminars.length);

        // Delete the temporary file
        fs.unlinkSync(req.file.path);

        res.status(200).json({
          message: `File uploaded and ${savedSeminars.length} records saved successfully`,
          count: savedSeminars.length,
        });
      } catch (error) {
        console.error("Error saving seminar data:", error);
        res
          .status(500)
          .json({ message: "Error saving data", error: error.message });
      }
    })
    .on("error", (error) => {
      console.error("Error processing CSV:", error);
      res
        .status(500)
        .json({ message: "Error processing CSV file", error: error.message });
    });
});

// Send invitations for 2025
router.post("/send-invitations", verifyToken, async (req, res) => {
  try {
    console.log("Received request to send invitations");
    console.log("Request body:", req.body);
    const { subject, body, seminarDetails } = req.body;
    if (!subject || !body) {
      console.log("Missing subject or body");
      return res.status(400).json({ message: "Subject and body are required" });
    }

    // Find all seminars that haven't had invitations sent
    console.log("Finding seminars with status 'uploaded'");
    const seminars = await Seminar2025.find({ status: "uploaded" });
    console.log(`Found ${seminars.length} seminars to send invitations to`);

    if (seminars.length === 0) {
      return res
        .status(200)
        .json({ message: "No seminars to send invitations to" });
    }

    // Create email transporter
    const transporter = createEmailTransporter();

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log("SMTP server connection successful");
    } catch (error) {
      console.error("SMTP connection error:", error);
      return res
        .status(500)
        .json({ message: "Email configuration error", error: error.message });
    }

    // Check if email credentials are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Email credentials not set in environment variables");
      return res
        .status(500)
        .json({ message: "Email credentials not configured" });
    }

    // Send emails and update status
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const seminar of seminars) {
      try {
        // Personalize the email body with business name and address
        let personalizedBody = body;
        personalizedBody = personalizedBody.replace(
          /{{businessName}}/g,
          seminar.businessName
        );
        personalizedBody = personalizedBody.replace(
          /{{address}}/g,
          seminar.address
        );

        const mailOptions = {
          from: `"CENRO San Juan City" <${process.env.EMAIL_USER}>`,
          to: seminar.email,
          subject: subject,
          html: personalizedBody,
        };

        console.log(
          `Sending email to ${seminar.email} (${seminar.businessName})`
        );

        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${seminar.email}`);

        // Update seminar status
        seminar.status = "invitation sent";
        await seminar.save();
        console.log(`Updated status for ${seminar.email} to 'invitation sent'`);

        successCount++;
      } catch (emailError) {
        console.error(`Error sending email to ${seminar.email}:`, emailError);
        errorCount++;
        errors.push({
          email: seminar.email,
          businessName: seminar.businessName,
          error: emailError.message,
        });
      }
    }

    const resultMessage = `Invitations sent to ${successCount} businesses`;
    const errorMessage =
      errorCount > 0 ? `Failed to send to ${errorCount} businesses` : "";

    console.log(
      `Email sending completed. Success: ${successCount}, Errors: ${errorCount}`
    );

    res.status(200).json({
      message: resultMessage,
      error: errorMessage,
      errors: errors,
      successCount,
      errorCount,
      seminarDetails: seminarDetails,
    });
  } catch (error) {
    console.error("Error sending invitations:", error);
    res
      .status(500)
      .json({ message: "Error sending invitations", error: error.message });
  }
});

// Resend invitation for a single seminar
router.post("/resend-invitation", verifyToken, async (req, res) => {
  try {
    console.log("Received request to resend invitation");
    console.log("Request body:", req.body);
    const { email, subject, body, seminarDetails } = req.body;
    if (!email || !subject || !body) {
      console.log("Missing required fields");
      return res
        .status(400)
        .json({ message: "Email, subject, and body are required" });
    }

    // Find the seminar by email
    const seminar = await Seminar2025.findOne({ email: email });
    if (!seminar) {
      console.log(`Seminar not found for email: ${email}`);
      return res.status(404).json({ message: "Seminar not found" });
    }

    console.log(`Found seminar: ${seminar.businessName} (${email})`);

    // Create email transporter
    const transporter = createEmailTransporter();

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log("SMTP server connection successful");
    } catch (error) {
      console.error("SMTP connection error:", error);
      return res
        .status(500)
        .json({ message: "Email configuration error", error: error.message });
    }

    // Check if email credentials are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Email credentials not set in environment variables");
      return res
        .status(500)
        .json({ message: "Email credentials not configured" });
    }

    // Personalize the email body with business name and address
    let personalizedBody = body;
    personalizedBody = personalizedBody.replace(
      /{{businessName}}/g,
      seminar.businessName
    );
    personalizedBody = personalizedBody.replace(
      /{{address}}/g,
      seminar.address
    );

    const mailOptions = {
      from: `"CENRO San Juan City" <${process.env.EMAIL_USER}>`,
      to: seminar.email,
      subject: subject,
      html: personalizedBody,
    };

    console.log(
      `Resending email to ${seminar.email} (${seminar.businessName})`
    );

    await transporter.sendMail(mailOptions);
    console.log(`Email resent successfully to ${seminar.email}`);

    // Update the seminar status to "invitation resent"
    seminar.status = "invitation resent";
    await seminar.save();
    console.log(`Updated status for ${seminar.email} to 'invitation resent'`);

    res.status(200).json({
      message: `Invitation resent successfully to ${seminar.businessName}`,
      seminarDetails: seminarDetails,
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    res
      .status(500)
      .json({ message: "Error resending invitation", error: error.message });
  }
});

// Test email route
router.post("/test-email", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Create email transporter
    const transporter = createEmailTransporter();

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log("SMTP server connection successful");
    } catch (error) {
      console.error("SMTP connection error:", error);
      return res
        .status(500)
        .json({ message: "Email configuration error", error: error.message });
    }

    // Check if email credentials are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Email credentials not set in environment variables");
      return res
        .status(500)
        .json({ message: "Email credentials not configured" });
    }

    const mailOptions = {
      from: `"CENRO San Juan City" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Test Email from CENRO",
      html: `<p>This is a test email from CENRO San Juan City.</p>`,
    };

    console.log(`Sending test email to ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`Test email sent successfully to ${email}`);

    res.status(200).json({ message: `Test email sent to ${email}` });
  } catch (error) {
    console.error("Error sending test email:", error);
    res
      .status(500)
      .json({ message: "Error sending test email", error: error.message });
  }
});

module.exports = router;
