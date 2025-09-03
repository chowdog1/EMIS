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
const path = require("path");
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
        header.toLowerCase().replace(/[^a-z0-9]/g, "")
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
        return null; // Return null if no valid date found
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
          data
        );
      }
    })
    .on("end", async () => {
      try {
        console.log(
          "Finished processing CSV. Found",
          results.length,
          "valid records"
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
          savedCertificates.length
        );
        fs.unlinkSync(req.file.path);
        res.status(200).json({
          message: `File uploaded and ${savedCertificates.length} records saved successfully`,
          count: savedCertificates.length,
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

// Approve certificate (admin only) - now sets status to "for signatory"
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
    // Update status to "for signatory" instead of "approved"
    certificate.status = "for signatory";
    certificate.approvedBy = req.user.userId;
    certificate.approvedAt = new Date();
    certificate.signatureName = `${adminUser.firstname} ${adminUser.lastname}`;
    await certificate.save();
    res.status(200).json({
      message: "Certificate approved and ready for signature",
      certificate,
    });
  } catch (error) {
    console.error("Error approving certificate:", error);
    res
      .status(500)
      .json({ message: "Error approving certificate", error: error.message });
  }
});

// Upload signature for certificate (admin only)
router.post(
  "/upload-signature",
  verifyToken,
  upload.single("signatureImage"),
  async (req, res) => {
    try {
      const { certificateId } = req.body;
      if (!certificateId) {
        return res.status(400).json({ message: "Certificate ID is required" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No signature image uploaded" });
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
      if (certificate.status !== "for signatory") {
        return res
          .status(400)
          .json({ message: "Certificate is not ready for signature" });
      }
      // Create signatures directory if it doesn't exist
      const signaturesDir = path.join(__dirname, "../signatures");
      if (!fs.existsSync(signaturesDir)) {
        fs.mkdirSync(signaturesDir);
      }
      // Generate unique filename for signature
      const fileName = `signature_${
        certificate._id
      }_${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(signaturesDir, fileName);
      // Move the uploaded file to the signatures directory
      fs.renameSync(req.file.path, filePath);
      // Update certificate with signature info
      certificate.signatureImage = `/signatures/${fileName}`;
      certificate.signedBy = req.user.userId;
      certificate.signedAt = new Date();
      certificate.status = "signed";
      await certificate.save();
      res.status(200).json({
        message: "Signature uploaded successfully",
        signaturePath: certificate.signatureImage,
        certificate,
      });
    } catch (error) {
      console.error("Error uploading signature:", error);
      res
        .status(500)
        .json({ message: "Error uploading signature", error: error.message });
    }
  }
);

//Preview endpoint
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

    // If certificate is already sent/resent, use existing PDF
    if (certificate.status === "sent" || certificate.status === "resent") {
      if (
        !certificate.certificatePath ||
        !fs.existsSync(certificate.certificatePath)
      ) {
        // If PDF doesn't exist, generate a new one
        console.log("Existing PDF not found, generating new one...");
        const pdfInfo = await fillCertificateTemplate(certificate);
        certificate.certificatePath = pdfInfo.filePath;
        await certificate.save();
      }

      // Read the existing PDF file and convert to base64
      const pdfBuffer = fs.readFileSync(certificate.certificatePath);
      const pdfBase64 = pdfBuffer.toString("base64");
      const fileName = path.basename(certificate.certificatePath);

      return res.status(200).json({
        message: "Existing certificate preview retrieved successfully",
        fileName: fileName,
        pdfBase64: pdfBase64,
        certificate,
      });
    }

    // For signed certificates, generate new PDF
    console.log("Generating certificate PDF preview...");
    const pdfInfo = await fillCertificateTemplate(certificate);
    console.log(`Certificate PDF preview generated: ${pdfInfo.filePath}`);

    // Read the generated PDF file and convert to base64
    const pdfBuffer = fs.readFileSync(pdfInfo.filePath);
    const pdfBase64 = pdfBuffer.toString("base64");

    res.status(200).json({
      message: "Certificate preview generated successfully",
      fileName: pdfInfo.fileName,
      pdfBase64: pdfBase64,
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

async function fillCertificateTemplate(certificateData) {
  try {
    const templatePath = path.join(__dirname, "../certificate_template.pdf");
    if (!fs.existsSync(templatePath)) {
      throw new Error(
        "Certificate template not found. Please ensure 'certificate_template.pdf' is in the root directory."
      );
    }
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    // Get all fields in the form and log them for debugging
    const fields = form.getFields();
    console.log("=== ALL FIELDS IN TEMPLATE ===");
    fields.forEach((field) => {
      console.log(
        `Field: "${field.getName()}", Type: ${field.constructor.name}`
      );
    });
    console.log("=== END FIELDS ===");

    // Format the certificate date from the data - handle potential non-Date object
    let formattedDate = "Date not available";
    if (certificateData.certificateDate) {
      try {
        // If it's a string, convert to Date object
        const certDate =
          typeof certificateData.certificateDate === "string"
            ? new Date(certificateData.certificateDate)
            : certificateData.certificateDate;

        // Check if it's a valid Date
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
      address: certificateData.address,
      date: formattedDate,
    };

    // Try to fill each text field
    let fieldsFilled = 0;
    for (const [fieldName, value] of Object.entries(fieldMappings)) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value);
          fieldsFilled++;
          console.log(`✓ Filled field '${fieldName}' with value: ${value}`);
        } else {
          console.warn(`✗ Field '${fieldName}' not found in template`);
        }
      } catch (error) {
        console.error(`✗ Error filling field '${fieldName}':`, error.message);
      }
    }

    // Handle signature field - using manual positioning
    if (certificateData.signatureImage) {
      try {
        // Construct the full path to the signature image
        const signaturePath = path.join(
          __dirname,
          "..",
          certificateData.signatureImage
        );
        console.log("Looking for signature at:", signaturePath);
        if (fs.existsSync(signaturePath)) {
          console.log("✓ Signature file found, embedding...");
          const signatureImageBytes = fs.readFileSync(signaturePath);
          const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
          // Get the first page of the PDF
          const page = pdfDoc.getPages()[0];
          const { width, height } = page.getSize();
          // A4 paper dimensions: 210mm x 297mm
          // 1 inch = 25.4mm = 72 points
          // 2 inches = 144 points from the bottom
          const twoInchesFromBottom = 184;
          // Signature dimensions
          const signatureWidth = 180;
          const signatureHeight = 95;
          // Calculate centered position
          const centeredX = (width - signatureWidth) / 2;
          // Set signature position (centered and 2 inches from bottom)
          const signaturePosition = {
            x: centeredX,
            y: twoInchesFromBottom,
            width: signatureWidth,
            height: signatureHeight,
          };
          console.log("Using manual signature coordinates:", signaturePosition);
          console.log(`Page dimensions: ${width} x ${height} points`);
          // Draw the signature image at the specified position
          page.drawImage(signatureImage, {
            x: signaturePosition.x,
            y: signaturePosition.y,
            width: signaturePosition.width,
            height: signaturePosition.height,
          });
          console.log("✓ Embedded signature at manual position");
          // Try to remove any existing signature fields if they exist
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
                    `✓ Removed existing signature field: "${fieldName}"`
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
                    `✓ Removed existing signature button field: "${fieldName}"`
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
                    `✓ Removed existing signature field: "${fieldName}"`
                  );
                }
              } catch (e) {
                // Not a signature field, try next
              }
            }
          } catch (e) {
            console.log("Error removing existing signature fields:", e.message);
          }
        } else {
          console.warn(`✗ Signature image file not found at: ${signaturePath}`);
          // List files in signatures directory for debugging
          const signaturesDir = path.join(__dirname, "..", "signatures");
          if (fs.existsSync(signaturesDir)) {
            const files = fs.readdirSync(signaturesDir);
            console.log("Files in signatures directory:", files);
          } else {
            console.log(
              "✗ Signatures directory does not exist:",
              signaturesDir
            );
          }
        }
      } catch (error) {
        console.error(`✗ Error handling signature:`, error);
      }
    } else {
      console.log("No signature image provided for this certificate");
    }

    if (fieldsFilled === 0) {
      console.warn(
        "✗ No form fields were filled. Please check your PDF template field names."
      );
      console.log(
        "Available fields:",
        fields.map((field) => field.getName())
      );
    }

    // Flatten the form to prevent further editing
    form.flatten();
    const pdfBytes = await pdfDoc.save();
    const certificatesDir = path.join(__dirname, "../certificates");
    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir);
    }
    const fileName = `Certificate_of_Participation_${certificateData.businessName.replace(
      /\s+/g,
      "_"
    )}_${Date.now()}.pdf`;
    const filePath = path.join(certificatesDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);
    console.log(`✓ Certificate generated: ${fileName}`);
    return {
      fileName,
      filePath,
      url: `/certificates/${fileName}`,
    };
  } catch (error) {
    console.error("✗ Error filling certificate template:", error);
    throw error;
  }
}

// Send certificate for a single participant
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
    // Check if certificate is signed (not just approved)
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
    // Generate the certificate PDF using the template
    console.log("Generating certificate PDF...");
    const pdfInfo = await fillCertificateTemplate(certificate);
    console.log(`Certificate PDF generated: ${pdfInfo.filePath}`);
    // Update the certificate with the PDF path and send info
    certificate.certificatePath = pdfInfo.filePath;
    certificate.sentBy = req.user.userId;
    certificate.sentAt = new Date();
    certificate.status = "sent"; // Set status to "sent"
    await certificate.save();

    // Format the certificate date
    let formattedDate = "Date not available";
    if (certificate.certificateDate) {
      try {
        // If it's a string, convert to Date object
        const certDate =
          typeof certificate.certificateDate === "string"
            ? new Date(certificate.certificateDate)
            : certificate.certificateDate;

        // Check if it's a valid Date
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

    //Get current year for footer
    const currentYear = new Date().getFullYear();

    // Personalize the email body
    const personalizedBody = body
      .replace(/{{businessName}}/g, certificate.businessName)
      .replace(/{{accountNo}}/g, certificate.accountNo)
      .replace(/{{address}}/g, certificate.address)
      .replace(/{{certificateDate}}/g, formattedDate)
      .replace(/{{currentYear}}/g, currentYear);

    // Check if logo file exists
    const logoPath = path.join(__dirname, "../public/cenro logo.png");
    console.log("Checking logo at:", logoPath);
    if (!fs.existsSync(logoPath)) {
      console.error("Logo file not found at:", logoPath);
      return res.status(500).json({
        message: "Logo file not found. Please check the path: " + logoPath,
      });
    }

    // Check if ordinance file exists
    const ordinancePath = path.join(
      __dirname,
      "../City Ordinance No. 57 Series of 2024.pdf"
    );
    console.log("Checking ordinance at:", ordinancePath);
    if (!fs.existsSync(ordinancePath)) {
      console.error("Ordinance file not found at:", ordinancePath);
      return res.status(500).json({
        message:
          "Ordinance file not found. Please check the path: " + ordinancePath,
      });
    }

    // Create email options with attachments and embedded image
    const mailOptions = {
      from: `"CENRO San Juan City" <${process.env.EMAIL_USER}>`,
      to: certificate.email,
      subject: subject,
      html: personalizedBody,
      attachments: [
        {
          filename: pdfInfo.fileName,
          path: pdfInfo.filePath,
        },
        {
          filename: "City Ordinance No. 57 Series of 2024.pdf",
          path: ordinancePath,
        },
      ],
    };

    console.log(
      `Sending certificate to ${certificate.email} (${certificate.businessName})`
    );

    await transporter.sendMail(mailOptions);
    console.log(`Certificate sent successfully to ${certificate.email}`);

    res.status(200).json({
      message: `Certificate sent successfully to ${certificate.businessName}`,
      certificatePath: pdfInfo.filePath,
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

// Resend certificate for a single participant
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

    // Check if certificate has a generated PDF
    if (
      !certificate.certificatePath ||
      !fs.existsSync(certificate.certificatePath)
    ) {
      // If not, generate a new one
      console.log("Certificate PDF not found, generating new one...");
      const pdfInfo = await fillCertificateTemplate(certificate);
      certificate.certificatePath = pdfInfo.filePath;
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
        // If it's a string, convert to Date object
        const certDate =
          typeof certificate.certificateDate === "string"
            ? new Date(certificate.certificateDate)
            : certificate.certificateDate;
        // Check if it's a valid Date
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

    // Personalize the email body with all placeholders
    const personalizedBody = body
      .replace(/{{businessName}}/g, certificate.businessName)
      .replace(/{{accountNo}}/g, certificate.accountNo)
      .replace(/{{address}}/g, certificate.address)
      .replace(/{{certificateDate}}/g, formattedDate)
      .replace(/{{currentYear}}/g, currentYear); // Add this line

    // Check if logo file exists
    const logoPath = path.join(__dirname, "../public/cenro logo.png");
    console.log("Checking logo at:", logoPath);
    if (!fs.existsSync(logoPath)) {
      console.error("Logo file not found at:", logoPath);
      return res.status(500).json({
        message: "Logo file not found. Please check the path: " + logoPath,
      });
    }

    // Check if ordinance file exists
    const ordinancePath = path.join(
      __dirname,
      "../City Ordinance No. 57 Series of 2024.pdf"
    );
    console.log("Checking ordinance at:", ordinancePath);
    if (!fs.existsSync(ordinancePath)) {
      console.error("Ordinance file not found at:", ordinancePath);
      return res.status(500).json({
        message:
          "Ordinance file not found. Please check the path: " + ordinancePath,
      });
    }

    // Create email options
    const mailOptions = {
      from: `"CENRO San Juan City" <${process.env.EMAIL_USER}>`,
      to: certificate.email,
      subject: subject,
      html: personalizedBody,
      attachments: [
        {
          filename: path.basename(certificate.certificatePath),
          path: certificate.certificatePath,
        },
        {
          filename: "City Ordinance No. 57 Series of 2024.pdf",
          path: ordinancePath,
        },
      ],
    };

    console.log(
      `Resending certificate to ${certificate.email} (${certificate.businessName})`
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
      certificatePath: certificate.certificatePath,
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

// Serve certificate files
router.get("/files/:fileName", verifyToken, (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "../certificates", fileName);
  // Check if the file exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "Certificate file not found" });
  }
});

// Serve signature files
router.get("/signatures/:fileName", verifyToken, (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "../signatures", fileName);
  // Check if the file exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "Signature file not found" });
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
      filePath: pdfInfo.filePath,
      url: pdfInfo.url,
    });
  } catch (error) {
    console.error("Error in test fill:", error);
    res.status(500).json({
      message: "Error generating test certificate",
      error: error.message,
    });
  }
});

module.exports = router;
