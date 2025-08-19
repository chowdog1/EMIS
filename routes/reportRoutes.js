// routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const Business = require("../models/business2025.js"); // Import the centralized model

// Function to convert array of objects to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return "";
  }
  // Get headers from the first object
  const headers = Object.keys(data[0]);
  // Create CSV header row
  const csvHeader = headers.join(",");
  // Create CSV data rows
  const csvRows = data.map((obj) => {
    return headers
      .map((header) => {
        // Handle nested objects and special characters
        let cell =
          obj[header] === null || obj[header] === undefined
            ? ""
            : obj[header].toString();
        // Escape double quotes by doubling them
        if (cell.includes('"')) {
          cell = cell.replace(/"/g, '""');
        }
        // If cell contains comma, newline, or double quote, enclose in double quotes
        if (cell.includes(",") || cell.includes("\n") || cell.includes('"')) {
          cell = `"${cell}"`;
        }
        return cell;
      })
      .join(",");
  });
  return csvHeader + "\n" + csvRows.join("\n");
}

// Generate CSV report for a specific year
router.get("/csv/:year", async (req, res) => {
  try {
    const { year } = req.params;
    console.log(`Generating CSV report for year: ${year}`);
    if (!Business) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }
    // Fetch all businesses
    const businesses = await Business.find({});
    console.log(`Found ${businesses.length} businesses`);
    // Normalize the property names
    const normalizedBusinesses = businesses.map((business) => {
      return {
        accountNo: business["ACCOUNT NO"] || "",
        dateOfApplication: business["DATE OF APPLICATION"]
          ? new Date(business["DATE OF APPLICATION"])
              .toISOString()
              .split("T")[0]
          : "",
        orNo: business["OR NO"] || "",
        amountPaid: business["AMOUNT PAID"] || 0,
        dateOfPayment: business["DATE OF PAYMENT"]
          ? new Date(business["DATE OF PAYMENT"]).toISOString().split("T")[0]
          : "",
        status: business["STATUS"] || "",
        applicationStatus: business["APPLICATION STATUS"] || "",
        businessName: business["NAME OF BUSINESS"] || "",
        ownerName: business["NAME OF OWNER"] || "",
        address: business["ADDRESS"] || "",
        barangay: business["BARANGAY"] || "",
        natureOfBusiness: business["NATURE OF BUSINESS"] || "",
        remarks: business["REMARKS"] || "",
      };
    });
    // Convert to CSV
    const csv = convertToCSV(normalizedBusinesses);
    // Set response headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="environmental_clearance_report_${year}.csv"`
    );
    // Send the CSV
    res.send(csv);
  } catch (error) {
    console.error("Error generating CSV report:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate CSV report for businesses without payments in a specific year
router.get("/csv/:year/no-payments", async (req, res) => {
  try {
    const { year } = req.params;
    console.log(
      `Generating CSV report for businesses without payments in year: ${year}`
    );
    if (!Business) {
      return res
        .status(500)
        .json({ message: "Database connection not available" });
    }
    // Define year boundaries
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);
    // Find businesses without payments in the specified year
    const businesses = await Business.find({
      $or: [
        { "DATE OF PAYMENT": { $lt: startOfYear } }, // Paid before the specified year
        { "DATE OF PAYMENT": { $gt: endOfYear } }, // Paid after the specified year
        { "DATE OF PAYMENT": null }, // No payment date
        { "DATE OF PAYMENT": { $exists: false } }, // No payment date field
        { "AMOUNT PAID": 0 }, // Paid 0 amount
        { "AMOUNT PAID": null }, // No amount paid
      ],
    });
    console.log(
      `Found ${businesses.length} businesses without payments in ${year}`
    );
    // Normalize the property names
    const normalizedBusinesses = businesses.map((business) => {
      return {
        accountNo: business["ACCOUNT NO"] || "",
        dateOfApplication: business["DATE OF APPLICATION"]
          ? new Date(business["DATE OF APPLICATION"])
              .toISOString()
              .split("T")[0]
          : "",
        orNo: business["OR NO"] || "",
        amountPaid: business["AMOUNT PAID"] || 0,
        dateOfPayment: business["DATE OF PAYMENT"]
          ? new Date(business["DATE OF PAYMENT"]).toISOString().split("T")[0]
          : "",
        status: business["STATUS"] || "",
        applicationStatus: business["APPLICATION STATUS"] || "",
        businessName: business["NAME OF BUSINESS"] || "",
        ownerName: business["NAME OF OWNER"] || "",
        address: business["ADDRESS"] || "",
        barangay: business["BARANGAY"] || "",
        natureOfBusiness: business["NATURE OF BUSINESS"] || "",
        remarks: business["REMARKS"] || "",
      };
    });
    // Convert to CSV
    const csv = convertToCSV(normalizedBusinesses);
    // Set response headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="environmental_clearance_no_payments_report_${year}.csv"`
    );
    // Send the CSV
    res.send(csv);
  } catch (error) {
    console.error("Error generating no-payments CSV report:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
