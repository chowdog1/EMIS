const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const nodemailer = require("nodemailer");
const Certificate = require("../models/certificate");
const User = require("../models/user");
const { PDFDocument } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const path = require("path");
const cron = require("node-cron");
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

// Cleanup function to remove old certificates data
async function cleanupOldCertificates() {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await Certificate.deleteMany({
      createdAt: { $lt: oneWeekAgo },
    });

    console.log(
      `Cleaned up ${result.deletedCount} certificates older than 1 week`,
    );
    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up old certificates:", error);
    return 0;
  }
}

// Get all certificates
router.get("/", async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 });
    res.json(certificates);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update certificate
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { accountNo, businessName, address, email, certificateDate } =
      req.body;

    if (!accountNo || !businessName || !address || !email || !certificateDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Update certificate fields
    certificate.accountNo = accountNo;
    certificate.businessName = businessName;
    certificate.address = address;
    certificate.email = email;
    certificate.certificateDate = new Date(certificateDate);

    await certificate.save();

    res.status(200).json({
      message: "Certificate updated successfully",
      certificate,
    });
  } catch (error) {
    console.error("Error updating certificate:", error);
    res.status(500).json({
      message: "Error updating certificate",
      error: error.message,
    });
  }
});

// Upload CSV file and save to database
router.post("/upload", verifyToken, upload.single("csvFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const results = [];
  let headerMap = {};
  console.log("Processing CSV file...");

  const fieldPossibleNames = {
    email: ["email", "e-mail", "emailaddress", "email address"],
    accountNo: [
      "account no",
      "account no.",
      "account number",
      "accountno",
      "account",
    ],
    businessName: [
      "businessname",
      "business name",
      "business",
      "company",
      "company name",
      "businessname",
    ],
    address: ["address", "location", "business address", "address"],
    certificateDate: [
      "date",
      "certificate date",
      "date of seminar",
      "date of participation",
    ],
  };

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("headers", (headers) => {
      const normalizedHeaders = headers.map((header) =>
        header.toLowerCase().replace(/[^a-z0-9]/g, ""),
      );

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
      const getEmail = () => {
        if (headerMap.email && data[headerMap.email]) {
          return data[headerMap.email].trim();
        }
        const emailVariations = ["email", "Email", "EMAIL", "e-mail", "E-Mail"];
        for (const key of emailVariations) {
          if (data[key]) return data[key].trim();
        }
        return "";
      };

      const getAccountNo = () => {
        if (headerMap.accountNo && data[headerMap.accountNo]) {
          return data[headerMap.accountNo].trim();
        }
        const accountVariations = [
          "accountNo",
          "Account No",
          "account no",
          "AccountNo",
          "account number",
          "Account Number",
          "account",
          "Account",
        ];
        for (const key of accountVariations) {
          if (data[key]) return data[key].trim();
        }
        return "";
      };

      const getBusinessName = () => {
        if (headerMap.businessName && data[headerMap.businessName]) {
          return data[headerMap.businessName].trim();
        }
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

      const getCertificateDate = () => {
        if (headerMap.certificateDate && data[headerMap.certificateDate]) {
          return new Date(data[headerMap.certificateDate].trim());
        }
        const dateVariations = [
          "date",
          "Date",
          "DATE",
          "date of participation",
          "date of seminar",
        ];
        for (const key of dateVariations) {
          if (data[key]) {
            const dateValue = data[key].trim();
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate;
            }
          }
        }
        return null;
      };

      const certificateData = {
        email: getEmail(),
        accountNo: getAccountNo(),
        businessName: getBusinessName(),
        address: getAddress(),
        certificateDate: getCertificateDate(),
        status: "for approval",
      };

      if (
        certificateData.email &&
        certificateData.businessName &&
        certificateData.certificateDate
      ) {
        results.push(certificateData);
      } else {
        console.log(
          "Skipping row with missing email, business name, or date:",
          data,
        );
      }
    })
    .on("end", async () => {
      try {
        console.log(
          "Finished processing CSV. Found",
          results.length,
          "valid records",
        );

        if (results.length === 0) {
          return res.status(400).json({
            message:
              "No valid records found in CSV file. Make sure to include email, business name, address and date columns",
          });
        }

        const savedCertificates = await Certificate.insertMany(results);
        console.log(
          "Saved certificates to database:",
          savedCertificates.length,
        );

        fs.unlinkSync(req.file.path);

        res.status(200).json({
          message: `File uploaded and ${savedCertificates.length} records saved successfully`,
          count: savedCertificates.length,
          newCertificates: savedCertificates, // Return new certificates
        });
      } catch (error) {
        console.error("Error saving certificate data:", error);
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

// Approve certificate with signature (admin only) - new endpoint
router.post("/approve-with-signature", verifyToken, async (req, res) => {
  try {
    const { certificateId, signatureBase64 } = req.body;
    if (!certificateId) {
      return res.status(400).json({ message: "Certificate ID is required" });
    }
    if (!signatureBase64) {
      return res.status(400).json({ message: "No signature image provided" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admin users can approve certificates" });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    if (certificate.status !== "for approval") {
      return res
        .status(400)
        .json({ message: "Certificate is not in approval status" });
    }

    const adminUser = await User.findById(req.user.userId);
    if (!adminUser) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    // Update certificate with approval info and signature
    certificate.status = "signed"; // Skip "for signatory" status
    certificate.approvedBy = req.user.userId;
    certificate.approvedAt = new Date();
    certificate.signedBy = req.user.userId;
    certificate.signedAt = new Date();
    certificate.signatureBase64 = signatureBase64;
    certificate.signatureName = `${adminUser.firstname} ${adminUser.lastname}`;

    await certificate.save();

    res.status(200).json({
      message: "Certificate approved and signed successfully",
      certificate,
    });
  } catch (error) {
    console.error("Error approving certificate with signature:", error);
    res.status(500).json({
      message: "Error approving certificate",
      error: error.message,
    });
  }
});

// Approve certificate (admin only) - updated to set status directly to "signed"
router.post("/approve", verifyToken, async (req, res) => {
  try {
    const { certificateId } = req.body;
    if (!certificateId) {
      return res.status(400).json({ message: "Certificate ID is required" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admin users can approve certificates" });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    if (certificate.status !== "for approval") {
      return res
        .status(400)
        .json({ message: "Certificate is not in approval status" });
    }

    const adminUser = await User.findById(req.user.userId);
    if (!adminUser) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    // Update status directly to "signed" instead of "for signatory"
    certificate.status = "signed";
    certificate.approvedBy = req.user.userId;
    certificate.approvedAt = new Date();
    certificate.signatureName = `${adminUser.firstname} ${adminUser.lastname}`;

    await certificate.save();

    res.status(200).json({
      message: "Certificate approved successfully",
      certificate,
    });
  } catch (error) {
    console.error("Error approving certificate:", error);
    res
      .status(500)
      .json({ message: "Error approving certificate", error: error.message });
  }
});

// Upload signature for certificate (admin only) - updated to handle direct signing
router.post("/upload-signature", verifyToken, async (req, res) => {
  try {
    const { certificateId, signatureBase64 } = req.body;
    if (!certificateId) {
      return res.status(400).json({ message: "Certificate ID is required" });
    }
    if (!signatureBase64) {
      return res.status(400).json({ message: "No signature image provided" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admin users can upload signatures" });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Allow signing if the certificate is either "for signatory" or "approved"
    if (
      certificate.status !== "for signatory" &&
      certificate.status !== "approved"
    ) {
      return res
        .status(400)
        .json({ message: "Certificate is not ready for signature" });
    }

    // Update certificate with base64 signature
    certificate.signatureBase64 = signatureBase64;
    certificate.signedBy = req.user.userId;
    certificate.signedAt = new Date();
    certificate.status = "signed";
    await certificate.save();

    res.status(200).json({
      message: "Signature uploaded successfully",
      certificate,
    });
  } catch (error) {
    console.error("Error uploading signature:", error);
    res
      .status(500)
      .json({ message: "Error uploading signature", error: error.message });
  }
});

// Preview endpoint - now uses base64
router.post("/preview", verifyToken, async (req, res) => {
  try {
    const { certificateId } = req.body;
    if (!certificateId) {
      return res.status(400).json({ message: "Certificate ID is required" });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Allow preview for signed, sent, or resent certificates
    if (
      certificate.status !== "signed" &&
      certificate.status !== "sent" &&
      certificate.status !== "resent"
    ) {
      return res.status(400).json({
        message: `Certificate must be signed, sent, or resent before previewing. Current status: ${certificate.status}`,
      });
    }

    // If PDF exists and is recent (within 30 days), return it
    if (
      certificate.pdfBase64 &&
      certificate.generatedAt &&
      certificate.generatedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ) {
      const fileName = `Certificate_${certificate.businessName.replace(
        /\s+/g,
        "_",
      )}.pdf`;
      return res.status(200).json({
        message: "Existing certificate preview retrieved successfully",
        fileName: fileName,
        pdfBase64: certificate.pdfBase64,
        certificate,
      });
    }

    // Otherwise generate new PDF
    console.log("Generating certificate PDF preview...");
    const pdfInfo = await fillCertificateTemplate(certificate);
    console.log(`Certificate PDF preview generated`);

    // Save base64 PDF to database
    certificate.pdfBase64 = pdfInfo.pdfBase64;
    certificate.generatedAt = new Date();
    await certificate.save();

    res.status(200).json({
      message: "Certificate preview generated successfully",
      fileName: pdfInfo.fileName,
      pdfBase64: pdfInfo.pdfBase64,
      certificate,
    });
  } catch (error) {
    console.error("Error previewing certificate:", error);
    res.status(500).json({
      message: "Error previewing certificate",
      error: error.message,
    });
  }
});

// Filling certificate template - now returns base64
async function fillCertificateTemplate(certificateData) {
  try {
    const templatePath = path.join(__dirname, "../certificate_template.pdf");
    if (!fs.existsSync(templatePath)) {
      throw new Error(
        "Certificate template not found. Please ensure 'certificate_template.pdf' is in the root directory.",
      );
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Register fontkit with the PDFDocument
    pdfDoc.registerFontkit(fontkit);

    // Load and embed the Rubik Bold font from the fonts folder
    const fontPath = path.join(__dirname, "../fonts/Rubik-Bold.ttf");
    if (!fs.existsSync(fontPath)) {
      throw new Error(
        "Rubik Bold font not found. Please ensure 'Rubik-Bold.ttf' is in the fonts directory.",
      );
    }

    const fontBytes = fs.readFileSync(fontPath);
    const rubikBoldFont = await pdfDoc.embedFont(fontBytes);

    const form = pdfDoc.getForm();

    // Get all fields in the form and log them for debugging
    const fields = form.getFields();
    console.log("=== ALL FIELDS IN TEMPLATE ===");
    fields.forEach((field) => {
      console.log(
        `Field: "${field.getName()}", Type: ${field.constructor.name}`,
      );
    });
    console.log("=== END FIELDS ===");

    // Format the certificate date from the data
    let formattedDate = "Date not available";
    if (certificateData.certificateDate) {
      try {
        const certDate =
          typeof certificateData.certificateDate === "string"
            ? new Date(certificateData.certificateDate)
            : certificateData.certificateDate;
        if (!isNaN(certDate.getTime())) {
          formattedDate = certDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      } catch (error) {
        console.error("Error formatting certificate date:", error);
      }
    }

    // Define the field mappings using the exact field names from your PDF
    const fieldMappings = {
      accountNo: certificateData.accountNo,
      businessName: certificateData.businessName,
      date: formattedDate,
    };

    // Try to fill each text field with custom font
    let fieldsFilled = 0;
    for (const [fieldName, value] of Object.entries(fieldMappings)) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value);
          field.updateAppearances(rubikBoldFont);
          fieldsFilled++;
          console.log(
            `✓ Filled field '${fieldName}' with value: ${value} using Rubik Bold font`,
          );
        } else {
          console.warn(`✗ Field '${fieldName}' not found in template`);
        }
      } catch (error) {
        console.error(`✗ Error filling field '${fieldName}':`, error.message);
      }
    }

    // Handle address field with word boundary breaks and upward adjustment
    try {
      const addressField = form.getTextField("address");
      if (addressField) {
        const address = certificateData.address;
        const maxLineLength = 70;

        // Split address into lines with word boundary breaks
        const words = address.split(" ");
        const lines = [];
        let currentLine = "";

        for (const word of words) {
          if (currentLine.length + word.length + 1 > maxLineLength) {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = "";
            }
            if (word.length > maxLineLength) {
              for (let i = 0; i < word.length; i += maxLineLength) {
                lines.push(word.substring(i, i + maxLineLength));
              }
            } else {
              currentLine = word;
            }
          } else {
            if (currentLine) {
              currentLine += " " + word;
            } else {
              currentLine = word;
            }
          }
        }

        if (currentLine) {
          lines.push(currentLine);
        }

        const formattedAddress = "\n" + lines.join("\n");
        addressField.setText(formattedAddress);

        // Get the field's widget to adjust its position
        const widgets = addressField.acroField.getWidgets();
        if (widgets.length > 0) {
          const widget = widgets[0];
          const rect = widget.getRectangle();
          const fontSize = 12;
          const lineHeight = fontSize * 1.2;
          const upwardAdjustment = (lines.length - 1) * lineHeight;
          const adjustedRect = {
            x: rect.x,
            y: rect.y + upwardAdjustment,
            width: rect.width,
            height: rect.height,
          };
          widget.setRectangle(adjustedRect);
          console.log(
            `Address field moved upward by ${upwardAdjustment} points to accommodate ${lines.length} lines`,
          );
        }

        addressField.updateAppearances(rubikBoldFont);
        fieldsFilled++;
        console.log(
          `✓ Filled address field with word boundary breaks and upward adjustment`,
        );
      } else {
        console.warn("✗ Address field not found in template");
      }
    } catch (error) {
      console.error("✗ Error handling address field:", error);
    }

    // Handle signature field - using base64 if available
    if (certificateData.signatureBase64) {
      try {
        console.log("Embedding base64 signature...");
        const signatureImageBytes = Buffer.from(
          certificateData.signatureBase64,
          "base64",
        );
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

        // Get the first page of the PDF
        const page = pdfDoc.getPages()[0];
        const { width, height } = page.getSize();

        // Position signature (centered and 2 inches from bottom)
        const twoInchesFromBottom = 184;
        const signatureWidth = 180;
        const signatureHeight = 95;
        const centeredX = (width - signatureWidth) / 2;
        const signaturePosition = {
          x: centeredX,
          y: twoInchesFromBottom,
          width: signatureWidth,
          height: signatureHeight,
        };

        console.log("Using manual signature coordinates:", signaturePosition);

        // Draw the signature image at the specified position
        page.drawImage(signatureImage, {
          x: signaturePosition.x,
          y: signaturePosition.y,
          width: signaturePosition.width,
          height: signaturePosition.height,
        });

        console.log("✓ Embedded signature from base64");

        // Try to remove any existing signature fields
        try {
          const signatureFieldNames = [
            "signature",
            "Signature",
            "signature_field",
            "Signature_Field",
            "sig",
            "Sig",
            "sign",
            "Sign",
            "SignatureField",
            "signatureField",
          ];

          for (const fieldName of signatureFieldNames) {
            try {
              const field = form.getTextField(fieldName);
              if (field) {
                field.remove();
                console.log(
                  `✓ Removed existing signature field: "${fieldName}"`,
                );
              }
            } catch (e) {
              // Not a text field, try next
            }

            try {
              const field = form.getButton(fieldName);
              if (field) {
                field.remove();
                console.log(
                  `✓ Removed existing signature button field: "${fieldName}"`,
                );
              }
            } catch (e) {
              // Not a button field, try next
            }

            try {
              const field = form.getSignatureField(fieldName);
              if (field) {
                field.remove();
                console.log(
                  `✓ Removed existing signature field: "${fieldName}"`,
                );
              }
            } catch (e) {
              // Not a signature field, try next
            }
          }
        } catch (e) {
          console.log("Error removing existing signature fields:", e.message);
        }
      } catch (error) {
        console.error(`✗ Error handling signature:`, error);
      }
    } else {
      console.log("No signature base64 provided for this certificate");
    }

    if (fieldsFilled === 0) {
      console.warn(
        "✗ No form fields were filled. Please check your PDF template field names.",
      );
      console.log(
        "Available fields:",
        fields.map((field) => field.getName()),
      );
    }

    // Flatten the form to prevent further editing
    form.flatten();

    const pdfBytes = await pdfDoc.save();

    // Convert to base64 instead of saving to file
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const fileName = `Certificate_of_Participation_${certificateData.businessName.replace(
      /\s+/g,
      "_",
    )}.pdf`;

    console.log(`✓ Certificate generated as base64: ${fileName}`);

    return {
      fileName,
      pdfBase64,
    };
  } catch (error) {
    console.error("✗ Error filling certificate template:", error);
    throw error;
  }
}

// Send certificate for a single participant - now uses base64
router.post("/send", verifyToken, async (req, res) => {
  try {
    const { certificateId, subject, body, template } = req.body;
    if (!certificateId) {
      return res.status(400).json({ message: "Certificate ID is required" });
    }
    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and body are required" });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Check if certificate is signed
    if (certificate.status !== "signed") {
      return res.status(400).json({
        message: `Certificate must be signed before sending. Current status: ${certificate.status}`,
      });
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

    // Generate the certificate PDF if not exists or expired
    if (
      !certificate.pdfBase64 ||
      !certificate.generatedAt ||
      certificate.generatedAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ) {
      console.log("Generating certificate PDF...");
      const pdfInfo = await fillCertificateTemplate(certificate);
      certificate.pdfBase64 = pdfInfo.pdfBase64;
      certificate.generatedAt = new Date();
      console.log(`Certificate PDF generated and stored as base64`);
    }

    // Update the certificate with send info
    certificate.sentBy = req.user.userId;
    certificate.sentAt = new Date();
    certificate.status = "sent";
    await certificate.save();

    // Format the certificate date
    let formattedDate = "Date not available";
    if (certificate.certificateDate) {
      try {
        const certDate =
          typeof certificate.certificateDate === "string"
            ? new Date(certificate.certificateDate)
            : certificate.certificateDate;
        if (!isNaN(certDate.getTime())) {
          formattedDate = certDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      } catch (error) {
        console.error("Error formatting certificate date:", error);
      }
    }

    // Get current year for footer
    const currentYear = new Date().getFullYear();

    // Personalize the email body
    const personalizedBody = body
      .replace(/{{businessName}}/g, certificate.businessName)
      .replace(/{{accountNo}}/g, certificate.accountNo)
      .replace(/{{address}}/g, certificate.address)
      .replace(/{{certificateDate}}/g, formattedDate)
      .replace(/{{currentYear}}/g, currentYear);

    // Check if ordinance file exists
    const ordinancePath = path.join(
      __dirname,
      "../City Ordinance No. 57 Series of 2024.pdf",
    );
    console.log("Checking ordinance at:", ordinancePath);

    if (!fs.existsSync(ordinancePath)) {
      console.error("Ordinance file not found at:", ordinancePath);
      return res.status(500).json({
        message:
          "Ordinance file not found. Please check the path: " + ordinancePath,
      });
    }

    // Create email options with base64 PDF attachment
    const mailOptions = {
      from: `"CENRO San Juan City" <${process.env.EMAIL_USER}>`,
      to: certificate.email,
      subject: subject,
      html: personalizedBody,
      attachments: [
        {
          filename: `Certificate_${certificate.businessName.replace(
            /\s+/g,
            "_",
          )}.pdf`,
          content: Buffer.from(certificate.pdfBase64, "base64"),
        },
        {
          filename: "City Ordinance No. 57 Series of 2024.pdf",
          path: ordinancePath,
        },
      ],
    };

    console.log(
      `Sending certificate to ${certificate.email} (${certificate.businessName})`,
    );

    await transporter.sendMail(mailOptions);

    console.log(`Certificate sent successfully to ${certificate.email}`);

    res.status(200).json({
      message: `Certificate sent successfully to ${certificate.businessName}`,
    });
  } catch (error) {
    console.error("Error sending certificate:", error);
    res.status(500).json({
      message: "Error sending certificate",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Resend certificate for a single participant - now uses base64
router.post("/resend", verifyToken, async (req, res) => {
  try {
    const { certificateId, subject, body, template } = req.body;
    if (!certificateId || !subject || !body) {
      return res
        .status(400)
        .json({ message: "Certificate ID, subject, and body are required" });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Generate PDF if not exists or expired
    if (
      !certificate.pdfBase64 ||
      !certificate.generatedAt ||
      certificate.generatedAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ) {
      console.log(
        "Certificate PDF not found or expired, generating new one...",
      );
      const pdfInfo = await fillCertificateTemplate(certificate);
      certificate.pdfBase64 = pdfInfo.pdfBase64;
      certificate.generatedAt = new Date();
      await certificate.save();
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

    // Format the certificate date
    let formattedDate = "Date not available";
    if (certificate.certificateDate) {
      try {
        const certDate =
          typeof certificate.certificateDate === "string"
            ? new Date(certificate.certificateDate)
            : certificate.certificateDate;
        if (!isNaN(certDate.getTime())) {
          formattedDate = certDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      } catch (error) {
        console.error("Error formatting certificate date:", error);
      }
    }

    // Get current year for footer
    const currentYear = new Date().getFullYear();

    // Personalize the email body
    const personalizedBody = body
      .replace(/{{businessName}}/g, certificate.businessName)
      .replace(/{{accountNo}}/g, certificate.accountNo)
      .replace(/{{address}}/g, certificate.address)
      .replace(/{{certificateDate}}/g, formattedDate)
      .replace(/{{currentYear}}/g, currentYear);

    // Check if ordinance file exists
    const ordinancePath = path.join(
      __dirname,
      "../City Ordinance No. 57 Series of 2024.pdf",
    );
    console.log("Checking ordinance at:", ordinancePath);

    if (!fs.existsSync(ordinancePath)) {
      console.error("Ordinance file not found at:", ordinancePath);
      return res.status(500).json({
        message:
          "Ordinance file not found. Please check the path: " + ordinancePath,
      });
    }

    // Create email options with base64 PDF attachment
    const mailOptions = {
      from: `"CENRO San Juan City" <${process.env.EMAIL_USER}>`,
      to: certificate.email,
      subject: subject,
      html: personalizedBody,
      attachments: [
        {
          filename: `Certificate_${certificate.businessName.replace(
            /\s+/g,
            "_",
          )}.pdf`,
          content: Buffer.from(certificate.pdfBase64, "base64"),
        },
        {
          filename: "City Ordinance No. 57 Series of 2024.pdf",
          path: ordinancePath,
        },
      ],
    };

    console.log(
      `Resending certificate to ${certificate.email} (${certificate.businessName})`,
    );

    await transporter.sendMail(mailOptions);

    console.log(`Certificate resent successfully to ${certificate.email}`);

    // Update the certificate status to "resent"
    certificate.resentBy = req.user.userId;
    certificate.resentAt = new Date();
    certificate.status = "resent";
    await certificate.save();

    console.log(`Updated status for ${certificate.email} to 'resent'`);

    res.status(200).json({
      message: `Certificate resent successfully to ${certificate.businessName}`,
    });
  } catch (error) {
    console.error("Error resending certificate:", error);
    res.status(500).json({
      message: "Error resending certificate",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Debug endpoint to check form fields in template
router.get("/debug-template", verifyToken, async (req, res) => {
  try {
    const templatePath = path.join(__dirname, "../certificate_template.pdf");
    if (!fs.existsSync(templatePath)) {
      return res
        .status(404)
        .json({ message: "Certificate template not found" });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const fieldInfo = fields.map((field) => ({
      name: field.getName(),
      type: field.constructor.name,
    }));

    res.json({
      message: "Template loaded successfully",
      fields: fieldInfo,
    });
  } catch (error) {
    console.error("Error debugging template:", error);
    res
      .status(500)
      .json({ message: "Error debugging template", error: error.message });
  }
});

// Enhanced debug endpoint to test filling a specific certificate
router.post("/test-fill", verifyToken, async (req, res) => {
  try {
    const { businessName, accountNo, address } = req.body;
    if (!businessName || !accountNo || !address) {
      return res
        .status(400)
        .json({ message: "businessName, accountNo, and address are required" });
    }

    const certificateData = {
      businessName,
      accountNo,
      address,
    };

    const pdfInfo = await fillCertificateTemplate(certificateData);

    res.json({
      message: "Test certificate generated successfully",
      fileName: pdfInfo.fileName,
    });
  } catch (error) {
    console.error("Error in test fill:", error);
    res.status(500).json({
      message: "Error generating test certificate",
      error: error.message,
    });
  }
});

module.exports = {
  router,
  cleanupOldCertificates,
};
