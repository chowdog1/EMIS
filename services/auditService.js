// services/auditService.js
const AuditTrail = require("../models/auditTrail");

const logAction = async (
  action,
  collectionName,
  documentId,
  userId,
  changes,
  req,
  accountNo = null
) => {
  try {
    // For business collections, ensure accountNo is not null
    if (
      (collectionName === "business2025" ||
        collectionName === "business2026") &&
      !accountNo
    ) {
      console.warn(
        `Warning: accountNo is missing for ${action} action on ${collectionName}`
      );

      // Try to extract accountNo from changes for CREATE and DELETE actions
      if (
        (action === "CREATE" || action === "DELETE") &&
        changes &&
        changes["ACCOUNT NO"]
      ) {
        accountNo = changes["ACCOUNT NO"];
        console.log(`Extracted accountNo from changes: ${accountNo}`);
      }
    }

    const auditLog = new AuditTrail({
      action,
      collectionName,
      documentId,
      userId,
      accountNo,
      changes,
      ipAddress: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    await auditLog.save();
    console.log(
      `Audit log saved: ${action} on ${collectionName} by user ${userId} with accountNo: ${accountNo}`
    );
  } catch (error) {
    console.error("Error saving audit log:", error);
  }
};

module.exports = {
  logAction,
};
