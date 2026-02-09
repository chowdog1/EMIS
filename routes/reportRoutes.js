// routes/reportRoutes.js
const express = require("express");
const mongoose = require("mongoose"); // Add this line to import mongoose

module.exports = function (establishmentsDB) {
  const router = express.Router();

  // Function to dynamically get the model for a specific year
  function getBusinessModel(year) {
    // Check if the model is already registered with this connection
    if (establishmentsDB.models[`business${year}`]) {
      return establishmentsDB.model(`business${year}`);
    }

    // Define the schema dynamically
    const businessSchema = new mongoose.Schema({}, { strict: false });

    // Create and return the model using the establishmentsDB connection
    return establishmentsDB.model(
      `business${year}`,
      businessSchema,
      `business${year}`,
    );
  }

  // Function to convert array of objects to CSV
  function convertToCSV(data) {
    if (!data || data.length === 0) {
      return "";
    }
    // Get headers from the first object
    const headers = [
      "accountNo",
      "dateOfApplication",
      "orNo",
      "amountPaid",
      "dateOfPayment",
      "status",
      "applicationStatus",
      "businessName",
      "ownerName",
      "address",
      "barangay",
      "natureOfBusiness",
      "remarks",
    ];

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

  // Helper function to safely format dates
  function safeFormatDate(dateValue) {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch (error) {
      console.error("Error formatting date:", dateValue, error);
      return "";
    }
  }

  // Get available years for reports
  router.get("/available-years", async (req, res) => {
    try {
      // Get list of all collections in the establishments database
      const collections = await establishmentsDB.db.listCollections().toArray();

      // Filter collections that match the pattern 'businessYYYY'
      const businessCollections = collections
        .map((col) => col.name)
        .filter((name) => name.startsWith("business") && name.length === 12) // businessYYYY (12 chars)
        .map((name) => name.substring(8)); // Extract the year part

      // Sort years in descending order
      businessCollections.sort((a, b) => b - a);

      res.json(businessCollections);
    } catch (error) {
      console.error("Error fetching available years:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Generate CSV report for a specific year
  router.get("/csv/:year", async (req, res) => {
    try {
      const { year } = req.params;
      console.log(`Generating CSV report for year: ${year}`);

      // Get the appropriate business model based on the year
      const BusinessModel = getBusinessModel(year);

      // Fetch all businesses from the appropriate collection
      const businesses = await BusinessModel.find({});
      console.log(`Found ${businesses.length} businesses for year ${year}`);

      // Normalize the property names
      const normalizedBusinesses = businesses.map((business) => {
        return {
          accountNo: business["ACCOUNT NO"] || "",
          dateOfApplication: safeFormatDate(business["DATE OF APPLICATION"]),
          orNo: business["OR NO"] || "",
          amountPaid: business["AMOUNT PAID"] || 0,
          dateOfPayment: safeFormatDate(business["DATE OF PAYMENT"]),
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
        `attachment; filename="environmental_clearance_report_${year}.csv"`,
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
        `Generating CSV report for businesses without payments in year: ${year}`,
      );

      // Get the appropriate business model based on the year
      const BusinessModel = getBusinessModel(year);

      // Define year boundaries
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);

      // Find businesses without payments in the specified year
      const businesses = await BusinessModel.find({
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
        `Found ${businesses.length} businesses without payments in ${year}`,
      );

      // Normalize the property names
      const normalizedBusinesses = businesses.map((business) => {
        return {
          accountNo: business["ACCOUNT NO"] || "",
          dateOfApplication: safeFormatDate(business["DATE OF APPLICATION"]),
          orNo: business["OR NO"] || "",
          amountPaid: business["AMOUNT PAID"] || 0,
          dateOfPayment: safeFormatDate(business["DATE OF PAYMENT"]),
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
        `attachment; filename="environmental_clearance_no_payments_report_${year}.csv"`,
      );

      // Send the CSV
      res.send(csv);
    } catch (error) {
      console.error("Error generating no-payments CSV report:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
};
