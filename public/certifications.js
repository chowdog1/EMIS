// EMIS/public/certifications.js

// ─── State ───────────────────────────────────────────────────────────────────
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let currentCertificate = null;
let currentSignatureBase64 = null;

// ─── Init ────────────────────────────────────────────────────────────────────
if (typeof initAccountLockNotifier === "function") {
  console.log("Initializing account lock notifier");
  initAccountLockNotifier();
} else {
  console.error("Account lock notifier function not found");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getUserRole() {
  const userData = localStorage.getItem("user_data");
  if (userData) {
    const user = JSON.parse(userData);
    return user.role;
  }
  return null;
}

// ─── Handlers ────────────────────────────────────────────────────────────────
function onEditCertificate(certificate) {
  console.log("Editing certificate:", certificate);
  if (!certificate || !certificate._id) {
    showErrorMessage("Invalid certificate selected");
    return;
  }
  currentCertificate = certificate;
  const editModal = document.getElementById("editCertificateModal");

  document.getElementById("editAccountNo").value = certificate.accountNo;
  document.getElementById("editBusinessName").value = certificate.businessName;
  document.getElementById("editAddress").value = certificate.address;
  document.getElementById("editEmail").value = certificate.email;

  let formattedDate = "";
  if (certificate.certificateDate) {
    try {
      const certDate =
        typeof certificate.certificateDate === "string"
          ? new Date(certificate.certificateDate)
          : certificate.certificateDate;
      if (!isNaN(certDate.getTime())) {
        formattedDate = certDate.toISOString().split("T")[0];
      }
    } catch (error) {
      console.error("Error formatting certificate date:", error);
    }
  }
  document.getElementById("editCertificateDate").value = formattedDate;
  editModal.style.display = "block";
}

async function handleApproveCertificate(certificate) {
  console.log("Approving certificate:", certificate);
  if (!certificate || !certificate._id) {
    showErrorMessage("Invalid certificate selected");
    return;
  }

  const isConfirmed = confirm(
    `Are you sure you want to approve this certificate for ${certificate.businessName}?\n\n` +
      `This action will require uploading a signature.`,
  );
  if (!isConfirmed) return;

  currentCertificate = certificate;
  const signatureModal = document.getElementById("signatureModal");
  signatureModal.style.display = "block";

  const signatureForm = document.getElementById("signatureForm");
  signatureForm.reset();
  document.getElementById("signaturePreview").innerHTML =
    "<span>No image selected</span>";
  currentSignatureBase64 = null;

  const modalTitle = signatureModal.querySelector(".modal-title");
  if (modalTitle) modalTitle.textContent = "Approve & Sign Certificate";

  const uploadBtn = document.getElementById("uploadSignatureBtn");
  if (uploadBtn) uploadBtn.textContent = "Approve & Sign";
}

async function handleSendCertificate(certificate) {
  console.log("Sending certificate for:", certificate);
  if (!certificate || !certificate._id) {
    showErrorMessage("Invalid certificate selected");
    return;
  }

  const normalizedStatus = certificate.status
    ? certificate.status.toLowerCase().trim()
    : "";
  if (normalizedStatus !== "signed") {
    showErrorMessage(
      `Certificate must be signed before sending. Current status: ${certificate.status}`,
    );
    return;
  }

  currentCertificate = certificate;
  const sendCertificatesModal = document.getElementById(
    "sendCertificatesModal",
  );

  const sendBtn = document.getElementById("sendCertificateBtn");
  if (sendBtn) {
    sendBtn.innerHTML = "Send Certificate";
    sendBtn.className = "btn btn-primary";
    sendBtn.disabled = false;
  }

  sendCertificatesModal
    .querySelectorAll(".progress-container, .alert-success, .alert-danger")
    .forEach((el) => el.remove());

  document.getElementById("emailBody").value =
    generateCertificateEmailBody(certificate);

  const modalTitle = sendCertificatesModal.querySelector(".modal-title");
  if (modalTitle) modalTitle.textContent = "Send Certificate";

  sendCertificatesModal.style.display = "block";
}

async function handlePreviewCertificate(certificate) {
  console.log("Previewing certificate with PDF for:", certificate);
  currentCertificate = certificate;

  const emailPreviewModal = document.getElementById("emailPreviewModal");
  emailPreviewModal.style.display = "block";

  document.getElementById("previewToEmail").textContent = certificate.email;
  document.getElementById("previewSubject").textContent =
    document.getElementById("emailSubject").value;
  document.getElementById("previewEmailBody").innerHTML = "";
  document.getElementById("previewAttachmentName").textContent = "";
  document.getElementById("previewSignatureSection").style.display = "none";

  emailPreviewModal
    .querySelectorAll(".alert-success, .alert-danger, .progress-container")
    .forEach((el) => el.remove());

  const sendBtn = document.getElementById("sendCertificateBtn");
  if (sendBtn) {
    const normalizedStatus = certificate.status
      ? certificate.status.toLowerCase().trim()
      : "";
    sendBtn.innerHTML =
      normalizedStatus === "sent" || normalizedStatus === "resent"
        ? "Resend Certificate"
        : "Send Certificate";
    sendBtn.className = "btn btn-primary";
    sendBtn.disabled = false;
    sendBtn.style.cursor = "";
  }

  const warningMsg = document.getElementById("approvalWarning");
  if (warningMsg) warningMsg.remove();

  const previewStatus = document.getElementById("previewStatus");
  previewStatus.textContent = certificate.status;
  previewStatus.className = "preview-status";
  const ns = certificate.status ? certificate.status.toLowerCase().trim() : "";
  if (ns === "signed") previewStatus.classList.add("signed");
  else if (ns === "for signatory") previewStatus.classList.add("for-signatory");
  else if (ns === "approved") previewStatus.classList.add("approved");
  else if (ns === "for approval") previewStatus.classList.add("for-approval");
  else if (ns === "sent") previewStatus.classList.add("sent");
  else if (ns === "resent") previewStatus.classList.add("resent");

  const pdfPreviewContainer = document.getElementById("pdfPreviewContainer");
  if (pdfPreviewContainer) {
    pdfPreviewContainer.innerHTML = `
      <div class="d-flex justify-content-center align-items-center" style="height: 400px;">
        <div class="spinner-border text-primary" role="status"></div>
        <span class="ms-3">Generating PDF preview...</span>
      </div>`;
  }

  try {
    const token = getAuthToken();
    const response = await fetch("/api/certificates/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ certificateId: certificate._id }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      const errorData = await response.json();
      throw new Error(
        errorData.message || `Failed to generate preview: ${response.status}`,
      );
    }

    const result = await response.json();
    console.log("Preview response:", result);

    document.getElementById("previewEmailBody").innerHTML =
      generateCertificateEmailBody(certificate);
    document.getElementById("previewAttachmentName").textContent =
      result.fileName;

    const signatureSection = document.getElementById("previewSignatureSection");
    const signatureImage = document.getElementById("previewSignatureImage");
    // Use signatureBase64 from the preview result (full document) not the table row
    if (result.certificate && result.certificate.signatureBase64) {
      signatureSection.style.display = "block";
      signatureImage.src = `data:image/png;base64,${result.certificate.signatureBase64}`;
    } else {
      signatureSection.style.display = "none";
    }

    if (pdfPreviewContainer) {
      pdfPreviewContainer.innerHTML = `
        <div class="pdf-preview">
          <iframe
            src="data:application/pdf;base64,${result.pdfBase64}"
            width="100%"
            height="500px"
            title="Certificate Preview"
          ></iframe>
          <div class="pdf-preview-actions mt-3">
            <a href="data:application/pdf;base64,${result.pdfBase64}"
               download="${result.fileName}"
               class="btn btn-outline-primary">
              <i class="fas fa-download me-2"></i>Download PDF
            </a>
          </div>
        </div>`;
    }

    updateSendButtonState(certificate);
  } catch (error) {
    console.error("Error generating certificate preview:", error);
    if (pdfPreviewContainer) {
      pdfPreviewContainer.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <div>Failed to generate PDF preview: ${error.message}</div>
        </div>`;
    }
    showErrorMessage(`Failed to generate preview: ${error.message}`);
  }
}

function handleResendCertificate(certificate) {
  console.log("Resending certificate to:", certificate);
  currentCertificate = certificate;

  const isConfirmed = confirm(
    `Are you sure you want to resend this certificate to ${certificate.email}?`,
  );
  if (!isConfirmed) return;

  const sendCertificatesModal = document.getElementById(
    "sendCertificatesModal",
  );

  const sendBtn = document.getElementById("sendCertificateBtn");
  if (sendBtn) {
    sendBtn.innerHTML = "Resend Certificate";
    sendBtn.className = "btn btn-primary";
    sendBtn.disabled = false;
  }

  sendCertificatesModal
    .querySelectorAll(".progress-container, .alert-success, .alert-danger")
    .forEach((el) => el.remove());

  document.getElementById("emailBody").value =
    generateCertificateEmailBody(certificate);

  const modalTitle = sendCertificatesModal.querySelector(".modal-title");
  if (modalTitle) modalTitle.textContent = "Resend Certificate";

  sendCertificatesModal.style.display = "block";
}

async function saveEditedCertificate() {
  try {
    if (!currentCertificate || !currentCertificate._id) {
      showErrorMessage("No certificate selected for editing");
      return;
    }

    const accountNo = document.getElementById("editAccountNo").value.trim();
    const businessName = document
      .getElementById("editBusinessName")
      .value.trim();
    const address = document.getElementById("editAddress").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const certificateDate = document.getElementById(
      "editCertificateDate",
    ).value;

    if (!accountNo || !businessName || !address || !email || !certificateDate) {
      showErrorMessage("All fields are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showErrorMessage("Please enter a valid email address");
      return;
    }

    const token = getAuthToken();
    const response = await fetch(
      `/api/certificates/${currentCertificate._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountNo,
          businessName,
          address,
          email,
          certificateDate: new Date(certificateDate),
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      const errorData = await response.json();
      throw new Error(
        errorData.message || `Failed to update certificate: ${response.status}`,
      );
    }

    showSuccessMessage("Certificate updated successfully");
    document.getElementById("editCertificateModal").style.display = "none";

    // Reload current page so the edit is reflected
    const search = document.getElementById("searchInput")?.value.trim() || "";
    loadCertificateData(currentPage, pageSize, search);
  } catch (error) {
    console.error("Error updating certificate:", error);
    showErrorMessage(`Failed to update certificate: ${error.message}`);
  }
}

// ─── Data loading (server-side pagination + search) ──────────────────────────
async function loadCertificateData(page = 1, size = pageSize, search = "") {
  try {
    console.log(
      `Loading certificate data — page ${page}, size ${size}, search "${search}"`,
    );

    const tableRoot = document.getElementById("certificateTable");
    if (tableRoot) {
      tableRoot.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #6c757d">
          <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px"></i>
          <p>Loading certificate data...</p>
        </div>`;
    }

    const token = getAuthToken();
    const params = new URLSearchParams({ page, limit: size, search });
    const response = await fetch(`/api/certificates?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      throw new Error(
        `Failed to load certificate data: ${response.status} ${response.statusText}`,
      );
    }

    // API returns { certificates, total, page, limit }
    const { certificates, total } = await response.json();
    console.log(
      `Certificate data loaded: ${certificates.length} of ${total} total`,
    );

    totalRecords = total;
    currentPage = page;
    pageSize = size;

    updateCertificateTable(certificates);
    updatePaginationControls(page, size, total, updateTableWithPagination, {
      pageSizeSelectId: "pageSizeSelect",
      firstPageBtnId: "firstPageBtn",
      prevPageBtnId: "prevPageBtn",
      nextPageBtnId: "nextPageBtn",
      lastPageBtnId: "lastPageBtn",
      paginationInfoId: "paginationInfo",
    });
  } catch (error) {
    console.error("Error loading certificate data:", error);
    showErrorMessage(`Failed to load certificate data: ${error.message}`);
  }
}

// ─── Search ──────────────────────────────────────────────────────────────────
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  if (!searchInput || !searchBtn) {
    console.error("Search elements not found");
    return;
  }
  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") performSearch();
  });
}

function performSearch() {
  const query = document.getElementById("searchInput").value.trim();
  currentPage = 1;
  loadCertificateData(1, pageSize, query);
}

// ─── Pagination callback ──────────────────────────────────────────────────────
function updateTableWithPagination(page, size) {
  currentPage = page;
  pageSize = size;
  const search = document.getElementById("searchInput")?.value.trim() || "";
  loadCertificateData(page, size, search);
}

// ─── Table rendering ──────────────────────────────────────────────────────────
function updateCertificateTable(certificates) {
  const tableRoot = document.getElementById("certificateTable");
  if (!tableRoot) {
    console.error("Certificate table root element not found");
    return;
  }

  if (typeof React === "undefined" || typeof ReactDOM === "undefined") {
    console.error("React or ReactDOM not loaded");
    renderSimpleTable(certificates);
    return;
  }

  try {
    const StatusBadge = ({ status }) => {
      const ns = status ? status.toLowerCase().trim() : "";
      let color = "#6c757d";
      if (ns === "signed") color = "#17a2b8";
      else if (ns === "for signatory") color = "#fd7e14";
      else if (ns === "approved") color = "#28a745";
      else if (ns === "for approval") color = "#ffc107";
      else if (ns === "sent") color = "#6f42c1";
      else if (ns === "resent") color = "#e83e8c";

      return React.createElement(
        "span",
        {
          className: "status-badge",
          style: {
            display: "inline-block",
            padding: "0.25rem 0.5rem",
            borderRadius: "0.25rem",
            backgroundColor: color,
            color: "white",
            fontSize: "0.75rem",
            fontWeight: "500",
          },
        },
        status,
      );
    };

    const ActionButton = ({ certificate, onApprove, onSend, onResend }) => {
      const ns = certificate.status
        ? certificate.status.toLowerCase().trim()
        : "";
      const userRole = getUserRole();

      const approveButton =
        userRole === "admin" && ns === "for approval"
          ? React.createElement(
              "button",
              {
                className: "btn btn-sm btn-success me-1",
                onClick: () => onApprove(certificate),
                style: { padding: "0.25rem 0.5rem", fontSize: "0.75rem" },
                title: "Approve this certificate",
              },
              "Approve",
            )
          : null;

      const sendButton =
        ns === "signed"
          ? React.createElement(
              "button",
              {
                className: "btn btn-sm btn-primary me-1",
                onClick: () => onSend(certificate),
                style: { padding: "0.25rem 0.5rem", fontSize: "0.75rem" },
                title: "Send this signed certificate",
              },
              "Send",
            )
          : null;

      const resendButton =
        ns === "sent" || ns === "resent"
          ? React.createElement(
              "button",
              {
                className: "btn btn-sm btn-outline-primary",
                onClick: () => onResend(certificate),
                style: { padding: "0.25rem 0.5rem", fontSize: "0.75rem" },
                title: "Resend this certificate",
              },
              "Resend",
            )
          : null;

      return React.createElement(
        "div",
        { style: { display: "flex", gap: "5px" } },
        approveButton,
        sendButton,
        resendButton,
      );
    };

    const App = () =>
      React.createElement(
        "div",
        { style: { overflowX: "auto" } },
        React.createElement(
          "table",
          {
            className: "certificate-table",
            style: {
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e9ecef",
            },
          },
          React.createElement(
            "thead",
            null,
            React.createElement(
              "tr",
              { style: { backgroundColor: "#f8f9fa" } },
              ...[
                "Account No.",
                "Business Name",
                "Address",
                "Email",
                "Status",
                "Actions",
              ].map((h) =>
                React.createElement(
                  "th",
                  {
                    style: {
                      padding: "12px 15px",
                      textAlign: "left",
                      fontWeight: "600",
                      borderBottom: "1px solid #e9ecef",
                    },
                  },
                  h,
                ),
              ),
            ),
          ),
          React.createElement(
            "tbody",
            null,
            certificates.map((cert, idx) =>
              React.createElement(
                "tr",
                { key: idx, style: { borderBottom: "1px solid #e9ecef" } },
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(
                    "a",
                    {
                      href: "#",
                      onClick: (e) => {
                        e.preventDefault();
                        onEditCertificate(cert);
                      },
                      style: {
                        color: "#2c5282",
                        textDecoration: "none",
                        fontWeight: "500",
                      },
                    },
                    cert.accountNo,
                  ),
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  cert.businessName,
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  cert.address,
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  cert.email,
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(StatusBadge, { status: cert.status }),
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(ActionButton, {
                    certificate: cert,
                    onApprove: handleApproveCertificate,
                    onSend: handleSendCertificate,
                    onResend: handleResendCertificate,
                  }),
                ),
              ),
            ),
          ),
        ),
      );

    tableRoot.innerHTML = "";
    const root = ReactDOM.createRoot(tableRoot);
    root.render(React.createElement(App));
    console.log("Certificate table rendered successfully");
  } catch (error) {
    console.error("Error rendering certificate table:", error);
    renderSimpleTable(certificates);
  }
}

// Fallback plain-DOM table
function renderSimpleTable(certificates) {
  const tableRoot = document.getElementById("certificateTable");
  if (!tableRoot) return;

  const table = document.createElement("table");
  table.className = "certificate-table";
  table.style.cssText = "width:100%;border-collapse:collapse;";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  [
    "Account No.",
    "Business Name",
    "Address",
    "Email",
    "Status",
    "Actions",
  ].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.cssText =
      "padding:12px 15px;text-align:left;background:#f8f9fa;font-weight:600;border-bottom:1px solid #e9ecef;";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const userRole = getUserRole();

  certificates.forEach((cert) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #e9ecef";

    const accountNoCell = document.createElement("td");
    accountNoCell.style.padding = "12px 15px";
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = cert.accountNo;
    link.style.cssText = "color:#2c5282;text-decoration:none;font-weight:500;";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      onEditCertificate(cert);
    });
    accountNoCell.appendChild(link);
    row.appendChild(accountNoCell);

    ["businessName", "address", "email"].forEach((key) => {
      const td = document.createElement("td");
      td.textContent = cert[key];
      td.style.padding = "12px 15px";
      row.appendChild(td);
    });

    const statusCell = document.createElement("td");
    statusCell.style.padding = "12px 15px";
    const badge = document.createElement("span");
    badge.textContent = cert.status;
    badge.className = "status-badge";
    badge.style.cssText =
      "display:inline-block;padding:0.25rem 0.5rem;border-radius:0.25rem;color:white;font-size:0.75rem;font-weight:500;";
    const ns = cert.status ? cert.status.toLowerCase().trim() : "";
    badge.style.backgroundColor =
      ns === "signed"
        ? "#17a2b8"
        : ns === "for signatory"
          ? "#fd7e14"
          : ns === "approved"
            ? "#28a745"
            : ns === "for approval"
              ? "#ffc107"
              : ns === "sent"
                ? "#6f42c1"
                : ns === "resent"
                  ? "#e83e8c"
                  : "#6c757d";
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    actionCell.style.cssText = "padding:12px 15px;display:flex;gap:5px;";

    if (userRole === "admin" && ns === "for approval") {
      const btn = document.createElement("button");
      btn.textContent = "Approve";
      btn.className = "btn btn-sm btn-success me-1";
      btn.style.cssText = "padding:0.25rem 0.5rem;font-size:0.75rem;";
      btn.addEventListener("click", () => handleApproveCertificate(cert));
      actionCell.appendChild(btn);
    }
    if (ns === "signed") {
      const btn = document.createElement("button");
      btn.textContent = "Send";
      btn.className = "btn btn-sm btn-primary me-1";
      btn.style.cssText = "padding:0.25rem 0.5rem;font-size:0.75rem;";
      btn.addEventListener("click", () => handleSendCertificate(cert));
      actionCell.appendChild(btn);
    }
    if (ns === "sent" || ns === "resent") {
      const btn = document.createElement("button");
      btn.textContent = "Resend";
      btn.className = "btn btn-sm btn-outline-primary me-1";
      btn.style.cssText = "padding:0.25rem 0.5rem;font-size:0.75rem;";
      btn.addEventListener("click", () => handleResendCertificate(cert));
      actionCell.appendChild(btn);
    }

    row.appendChild(actionCell);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableRoot.innerHTML = "";
  tableRoot.appendChild(table);
  console.log("Simple table rendered successfully");
}

// ─── Email body generator ─────────────────────────────────────────────────────
function generateCertificateEmailBody(certificate) {
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

  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Participation</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #e0e0e0; }
    .header h1 { color: #2c5282; margin: 0; font-size: 24px; }
    .content { padding: 20px 0; }
    .content p { margin-bottom: 15px; }
    .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .details h3 { margin-top: 0; color: #2c5282; }
    .details ul { padding-left: 20px; }
    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Certificate of Participation</h1></div>
    <div class="content">
      <p>Isang Makakalikasang Araw, <strong>${certificate.businessName}</strong>,</p>
      <p>Thank you for waiting. We are pleased to provide you with a copy of your E-Certificates given your participation in our Environmental Awareness Seminar for Commercial Establishments held on <strong>${formattedDate}</strong>.</p>
      <p>This is a computer-generated certificate.</p>
      <div class="details">
        <h3>Certificate Details</h3>
        <ul>
          <li><strong>Business Name:</strong> ${certificate.businessName}</li>
          <li><strong>Account No.:</strong> ${certificate.accountNo}</li>
          <li><strong>Address:</strong> ${certificate.address}</li>
          <li><strong>Date of Seminar:</strong> ${formattedDate}</li>
        </ul>
      </div>
      <p>Also attached is a copy of the City Ordinance No. 57, s. 2024 or the Revised Environmental Code of San Juan City for future reference.</p>
      <p>Best Regards,</p>
      <p><strong>CITY ENVIRONMENT AND NATURAL RESOURCES OFFICE</strong><br>
      Pollution Control Unit<br>San Juan, Metro Manila<br>Mobile No: SMART (0939) 717-2394</p>
    </div>
    <div class="footer">
      <p>This is an automated message.</p>
      <p>For inquiries, contact us at cenrosanjuanpcu@gmail.com | Phone: (0939)717-2394.</p>
      <p>© ${currentYear} City Government of San Juan. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send button state ────────────────────────────────────────────────────────
function updateSendButtonState(certificate) {
  const sendCertificateBtn = document.getElementById("sendCertificateBtn");
  const ns = certificate.status ? certificate.status.toLowerCase().trim() : "";

  if (ns === "sent" || ns === "resent") {
    sendCertificateBtn.disabled = false;
    sendCertificateBtn.className = "btn btn-primary";
    sendCertificateBtn.innerHTML = "Resend Certificate";
    sendCertificateBtn.title = "";
    document.getElementById("approvalWarning")?.remove();
  } else if (ns === "signed") {
    sendCertificateBtn.disabled = false;
    sendCertificateBtn.className = "btn btn-primary";
    sendCertificateBtn.innerHTML = "Send Certificate";
    sendCertificateBtn.title = "";
    document.getElementById("approvalWarning")?.remove();
  } else {
    sendCertificateBtn.disabled = true;
    sendCertificateBtn.className = "btn btn-secondary";
    sendCertificateBtn.innerHTML =
      ns === "for signatory"
        ? `<i class="fas fa-pen-fancy"></i> Signature Required`
        : `<i class="fas fa-lock"></i> Certificate Not Ready`;
    sendCertificateBtn.title =
      ns === "for signatory"
        ? "This certificate requires a signature before it can be sent"
        : "This certificate is not ready for sending. Please complete all required steps.";

    if (!document.getElementById("approvalWarning")) {
      const warningMsg = document.createElement("div");
      warningMsg.id = "approvalWarning";
      warningMsg.className = "alert alert-warning mt-3";
      warningMsg.innerHTML =
        ns === "for signatory"
          ? `<i class="fas fa-exclamation-triangle me-2"></i><strong>Signature Required:</strong> This certificate needs to be signed by an administrator before it can be sent.`
          : `<i class="fas fa-exclamation-triangle me-2"></i><strong>Warning:</strong> This certificate is not ready for sending. Please complete all required steps.`;
      document
        .querySelector("#emailPreviewModal .modal-body")
        ?.appendChild(warningMsg);
    }
  }
}

// ─── Resend certificate ───────────────────────────────────────────────────────
async function resendCertificate(certificate) {
  try {
    const subject = document.getElementById("emailSubject").value.trim();
    const body = document.getElementById("emailBody").value;
    const template = document.getElementById("certificateTemplate").value;

    if (!subject || !body) {
      showErrorMessage("Please fill in all required fields");
      return;
    }

    const resendProgressModal = createResendProgressModal();
    document.body.appendChild(resendProgressModal);
    resendProgressModal.style.display = "block";

    const progressBar = resendProgressModal.querySelector(".progress-bar");
    const progressPercentage = resendProgressModal.querySelector(
      ".progress-percentage",
    );
    const progressSteps = resendProgressModal.querySelectorAll(".step");
    let progress = 0;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      progress += 3;
      if (progress > 95) progress = 95;
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute("aria-valuenow", progress);
      }
      if (progressPercentage) progressPercentage.textContent = `${progress}%`;
      if (progress > 40 && currentStep === 0) {
        progressSteps[0].classList.replace("step-active", "step-completed");
        progressSteps[1].classList.add("step-active");
        currentStep = 1;
      } else if (progress > 80 && currentStep === 1) {
        progressSteps[1].classList.replace("step-active", "step-completed");
        progressSteps[2].classList.add("step-active");
        currentStep = 2;
      }
    }, 100);

    const token = getAuthToken();
    const response = await fetch("/api/certificates/resend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        certificateId: certificate._id,
        subject,
        body,
        template,
      }),
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      const errorData = await response.json();
      throw new Error(
        errorData.message || `Failed to resend certificate: ${response.status}`,
      );
    }

    progressBar.style.width = "100%";
    progressBar.setAttribute("aria-valuenow", 100);
    progressPercentage.textContent = "100%";
    progressSteps.forEach((step) => {
      step.classList.remove("step-active");
      step.classList.add("step-completed");
    });

    setTimeout(() => {
      resendProgressModal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Resend Complete</h5></div>
          <div class="modal-body text-center">
            <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
            <h4 class="mt-3">Certificate Resent Successfully!</h4>
            <p>The certificate has been resent to ${certificate.email}.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="closeResendModals()">OK</button>
          </div>
        </div>`;
    }, 500);

    setTimeout(() => {
      const search = document.getElementById("searchInput")?.value.trim() || "";
      loadCertificateData(currentPage, pageSize, search);
    }, 1000);
  } catch (error) {
    console.error("Error resending certificate:", error);
    showErrorMessage(`Failed to resend certificate: ${error.message}`);
  }
}

function closeResendModals() {
  const resendProgressModal = document.querySelector('.modal[style*="block"]');
  if (resendProgressModal) {
    resendProgressModal.style.display = "none";
    resendProgressModal.remove();
  }
  const sendCertificatesModal = document.getElementById(
    "sendCertificatesModal",
  );
  if (sendCertificatesModal?.style.display === "block") {
    sendCertificatesModal.style.display = "none";
    const modalTitle = sendCertificatesModal.querySelector(".modal-title");
    if (modalTitle) modalTitle.textContent = "Send Certificate";
  }
  const emailPreviewModal = document.getElementById("emailPreviewModal");
  if (emailPreviewModal?.style.display === "block") {
    emailPreviewModal.style.display = "none";
  }
}

function createResendProgressModal() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.cssText = "display:block;background-color:rgba(0,0,0,0.5);";
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Resending Certificate</h5></div>
        <div class="modal-body">
          <div class="progress-container">
            <div class="d-flex justify-content-between mb-1">
              <span>Resending certificate</span>
              <span class="progress-percentage">0%</span>
            </div>
            <div class="progress" style="height: 10px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated bg-success"
                   role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <div class="progress-steps mt-2 d-flex justify-content-between">
              <small class="step step-active">Preparing</small>
              <small class="step">Sending</small>
              <small class="step">Completed</small>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
  return modal;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabPanes = document.querySelectorAll(".tab-pane");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      tabs.forEach((t) => t.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));
      this.classList.add("active");
      document
        .getElementById(`${this.getAttribute("data-tab")}-tab`)
        .classList.add("active");
    });
  });
}

// ─── Upload modal ─────────────────────────────────────────────────────────────
function setupUploadButton() {
  const uploadDataBtn = document.getElementById("uploadDataBtn");
  const uploadModal = document.getElementById("uploadModal");
  const uploadForm = document.getElementById("uploadForm");
  const uploadBtn = document.getElementById("uploadBtn");
  const closeBtns = uploadModal.querySelectorAll(
    ".modal-close, .modal-close-btn",
  );

  uploadDataBtn?.addEventListener("click", () => {
    uploadModal.style.display = "block";
  });
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      uploadModal.style.display = "none";
    });
  });
  window.addEventListener("click", (e) => {
    if (e.target === uploadModal) uploadModal.style.display = "none";
  });

  uploadBtn?.addEventListener("click", async function () {
    const fileInput = document.getElementById("csvFile");
    if (!fileInput.files.length) {
      showErrorMessage("Please select a CSV file to upload");
      return;
    }
    const formData = new FormData();
    formData.append("csvFile", fileInput.files[0]);

    try {
      const token = getAuthToken();
      const response = await fetch("/api/certificates/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorizedError();
          return;
        }
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`,
        );
      }
      const result = await response.json();
      showSuccessMessage(result.message);
      uploadModal.style.display = "none";
      uploadForm.reset();
      loadCertificateData(1, pageSize, "");
    } catch (error) {
      console.error("Error uploading file:", error);
      showErrorMessage(`Upload failed: ${error.message}`);
    }
  });
}

// ─── Send certificates modal ──────────────────────────────────────────────────
function setupSendCertificatesModal() {
  const sendCertificatesModal = document.getElementById(
    "sendCertificatesModal",
  );
  const previewEmailBtn = document.getElementById("previewEmailBtn");
  const closeBtns = sendCertificatesModal.querySelectorAll(
    ".modal-close, .modal-close-btn",
  );

  const resetTitle = () => {
    const t = sendCertificatesModal.querySelector(".modal-title");
    if (t) t.textContent = "Send Certificate";
  };

  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      sendCertificatesModal.style.display = "none";
      resetTitle();
    });
  });
  window.addEventListener("click", (e) => {
    if (e.target === sendCertificatesModal) {
      sendCertificatesModal.style.display = "none";
      resetTitle();
    }
  });

  previewEmailBtn?.addEventListener("click", function () {
    const subject = document.getElementById("emailSubject").value.trim();
    const body = document.getElementById("emailBody").value;
    if (!subject || !body) {
      showErrorMessage("Please fill in all required fields");
      return;
    }
    if (currentCertificate) {
      sendCertificatesModal.style.display = "none";
      handlePreviewCertificate(currentCertificate);
    } else {
      showErrorMessage("No certificate selected for preview");
    }
  });
}

// ─── Signature modal ──────────────────────────────────────────────────────────
function setupSignatureModal() {
  const signatureModal = document.getElementById("signatureModal");
  const signatureImageInput = document.getElementById("signatureImage");
  const signaturePreview = document.getElementById("signaturePreview");
  const uploadSignatureBtn = document.getElementById("uploadSignatureBtn");
  const closeBtns = signatureModal.querySelectorAll(
    ".modal-close, .modal-close-btn",
  );

  const resetModal = () => {
    signatureModal.style.display = "none";
    const t = signatureModal.querySelector(".modal-title");
    if (t) t.textContent = "Upload Signature";
    const btn = document.getElementById("uploadSignatureBtn");
    if (btn) btn.textContent = "Upload Signature";
  };

  signatureImageInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        signaturePreview.innerHTML = `<img src="${e.target.result}" alt="Signature preview" />`;
        currentSignatureBase64 = e.target.result.split(",")[1];
      };
      reader.readAsDataURL(file);
    } else {
      signaturePreview.innerHTML = "<span>No image selected</span>";
      currentSignatureBase64 = null;
    }
  });

  closeBtns.forEach((btn) => btn.addEventListener("click", resetModal));
  window.addEventListener("click", (e) => {
    if (e.target === signatureModal) resetModal();
  });

  uploadSignatureBtn.addEventListener("click", async function () {
    if (!currentSignatureBase64) {
      showErrorMessage("Please select a signature image to upload");
      return;
    }

    try {
      const token = getAuthToken();
      const isApproval = currentCertificate.status === "for approval";
      const endpoint = isApproval
        ? "/api/certificates/approve-with-signature"
        : "/api/certificates/upload-signature";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          certificateId: currentCertificate._id,
          signatureBase64: currentSignatureBase64,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorizedError();
          return;
        }
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Failed to process signature: ${response.status}`,
        );
      }

      const result = await response.json();
      showSuccessMessage(result.message);
      resetModal();

      const search = document.getElementById("searchInput")?.value.trim() || "";
      loadCertificateData(currentPage, pageSize, search);
    } catch (error) {
      console.error("Error processing signature:", error);
      showErrorMessage(`Failed to process signature: ${error.message}`);
    }
  });
}

// ─── Email preview modal ──────────────────────────────────────────────────────
function setupEmailPreviewModal() {
  const emailPreviewModal = document.getElementById("emailPreviewModal");
  const sendCertificateBtn = document.getElementById("sendCertificateBtn");
  const closeBtns = emailPreviewModal.querySelectorAll(
    ".modal-close, .modal-close-btn",
  );

  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      emailPreviewModal.style.display = "none";
    });
  });
  window.addEventListener("click", (e) => {
    if (e.target === emailPreviewModal)
      emailPreviewModal.style.display = "none";
  });

  sendCertificateBtn?.addEventListener("click", async function () {
    if (!currentCertificate) {
      showErrorMessage("No certificate selected");
      return;
    }

    const ns = currentCertificate.status
      ? currentCertificate.status.toLowerCase().trim()
      : "";

    if (ns === "sent" || ns === "resent") {
      await resendCertificate(currentCertificate);
      return;
    }

    if (ns !== "signed") {
      showErrorMessage("Certificate must be signed before sending");
      return;
    }

    const subject = document.getElementById("emailSubject").value.trim();
    const body = document.getElementById("emailBody").value;
    const template = document.getElementById("certificateTemplate").value;

    if (!subject || !body) {
      showErrorMessage("Please fill in all required fields");
      return;
    }

    const originalBtnText = sendCertificateBtn.innerHTML;
    const originalBtnClass = sendCertificateBtn.className;
    sendCertificateBtn.disabled = true;
    sendCertificateBtn.className = "btn btn-success";
    sendCertificateBtn.style.cursor = "not-allowed";
    sendCertificateBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Sending...`;

    emailPreviewModal
      .querySelectorAll(".progress-container")
      .forEach((el) => el.remove());

    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-container mt-3";
    progressContainer.innerHTML = `
      <div class="d-flex justify-content-between mb-1">
        <span>Sending certificate</span>
        <span class="progress-percentage">0%</span>
      </div>
      <div class="progress" style="height: 10px;">
        <div class="progress-bar progress-bar-striped progress-bar-animated bg-success"
             role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <div class="progress-steps mt-2 d-flex justify-content-between">
        <small class="step step-active">Preparing</small>
        <small class="step">Filling Template</small>
        <small class="step">Sending</small>
      </div>`;
    sendCertificateBtn.parentNode.insertBefore(
      progressContainer,
      sendCertificateBtn.nextSibling,
    );

    const progressBar = progressContainer.querySelector(".progress-bar");
    const progressPercentage = progressContainer.querySelector(
      ".progress-percentage",
    );
    const progressSteps = progressContainer.querySelectorAll(".step");
    let progress = 0;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      progress += 2;
      if (progress > 95) progress = 95;
      progressBar.style.width = `${progress}%`;
      progressBar.setAttribute("aria-valuenow", progress);
      progressPercentage.textContent = `${progress}%`;
      if (progress > 30 && currentStep === 0) {
        progressSteps[0].classList.replace("step-active", "step-completed");
        progressSteps[1].classList.add("step-active");
        currentStep = 1;
      } else if (progress > 70 && currentStep === 1) {
        progressSteps[1].classList.replace("step-active", "step-completed");
        progressSteps[2].classList.add("step-active");
        currentStep = 2;
      }
    }, 100);

    try {
      const token = getAuthToken();
      const response = await fetch("/api/certificates/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          certificateId: currentCertificate._id,
          subject,
          body,
          template,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorizedError();
          return;
        }
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Failed to send certificate: ${response.status}`,
        );
      }

      progressBar.style.width = "100%";
      progressBar.setAttribute("aria-valuenow", 100);
      progressPercentage.textContent = "100%";
      progressSteps.forEach((step) => {
        step.classList.remove("step-active");
        step.classList.add("step-completed");
      });

      setTimeout(async () => {
        const data = await response.json().catch(() => ({}));
        sendCertificateBtn.innerHTML = `<i class="fas fa-check-circle"></i> Sent Successfully`;
        progressContainer.innerHTML = `
          <div class="alert alert-success d-flex align-items-center" role="alert">
            <i class="fas fa-check-circle me-2"></i>
            <div>Certificate sent successfully!</div>
          </div>`;
        showSuccessMessage(data.message || "Certificate sent successfully!");

        setTimeout(() => {
          const search =
            document.getElementById("searchInput")?.value.trim() || "";
          loadCertificateData(currentPage, pageSize, search).then(() => {
            emailPreviewModal.style.display = "none";
            setTimeout(() => {
              sendCertificateBtn.innerHTML = originalBtnText;
              sendCertificateBtn.className = originalBtnClass;
              sendCertificateBtn.disabled = false;
              sendCertificateBtn.style.cursor = "";
            }, 300);
          });
        }, 1000);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      sendCertificateBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Failed to Send`;
      sendCertificateBtn.className = "btn btn-danger";
      progressContainer.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <div>Failed to send certificate. Please try again.</div>
        </div>`;
      setTimeout(() => {
        sendCertificateBtn.innerHTML = originalBtnText;
        sendCertificateBtn.className = originalBtnClass;
        sendCertificateBtn.disabled = false;
        sendCertificateBtn.style.cursor = "";
        console.error("Error sending certificate:", error);
        showErrorMessage(`Failed to send certificate: ${error.message}`);
      }, 3000);
    }
  });

  // Observe modal open to reset state
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (
        mutation.attributeName === "style" &&
        emailPreviewModal.style.display === "block"
      ) {
        emailPreviewModal
          .querySelectorAll(
            ".alert-success, .alert-danger, .progress-container",
          )
          .forEach((el) => el.remove());

        const btn = document.getElementById("sendCertificateBtn");
        if (btn && currentCertificate) {
          const ns = currentCertificate.status
            ? currentCertificate.status.toLowerCase().trim()
            : "";
          btn.innerHTML =
            ns === "sent" || ns === "resent"
              ? "Resend Certificate"
              : "Send Certificate";
          btn.className = "btn btn-primary";
          btn.disabled = false;
          btn.style.cursor = "";
        }

        document.getElementById("approvalWarning")?.remove();
        if (currentCertificate) updateSendButtonState(currentCertificate);
      }
    });
  });
  observer.observe(emailPreviewModal, { attributes: true });
}

// ─── Edit certificate modal ───────────────────────────────────────────────────
function setupEditCertificateModal() {
  const editModal = document.getElementById("editCertificateModal");
  const saveBtn = document.getElementById("saveCertificateBtn");
  const closeBtns = editModal.querySelectorAll(
    ".modal-close, .modal-close-btn",
  );

  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      editModal.style.display = "none";
    });
  });
  window.addEventListener("click", (e) => {
    if (e.target === editModal) editModal.style.display = "none";
  });

  saveBtn?.addEventListener("click", saveEditedCertificate);
}

// ─── Refresh button ───────────────────────────────────────────────────────────
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (!refreshBtn) return;

  refreshBtn.addEventListener("click", function () {
    const icon = refreshBtn.querySelector("i");
    if (icon) icon.classList.add("refreshing");

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";

    loadCertificateData(1, pageSize, "").finally(() => {
      if (icon) icon.classList.remove("refreshing");
    });
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function checkAuthentication() {
  const token = localStorage.getItem("auth_token");
  const userData = localStorage.getItem("user_data");
  if (!token || !userData) {
    window.location.href = "/";
    return;
  }

  try {
    if (isTokenExpired(token)) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
      return;
    }
    const user = JSON.parse(userData);
    updateUserInterface(user);
    verifyTokenWithServer(token).catch((error) => {
      console.error("Token verification failed:", error);
    });
  } catch (e) {
    console.error("Error parsing user data:", e);
    window.location.href = "/";
  }
}

function updateCurrentPage(page) {
  const token = localStorage.getItem("auth_token");
  if (!token) return;
  fetch("/api/auth/current-page", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ page }),
  }).catch((error) => console.error("Error updating current page:", error));
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener("load", function () {
  console.log("Certifications page loaded, initializing");
  updateCurrentPage("Certificate Management");
  checkAuthentication();
  setupDropdown();
  setupLogout();
  loadCertificateData(1, pageSize, "");
  setupTabs();
  setupRefreshButton();
  setupUploadButton();
  setupSendCertificatesModal();
  setupSignatureModal();
  setupEmailPreviewModal();
  setupEditCertificateModal();
  setupSearch();
  setupPaginationControls(
    currentPage,
    pageSize,
    totalRecords,
    updateTableWithPagination,
    {
      pageSizeSelectId: "pageSizeSelect",
      firstPageBtnId: "firstPageBtn",
      prevPageBtnId: "prevPageBtn",
      nextPageBtnId: "nextPageBtn",
      lastPageBtnId: "lastPageBtn",
      paginationInfoId: "paginationInfo",
    },
  );
  updateDateTime();
  setInterval(updateDateTime, 1000);
});
