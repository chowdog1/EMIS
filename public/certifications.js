// EMIS/public/certifications.js
let allCertificates = [];
let filteredCertificates = [];
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let currentCertificate = null;
let currentSignatureBase64 = null; // Store signature base64

// Helper functions
function getUserRole() {
  const userData = localStorage.getItem("user_data");
  if (userData) {
    const user = JSON.parse(userData);
    return user.role;
  }
  return null;
}

// Handler functions
function onEditCertificate(certificate) {
  console.log("Editing certificate:", certificate);
  if (!certificate || !certificate._id) {
    showErrorMessage("Invalid certificate selected");
    return;
  }
  currentCertificate = certificate;
  const editModal = document.getElementById("editCertificateModal");
  // Populate form with current certificate data
  document.getElementById("editAccountNo").value = certificate.accountNo;
  document.getElementById("editBusinessName").value = certificate.businessName;
  document.getElementById("editAddress").value = certificate.address;
  document.getElementById("editEmail").value = certificate.email;
  // Format the certificate date for the date input
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
  try {
    console.log("Approving certificate:", certificate);
    if (!certificate || !certificate._id) {
      showErrorMessage("Invalid certificate selected");
      return;
    }
    // Show confirmation dialog
    const isConfirmed = confirm(
      `Are you sure you want to approve this certificate for ${certificate.businessName}?\n\n` +
        `This action will move the certificate to the signatory step.`
    );
    if (!isConfirmed) {
      return; // User cancelled the approval
    }
    const token = getAuthToken();
    const response = await fetch("/api/certificates/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        certificateId: certificate._id,
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
          `Failed to approve certificate: ${response.status} ${response.statusText}`
      );
    }
    const result = await response.json();
    console.log("Approval response:", result);
    showSuccessMessage(result.message);
    loadCertificateData(); // Refresh table
  } catch (error) {
    console.error("Error approving certificate:", error);
    showErrorMessage(`Failed to approve certificate: ${error.message}`);
  }
}

async function handleSignCertificate(certificate) {
  console.log("Opening signature upload for:", certificate);
  if (!certificate || !certificate._id) {
    showErrorMessage("Invalid certificate selected");
    return;
  }
  currentCertificate = certificate;
  const signatureModal = document.getElementById("signatureModal");
  signatureModal.style.display = "block";
  // Reset form
  const signatureForm = document.getElementById("signatureForm");
  signatureForm.reset();
  document.getElementById("signaturePreview").innerHTML =
    "<span>No image selected</span>";
  currentSignatureBase64 = null;
}

async function handleSendCertificate(certificate) {
  console.log("Sending certificate for:", certificate);
  // Validate certificate exists and has required properties
  if (!certificate || !certificate._id) {
    showErrorMessage("Invalid certificate selected");
    return;
  }
  // Check if certificate is signed before allowing send
  const normalizedStatus = certificate.status
    ? certificate.status.toLowerCase().trim()
    : "";
  if (normalizedStatus !== "signed") {
    showErrorMessage(
      `Certificate must be signed before sending. Current status: ${certificate.status}`
    );
    return;
  }
  currentCertificate = certificate;
  const sendCertificatesModal = document.getElementById(
    "sendCertificatesModal"
  );
  // Reset modal state before opening
  const sendBtn = document.getElementById("sendCertificateBtn");
  if (sendBtn) {
    sendBtn.innerHTML = "Send Certificate";
    sendBtn.className = "btn btn-primary";
    sendBtn.disabled = false;
  }
  // Remove any existing success messages
  const existingProgressContainers = sendCertificatesModal.querySelectorAll(
    ".progress-container, .alert-success, .alert-danger"
  );
  existingProgressContainers.forEach((container) => {
    container.remove();
  });
  // Set the email subject and body with current certificate details
  const subject = document.getElementById("emailSubject");
  const body = document.getElementById("emailBody");
  // Generate HTML email body with all placeholders replaced
  body.value = generateCertificateEmailBody(certificate);
  sendCertificatesModal.style.display = "block";
}

async function handlePreviewCertificate(certificate) {
  console.log("Previewing certificate with PDF for:", certificate);
  currentCertificate = certificate;
  // Show loading state
  const emailPreviewModal = document.getElementById("emailPreviewModal");
  emailPreviewModal.style.display = "block";
  // Clear previous preview
  document.getElementById("previewToEmail").textContent = certificate.email;
  document.getElementById("previewSubject").textContent =
    document.getElementById("emailSubject").value;
  document.getElementById("previewEmailBody").innerHTML = "";
  document.getElementById("previewAttachmentName").textContent = "";
  document.getElementById("previewSignatureSection").style.display = "none";
  // Set status badge in preview
  const previewStatus = document.getElementById("previewStatus");
  previewStatus.textContent = certificate.status;
  previewStatus.className = "preview-status";
  const normalizedStatus = certificate.status
    ? certificate.status.toLowerCase().trim()
    : "";
  if (normalizedStatus === "signed") {
    previewStatus.classList.add("signed");
  } else if (normalizedStatus === "for signatory") {
    previewStatus.classList.add("for-signatory");
  } else if (normalizedStatus === "approved") {
    previewStatus.classList.add("approved");
  } else if (normalizedStatus === "for approval") {
    previewStatus.classList.add("for-approval");
  } else if (normalizedStatus === "sent") {
    previewStatus.classList.add("sent");
  } else if (normalizedStatus === "resent") {
    previewStatus.classList.add("resent");
  }
  // Show loading indicator
  const pdfPreviewContainer = document.getElementById("pdfPreviewContainer");
  if (pdfPreviewContainer) {
    pdfPreviewContainer.innerHTML = `
      <div class="d-flex justify-content-center align-items-center" style="height: 400px;">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="ms-3">Generating PDF preview...</span>
      </div>
    `;
  }
  try {
    const token = getAuthToken();
    const response = await fetch("/api/certificates/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        certificateId: certificate._id,
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
          `Failed to generate preview: ${response.status} ${response.statusText}`
      );
    }
    const result = await response.json();
    console.log("Preview response:", result);
    // Generate HTML email body for preview
    const emailBodyHtml = generateCertificateEmailBody(certificate);
    document.getElementById("previewEmailBody").innerHTML = emailBodyHtml;
    document.getElementById("previewAttachmentName").textContent =
      result.fileName;
    // Show signature if available
    const signatureSection = document.getElementById("previewSignatureSection");
    const signatureImage = document.getElementById("previewSignatureImage");
    if (certificate.signatureBase64) {
      signatureSection.style.display = "block";
      signatureImage.src = `data:image/png;base64,${certificate.signatureBase64}`;
    } else {
      signatureSection.style.display = "none";
    }
    // Display PDF preview using base64
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
        </div>
      `;
    }
    // Update send button state based on certificate status
    updateSendButtonState(certificate);
  } catch (error) {
    console.error("Error generating certificate preview:", error);
    if (pdfPreviewContainer) {
      pdfPreviewContainer.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <div>
            Failed to generate PDF preview: ${error.message}
          </div>
        </div>
      `;
    }
    showErrorMessage(`Failed to generate preview: ${error.message}`);
  }
}

function handleResendCertificate(certificate) {
  console.log("Resending certificate to:", certificate);
  currentCertificate = certificate;
  // For sent/resent certificates, bypass preview and resend directly
  const normalizedStatus = certificate.status
    ? certificate.status.toLowerCase().trim()
    : "";
  if (normalizedStatus === "sent" || normalizedStatus === "resent") {
    // Show confirmation dialog
    if (
      confirm(
        `Are you sure you want to resend this certificate to ${certificate.email}?`
      )
    ) {
      resendCertificate(certificate);
    }
    return;
  }
  // For other statuses, open the send modal
  const sendCertificatesModal = document.getElementById(
    "sendCertificatesModal"
  );
  const body = document.getElementById("emailBody");
  body.value = generateCertificateEmailBody(certificate);
  sendCertificatesModal.style.display = "block";
}

async function saveEditedCertificate() {
  try {
    if (!currentCertificate || !currentCertificate._id) {
      showErrorMessage("No certificate selected for editing");
      return;
    }
    // Get form values
    const accountNo = document.getElementById("editAccountNo").value.trim();
    const businessName = document
      .getElementById("editBusinessName")
      .value.trim();
    const address = document.getElementById("editAddress").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const certificateDate = document.getElementById(
      "editCertificateDate"
    ).value;
    // Validate required fields
    if (!accountNo || !businessName || !address || !email || !certificateDate) {
      showErrorMessage("All fields are required");
      return;
    }
    // Validate email format
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
      }
    );
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      const errorData = await response.json();
      throw new Error(
        errorData.message ||
          `Failed to update certificate: ${response.status} ${response.statusText}`
      );
    }
    const result = await response.json();
    console.log("Certificate update response:", result);
    showSuccessMessage("Certificate updated successfully");
    // Close modal and refresh data
    document.getElementById("editCertificateModal").style.display = "none";
    loadCertificateData();
  } catch (error) {
    console.error("Error updating certificate:", error);
    showErrorMessage(`Failed to update certificate: ${error.message}`);
  }
}

// Function to load certificate data
async function loadCertificateData() {
  try {
    console.log("Loading certificate data...");
    const tableRoot = document.getElementById("certificateTable");
    if (tableRoot) {
      tableRoot.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #6c757d">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px"></i>
                    <p>Loading certificate data...</p>
                </div>
            `;
    }
    const token = getAuthToken();
    const response = await fetch("/api/certificates", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      throw new Error(
        `Failed to load certificate data: ${response.status} ${response.statusText}`
      );
    }
    const certificates = await response.json();
    console.log("Certificate data loaded:", certificates);
    allCertificates = certificates;
    filteredCertificates = [...certificates];
    totalRecords = filteredCertificates.length;
    currentPage = 1;
    updateCertificateTable(
      getPaginatedData(filteredCertificates, currentPage, pageSize)
    );
    updatePaginationControls(
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
      }
    );
  } catch (error) {
    console.error("Error loading certificate data:", error);
    showErrorMessage(`Failed to load certificate data: ${error.message}`);
  }
}

// Function to setup search functionality
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  if (!searchInput || !searchBtn) {
    console.error("Search elements not found");
    return;
  }
  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      performSearch();
    }
  });
}

// Function to perform search
function performSearch() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    filteredCertificates = [...allCertificates];
  } else {
    filteredCertificates = allCertificates.filter((certificate) => {
      return (
        certificate.email.toLowerCase().includes(query) ||
        certificate.businessName.toLowerCase().includes(query) ||
        certificate.accountNo.toLowerCase().includes(query)
      );
    });
  }
  totalRecords = filteredCertificates.length;
  currentPage = 1;
  updateCertificateTable(
    getPaginatedData(filteredCertificates, currentPage, pageSize)
  );
  updatePaginationControls(
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
    }
  );
}

// Function to update certificate table
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
      let color = "";
      let text = status;
      const normalizedStatus = status ? status.toLowerCase().trim() : "";
      if (normalizedStatus === "signed") {
        color = "#17a2b8"; // Blue for signed
      } else if (normalizedStatus === "for signatory") {
        color = "#fd7e14"; // Orange for pending signature
      } else if (normalizedStatus === "approved") {
        color = "#28a745"; // Green for approved
      } else if (normalizedStatus === "for approval") {
        color = "#ffc107"; // Yellow for pending approval
      } else if (normalizedStatus === "sent") {
        color = "#6f42c1"; // Purple for sent
      } else if (normalizedStatus === "resent") {
        color = "#e83e8c"; // Pink for resent
      } else {
        color = "#6c757d"; // Gray for default
      }
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
        text
      );
    };
    const ActionButton = ({
      certificate,
      onApprove,
      onSign,
      onSend,
      onPreview,
      onResend,
    }) => {
      const normalizedStatus = certificate.status
        ? certificate.status.toLowerCase().trim()
        : "";
      const userRole = getUserRole();
      // Show preview button for all statuses except "sent" and "resent"
      let previewButton = null;
      if (normalizedStatus !== "sent" && normalizedStatus !== "resent") {
        previewButton = React.createElement(
          "button",
          {
            className: "btn btn-sm btn-outline-primary me-1",
            onClick: () => onPreview(certificate),
            style: {
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
            },
            title: "Preview certificate details",
          },
          "Preview"
        );
      }
      // Show approve button only for admin users when status is "for approval"
      let approveButton = null;
      if (userRole === "admin" && normalizedStatus === "for approval") {
        approveButton = React.createElement(
          "button",
          {
            className: "btn btn-sm btn-success me-1",
            onClick: () => onApprove(certificate),
            style: {
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
            },
            title: "Approve this certificate",
          },
          "Approve"
        );
      }
      // Show sign button only for admin users when status is "for signatory"
      let signButton = null;
      if (userRole === "admin" && normalizedStatus === "for signatory") {
        signButton = React.createElement(
          "button",
          {
            className: "btn btn-sm btn-warning me-1",
            onClick: () => onSign(certificate),
            style: {
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
            },
            title: "Upload signature for this certificate",
          },
          "Sign"
        );
      }
      // Show send button only for signed certificates
      let sendButton = null;
      if (normalizedStatus === "signed") {
        sendButton = React.createElement(
          "button",
          {
            className: "btn btn-sm btn-primary me-1",
            onClick: () => onSend(certificate),
            style: {
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
            },
            title: "Send this signed certificate",
          },
          "Send"
        );
      }
      // Show resend button only for sent or resent certificates
      let resendButton = null;
      if (normalizedStatus === "sent" || normalizedStatus === "resent") {
        resendButton = React.createElement(
          "button",
          {
            className: "btn btn-sm btn-outline-primary",
            onClick: () => onResend(certificate),
            style: {
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
            },
            title: "Resend this certificate",
          },
          "Resend"
        );
      }
      return React.createElement(
        "div",
        { style: { display: "flex", gap: "5px" } },
        previewButton,
        approveButton,
        signButton,
        sendButton,
        resendButton
      );
    };
    const App = () => {
      return React.createElement(
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
                "Account No."
              ),
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
                "Business Name"
              ),
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
                "Address"
              ),
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
                "Email"
              ),
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
                "Status"
              ),
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
                "Actions"
              )
            )
          ),
          React.createElement(
            "tbody",
            null,
            certificates.map((certificate, index) => {
              return React.createElement(
                "tr",
                {
                  key: index,
                  style: { borderBottom: "1px solid #e9ecef" },
                },
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(
                    "a",
                    {
                      href: "#",
                      onClick: (e) => {
                        e.preventDefault();
                        onEditCertificate(certificate);
                      },
                      style: {
                        color: "#2c5282",
                        textDecoration: "none",
                        fontWeight: "500",
                      },
                    },
                    certificate.accountNo
                  )
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  certificate.businessName
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  certificate.address
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  certificate.email
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(StatusBadge, {
                    status: certificate.status,
                  })
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(ActionButton, {
                    certificate: certificate,
                    onApprove: handleApproveCertificate,
                    onSign: handleSignCertificate,
                    onSend: handleSendCertificate,
                    onPreview: handlePreviewCertificate,
                    onResend: handleResendCertificate,
                  })
                )
              );
            })
          )
        )
      );
    };
    tableRoot.innerHTML = "";
    const root = ReactDOM.createRoot(tableRoot);
    root.render(React.createElement(App));
    console.log("Certificate table rendered successfully");
  } catch (error) {
    console.error("Error rendering certificate table:", error);
    renderSimpleTable(certificates);
  }
}

// Fallback function to render a simple table
function renderSimpleTable(certificates) {
  const tableRoot = document.getElementById("certificateTable");
  if (!tableRoot) {
    console.error("Certificate table root element not found");
    return;
  }
  const table = document.createElement("table");
  table.className = "certificate-table";
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const headers = [
    "Account No.",
    "Business Name",
    "Address",
    "Email",
    "Status",
    "Actions",
  ];
  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    th.style.padding = "12px 15px";
    th.style.textAlign = "left";
    th.style.backgroundColor = "#f8f9fa";
    th.style.fontWeight = "600";
    th.style.borderBottom = "1px solid #e9ecef";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const userRole = getUserRole();
  certificates.forEach((certificate) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #e9ecef";
    // Account No. (clickable)
    const accountNoCell = document.createElement("td");
    accountNoCell.style.padding = "12px 15px";
    const accountNoLink = document.createElement("a");
    accountNoLink.href = "#";
    accountNoLink.textContent = certificate.accountNo;
    accountNoLink.style.color = "#2c5282";
    accountNoLink.style.textDecoration = "none";
    accountNoLink.style.fontWeight = "500";
    accountNoLink.addEventListener("click", (e) => {
      e.preventDefault();
      onEditCertificate(certificate);
    });
    accountNoCell.appendChild(accountNoLink);
    row.appendChild(accountNoCell);
    // Business Name
    const nameCell = document.createElement("td");
    nameCell.textContent = certificate.businessName;
    nameCell.style.padding = "12px 15px";
    row.appendChild(nameCell);
    // Address
    const addressCell = document.createElement("td");
    addressCell.textContent = certificate.address;
    addressCell.style.padding = "12px 15px";
    row.appendChild(addressCell);
    // Email
    const emailCell = document.createElement("td");
    emailCell.textContent = certificate.email;
    emailCell.style.padding = "12px 15px";
    row.appendChild(emailCell);
    // Status
    const statusCell = document.createElement("td");
    statusCell.style.padding = "12px 15px";
    const statusBadge = document.createElement("span");
    statusBadge.textContent = certificate.status;
    statusBadge.className = "status-badge";
    statusBadge.style.display = "inline-block";
    statusBadge.style.padding = "0.25rem 0.5rem";
    statusBadge.style.borderRadius = "0.25rem";
    statusBadge.style.color = "white";
    statusBadge.style.fontSize = "0.75rem";
    statusBadge.style.fontWeight = "500";
    const normalizedStatus = certificate.status
      ? certificate.status.toLowerCase().trim()
      : "";
    if (normalizedStatus === "signed") {
      statusBadge.style.backgroundColor = "#17a2b8";
    } else if (normalizedStatus === "for signatory") {
      statusBadge.style.backgroundColor = "#fd7e14";
    } else if (normalizedStatus === "approved") {
      statusBadge.style.backgroundColor = "#28a745";
    } else if (normalizedStatus === "for approval") {
      statusBadge.style.backgroundColor = "#ffc107";
    } else if (normalizedStatus === "sent") {
      statusBadge.style.backgroundColor = "#6f42c1";
    } else if (normalizedStatus === "resent") {
      statusBadge.style.backgroundColor = "#e83e8c";
    } else {
      statusBadge.style.backgroundColor = "#6c757d";
    }
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);
    // Actions
    const actionCell = document.createElement("td");
    actionCell.style.padding = "12px 15px";
    actionCell.style.display = "flex";
    actionCell.style.gap = "5px";
    // Preview button (not for sent or resent status)
    if (normalizedStatus !== "sent" && normalizedStatus !== "resent") {
      const previewBtn = document.createElement("button");
      previewBtn.textContent = "Preview";
      previewBtn.className = "btn btn-sm btn-outline-primary";
      previewBtn.style.padding = "0.25rem 0.5rem";
      previewBtn.style.fontSize = "0.75rem";
      previewBtn.title = "Preview certificate details";
      previewBtn.addEventListener("click", () =>
        handlePreviewCertificate(certificate)
      );
      actionCell.appendChild(previewBtn);
    }
    // Approve button (admin only, for approval status)
    if (userRole === "admin" && normalizedStatus === "for approval") {
      const approveBtn = document.createElement("button");
      approveBtn.textContent = "Approve";
      approveBtn.className = "btn btn-sm btn-success me-1";
      approveBtn.style.padding = "0.25rem 0.5rem";
      approveBtn.style.fontSize = "0.75rem";
      approveBtn.title = "Approve this certificate";
      approveBtn.addEventListener("click", () =>
        handleApproveCertificate(certificate)
      );
      actionCell.appendChild(approveBtn);
    }
    // Sign button (admin only, for signatory status)
    if (userRole === "admin" && normalizedStatus === "for signatory") {
      const signBtn = document.createElement("button");
      signBtn.textContent = "Sign";
      signBtn.className = "btn btn-sm btn-warning me-1";
      signBtn.style.padding = "0.25rem 0.5rem";
      signBtn.style.fontSize = "0.75rem";
      signBtn.title = "Upload signature for this certificate";
      signBtn.addEventListener("click", () =>
        handleSignCertificate(certificate)
      );
      actionCell.appendChild(signBtn);
    }
    // Send button (signed certificates only)
    if (normalizedStatus === "signed") {
      const sendBtn = document.createElement("button");
      sendBtn.textContent = "Send";
      sendBtn.className = "btn btn-sm btn-primary me-1";
      sendBtn.style.padding = "0.25rem 0.5rem";
      sendBtn.style.fontSize = "0.75rem";
      sendBtn.title = "Send this signed certificate";
      sendBtn.addEventListener("click", () =>
        handleSendCertificate(certificate)
      );
      actionCell.appendChild(sendBtn);
    }
    // Resend button (sent or resent certificates only)
    if (normalizedStatus === "sent" || normalizedStatus === "resent") {
      const resendBtn = document.createElement("button");
      resendBtn.textContent = "Resend";
      resendBtn.className = "btn btn-sm btn-outline-primary me-1";
      resendBtn.style.padding = "0.25rem 0.5rem";
      resendBtn.style.fontSize = "0.75rem";
      resendBtn.title = "Resend this certificate";
      resendBtn.addEventListener("click", () =>
        handleResendCertificate(certificate)
      );
      actionCell.appendChild(resendBtn);
    }
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  tableRoot.innerHTML = "";
  tableRoot.appendChild(table);
  console.log("Simple table rendered successfully");
}

// Function to generate certificate email body
function generateCertificateEmailBody(certificate) {
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
  // Get current year
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Participation</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .header h1 {
            color: #2c5282;
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 20px 0;
        }
        .content p {
            margin-bottom: 15px;
        }
        .details {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .details h3 {
            margin-top: 0;
            color: #2c5282;
        }
        .details ul {
            padding-left: 20px;
        }
        .footer {
            text-align: center;
            padding: 20px 0;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }
        .button {
            display: inline-block;
            background-color: #2c5282;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Certificate of Participation</h1>
        </div>
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
            Pollution Control Unit<br>
            San Juan, Metro Manila<br>
            Mobile No: SMART (0939) 717-2394</p>
            
            <p><img src="https://8upload.com/image/68be3f83c9e7e/freepik_br_bb4e2098-1dee-4111-8179-ddc41996d8da.png" alt="CENRO Logo" style="width: 100px; height: auto;"></p>
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

// Function to update send button state
function updateSendButtonState(certificate) {
  const sendCertificateBtn = document.getElementById("sendCertificateBtn");
  const normalizedStatus = certificate.status
    ? certificate.status.toLowerCase().trim()
    : "";
  // For sent or resent status, show the resend button
  if (normalizedStatus === "sent" || normalizedStatus === "resent") {
    sendCertificateBtn.disabled = false;
    sendCertificateBtn.className = "btn btn-primary";
    sendCertificateBtn.innerHTML = "Resend Certificate";
    sendCertificateBtn.title = "";
    // Remove any warning message if exists
    const warningMsg = document.getElementById("approvalWarning");
    if (warningMsg) {
      warningMsg.remove();
    }
  }
  // For signed status, show the send button
  else if (normalizedStatus === "signed") {
    sendCertificateBtn.disabled = false;
    sendCertificateBtn.className = "btn btn-primary";
    sendCertificateBtn.innerHTML = "Send Certificate";
    sendCertificateBtn.title = "";
    // Remove any warning message if exists
    const warningMsg = document.getElementById("approvalWarning");
    if (warningMsg) {
      warningMsg.remove();
    }
  }
  // For other statuses, disable the send button
  else {
    sendCertificateBtn.disabled = true;
    sendCertificateBtn.className = "btn btn-secondary";
    if (normalizedStatus === "for signatory") {
      sendCertificateBtn.innerHTML = `
        <i class="fas fa-pen-fancy"></i>
        Signature Required
      `;
      sendCertificateBtn.title =
        "This certificate requires a signature before it can be sent";
    } else {
      sendCertificateBtn.innerHTML = `
        <i class="fas fa-lock"></i>
        Certificate Not Ready
      `;
      sendCertificateBtn.title =
        "This certificate is not ready for sending. Please complete all required steps.";
    }
    // Add warning message
    let warningMsg = document.getElementById("approvalWarning");
    if (!warningMsg) {
      warningMsg = document.createElement("div");
      warningMsg.id = "approvalWarning";
      warningMsg.className = "alert alert-warning mt-3";
      if (normalizedStatus === "for signatory") {
        warningMsg.innerHTML = `
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Signature Required:</strong> This certificate needs to be signed by an administrator before it can be sent.
        `;
      } else {
        warningMsg.innerHTML = `
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Warning:</strong> This certificate is not ready for sending. Please complete all required steps.
        `;
      }
      const modalBody = document.querySelector(
        "#emailPreviewModal .modal-body"
      );
      modalBody.appendChild(warningMsg);
    }
  }
}

// Function to resend certificate
async function resendCertificate(certificate) {
  try {
    const subject = document.getElementById("emailSubject").value.trim();
    const body = document.getElementById("emailBody").value;
    const template = document.getElementById("certificateTemplate").value;
    if (!subject || !body) {
      showErrorMessage("Please fill in all required fields");
      return;
    }
    // Create and show resend progress modal
    const resendProgressModal = createResendProgressModal();
    document.body.appendChild(resendProgressModal);
    resendProgressModal.style.display = "block";
    // Start progress animation
    const progressBar = resendProgressModal.querySelector(".progress-bar");
    const progressPercentage = resendProgressModal.querySelector(
      ".progress-percentage"
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
      if (progressPercentage) {
        progressPercentage.textContent = `${progress}%`;
      }
      if (progress > 40 && currentStep === 0) {
        progressSteps[0].classList.remove("step-active");
        progressSteps[0].classList.add("step-completed");
        progressSteps[1].classList.add("step-active");
        currentStep = 1;
      } else if (progress > 80 && currentStep === 1) {
        progressSteps[1].classList.remove("step-active");
        progressSteps[1].classList.add("step-completed");
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
        errorData.message ||
          `Failed to resend certificate: ${response.status} ${response.statusText}`
      );
    }
    // Complete progress animation
    progressBar.style.width = "100%";
    progressBar.setAttribute("aria-valuenow", 100);
    progressPercentage.textContent = "100%";
    progressSteps.forEach((step) => {
      step.classList.remove("step-active");
      step.classList.add("step-completed");
    });
    // Show success message
    setTimeout(() => {
      resendProgressModal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Resend Complete</h5>
          </div>
          <div class="modal-body text-center">
            <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
            <h4 class="mt-3">Certificate Resent Successfully!</h4>
            <p>The certificate has been resent to ${certificate.email}.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="this.closest('.modal').style.display='none'">OK</button>
          </div>
        </div>
      `;
    }, 500);
    // Refresh data after delay
    setTimeout(() => {
      loadCertificateData();
    }, 1000);
  } catch (error) {
    console.error("Error resending certificate:", error);
    showErrorMessage(`Failed to resend certificate: ${error.message}`);
  }
}

// Helper function to create resend progress modal
function createResendProgressModal() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "block";
  modal.style.backgroundColor = "rgba(0,0,0,0.5)";
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Resending Certificate</h5>
        </div>
        <div class="modal-body">
          <div class="progress-container">
            <div class="d-flex justify-content-between mb-1">
              <span>Resending certificate</span>
              <span class="progress-percentage">0%</span>
            </div>
            <div class="progress" style="height: 10px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                   role="progressbar" 
                   style="width: 0%"
                   aria-valuenow="0" 
                   aria-valuemin="0" 
                   aria-valuemax="100"></div>
            </div>
            <div class="progress-steps mt-2 d-flex justify-content-between">
              <small class="step step-active">Preparing</small>
              <small class="step">Sending</small>
              <small class="step">Completed</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  // Close modal when clicking outside
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
  return modal;
}

// Function to setup tabs
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabPanes = document.querySelectorAll(".tab-pane");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      tabs.forEach((t) => t.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));
      this.classList.add("active");
      const tabId = this.getAttribute("data-tab");
      document.getElementById(`${tabId}-tab`).classList.add("active");
    });
  });
}

// Function to setup upload button
function setupUploadButton() {
  const uploadDataBtn = document.getElementById("uploadDataBtn");
  const uploadModal = document.getElementById("uploadModal");
  const uploadForm = document.getElementById("uploadForm");
  const uploadBtn = document.getElementById("uploadBtn");
  const closeBtns = uploadModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  if (uploadDataBtn) {
    uploadDataBtn.addEventListener("click", function () {
      uploadModal.style.display = "block";
    });
  }
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      uploadModal.style.display = "none";
    });
  });
  window.addEventListener("click", function (event) {
    if (event.target === uploadModal) {
      uploadModal.style.display = "none";
    }
  });
  if (uploadBtn) {
    uploadBtn.addEventListener("click", async function () {
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        if (!response.ok) {
          if (response.status === 401) {
            handleUnauthorizedError();
            return;
          }
          throw new Error(
            `Upload failed: ${response.status} ${response.statusText}`
          );
        }
        const result = await response.json();
        showSuccessMessage(result.message);
        uploadModal.style.display = "none";
        uploadForm.reset();
        loadCertificateData();
      } catch (error) {
        console.error("Error uploading file:", error);
        showErrorMessage(`Upload failed: ${error.message}`);
      }
    });
  }
}

// Function to setup send certificates modal
function setupSendCertificatesModal() {
  const sendCertificatesModal = document.getElementById(
    "sendCertificatesModal"
  );
  const previewEmailBtn = document.getElementById("previewEmailBtn");
  const closeBtns = sendCertificatesModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Setup close buttons
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      sendCertificatesModal.style.display = "none";
    });
  });
  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === sendCertificatesModal) {
      sendCertificatesModal.style.display = "none";
    }
  });
  // Setup preview email button
  if (previewEmailBtn) {
    previewEmailBtn.addEventListener("click", function () {
      const subject = document.getElementById("emailSubject").value.trim();
      const body = document.getElementById("emailBody").value;
      const template = document.getElementById("certificateTemplate").value;
      if (!subject || !body) {
        showErrorMessage("Please fill in all required fields");
        return;
      }
      // Use the current certificate for preview, regardless of status
      if (currentCertificate) {
        sendCertificatesModal.style.display = "none";
        handlePreviewCertificate(currentCertificate);
      } else {
        showErrorMessage("No certificate selected for preview");
      }
    });
  }
}

// Function to setup signature modal - updated for base64
function setupSignatureModal() {
  const signatureModal = document.getElementById("signatureModal");
  const signatureImageInput = document.getElementById("signatureImage");
  const signaturePreview = document.getElementById("signaturePreview");
  const uploadSignatureBtn = document.getElementById("uploadSignatureBtn");
  const closeBtns = signatureModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Handle image preview and base64 conversion
  signatureImageInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        signaturePreview.innerHTML = `<img src="${e.target.result}" alt="Signature preview" />`;
        // Store base64 for upload (remove data URL prefix)
        currentSignatureBase64 = e.target.result.split(",")[1];
      };
      reader.readAsDataURL(file);
    } else {
      signaturePreview.innerHTML = "<span>No image selected</span>";
      currentSignatureBase64 = null;
    }
  });
  // Handle modal close
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      signatureModal.style.display = "none";
    });
  });
  window.addEventListener("click", function (event) {
    if (event.target === signatureModal) {
      signatureModal.style.display = "none";
    }
  });
  // Handle signature upload - now sends base64
  uploadSignatureBtn.addEventListener("click", async function () {
    if (!currentSignatureBase64) {
      showErrorMessage("Please select a signature image to upload");
      return;
    }
    try {
      const token = getAuthToken();
      const response = await fetch("/api/certificates/upload-signature", {
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
            `Failed to upload signature: ${response.status} ${response.statusText}`
        );
      }
      const result = await response.json();
      showSuccessMessage(result.message);
      signatureModal.style.display = "none";
      loadCertificateData(); // Refresh table
    } catch (error) {
      console.error("Error uploading signature:", error);
      showErrorMessage(`Failed to upload signature: ${error.message}`);
    }
  });
}

// Function to setup email preview modal
function setupEmailPreviewModal() {
  const emailPreviewModal = document.getElementById("emailPreviewModal");
  const sendCertificateBtn = document.getElementById("sendCertificateBtn");
  const closeBtns = emailPreviewModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Setup close buttons
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      emailPreviewModal.style.display = "none";
    });
  });
  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === emailPreviewModal) {
      emailPreviewModal.style.display = "none";
    }
  });
  if (sendCertificateBtn) {
    sendCertificateBtn.addEventListener("click", async function () {
      if (!currentCertificate) {
        showErrorMessage("No certificate selected");
        return;
      }
      const normalizedStatus = currentCertificate.status
        ? currentCertificate.status.toLowerCase().trim()
        : "";
      // For sent or resent status, we can resend without any checks
      if (normalizedStatus === "sent" || normalizedStatus === "resent") {
        // Call the resend API directly
        await resendCertificate(currentCertificate);
        return;
      }
      // For signed status, proceed with the normal send flow
      if (normalizedStatus !== "signed") {
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
      // Normal send flow for signed certificates
      const originalBtnText = sendCertificateBtn.innerHTML;
      const originalBtnClass = sendCertificateBtn.className;
      sendCertificateBtn.disabled = true;
      sendCertificateBtn.className = "btn btn-success";
      sendCertificateBtn.style.cursor = "not-allowed";
      sendCertificateBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Sending...
            `;
      const existingProgressContainers = emailPreviewModal.querySelectorAll(
        ".progress-container"
      );
      existingProgressContainers.forEach((container) => {
        container.remove();
      });
      const progressContainer = document.createElement("div");
      progressContainer.className = "progress-container mt-3";
      progressContainer.innerHTML = `
                <div class="d-flex justify-content-between mb-1">
                    <span>Sending certificate</span>
                    <span class="progress-percentage">0%</span>
                </div>
                <div class="progress" style="height: 10px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                         role="progressbar" 
                         style="width: 0%"
                         aria-valuenow="0" 
                         aria-valuemin="0" 
                         aria-valuemax="100"></div>
                </div>
                <div class="progress-steps mt-2 d-flex justify-content-between">
                    <small class="step step-active">Preparing</small>
                    <small class="step">Filling Template</small>
                    <small class="step">Sending</small>
                </div>
            `;
      sendCertificateBtn.parentNode.insertBefore(
        progressContainer,
        sendCertificateBtn.nextSibling
      );
      const progressBar = progressContainer.querySelector(".progress-bar");
      const progressPercentage = progressContainer.querySelector(
        ".progress-percentage"
      );
      const progressSteps = progressContainer.querySelectorAll(".step");
      let progress = 0;
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        progress += 2;
        if (progress > 95) progress = 95;
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
          progressBar.setAttribute("aria-valuenow", progress);
        }
        if (progressPercentage) {
          progressPercentage.textContent = `${progress}%`;
        }
        if (progress > 30 && currentStep === 0) {
          progressSteps[0].classList.remove("step-active");
          progressSteps[0].classList.add("step-completed");
          progressSteps[1].classList.add("step-active");
          currentStep = 1;
        } else if (progress > 70 && currentStep === 1) {
          progressSteps[1].classList.remove("step-active");
          progressSteps[1].classList.add("step-completed");
          progressSteps[2].classList.add("step-active");
          currentStep = 2;
        }
      }, 100);
      try {
        const token = getAuthToken();
        // Use the HTML email body directly
        const response = await fetch("/api/certificates/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            certificateId: currentCertificate._id,
            subject,
            body, // HTML body
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
            errorData.message ||
              `Failed to send certificate: ${response.status} ${response.statusText}`
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
          const result = response.json();
          result.then((data) => {
            sendCertificateBtn.innerHTML = `
                            <i class="fas fa-check-circle"></i>
                            Sent Successfully
                        `;
            progressContainer.innerHTML = `
                            <div class="alert alert-success d-flex align-items-center" role="alert">
                                <i class="fas fa-check-circle me-2"></i>
                                <div>
                                    Certificate sent successfully!
                                </div>
                            </div>
                        `;
            showSuccessMessage(
              data.message || "Certificate sent successfully!"
            );
            setTimeout(() => {
              loadCertificateData().then(() => {
                emailPreviewModal.style.display = "none";
                setTimeout(() => {
                  sendCertificateBtn.innerHTML = originalBtnText;
                  sendCertificateBtn.className = originalBtnClass;
                  sendCertificateBtn.disabled = false;
                  sendCertificateBtn.style.cursor = "";
                }, 300);
              });
            }, 1000);
          });
        }, 500);
      } catch (error) {
        clearInterval(progressInterval);
        sendCertificateBtn.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to Send
                `;
        sendCertificateBtn.className = "btn btn-danger";
        progressContainer.innerHTML = `
                    <div class="alert alert-danger d-flex align-items-center" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <div>
                            Failed to send certificate. Please try again.
                        </div>
                    </div>
                `;
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
  }
  // Update the modal when it's opened to check certificate status
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (
        mutation.attributeName === "style" &&
        emailPreviewModal.style.display === "block"
      ) {
        if (currentCertificate) {
          updateSendButtonState(currentCertificate);
        }
      }
    });
  });
  observer.observe(emailPreviewModal, { attributes: true });
}

// Function to setup edit certificate modal
function setupEditCertificateModal() {
  const editModal = document.getElementById("editCertificateModal");
  const saveBtn = document.getElementById("saveCertificateBtn");
  const closeBtns = editModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Setup close buttons
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      editModal.style.display = "none";
    });
  });
  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === editModal) {
      editModal.style.display = "none";
    }
  });
  // Setup save button
  if (saveBtn) {
    saveBtn.addEventListener("click", saveEditedCertificate);
  }
}

// Function to setup refresh button
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      const icon = refreshBtn.querySelector("i");
      if (icon) {
        icon.classList.add("refreshing");
      }
      const searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.value = "";
      }
      loadCertificateData().finally(() => {
        if (icon) {
          icon.classList.remove("refreshing");
        }
      });
    });
  }
}

// Function to check authentication
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

// Function to update current page for user tracking
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
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to update current page");
      }
    })
    .catch((error) => {
      console.error("Error updating current page:", error);
    });
}

// New function to handle table updates with pagination
function updateTableWithPagination(page, size) {
  currentPage = page;
  pageSize = size;
  updateCertificateTable(getPaginatedData(filteredCertificates, page, size));
  updatePaginationControls(
    page,
    size,
    totalRecords,
    updateTableWithPagination,
    {
      pageSizeSelectId: "pageSizeSelect",
      firstPageBtnId: "firstPageBtn",
      prevPageBtnId: "prevPageBtn",
      nextPageBtnId: "nextPageBtn",
      lastPageBtnId: "lastPageBtn",
      paginationInfoId: "paginationInfo",
    }
  );
}

// Wait for DOM to be fully loaded
window.addEventListener("load", function () {
  console.log("Certifications page loaded, initializing");
  updateCurrentPage("Certificate Management");
  checkAuthentication();
  setupDropdown();
  setupLogout();
  loadCertificateData();
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
    }
  );

  // Initialize inactivity manager
  window.inactivityManager = new InactivityManager();

  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Add page visibility handling
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Page hidden - pausing session check");
    if (window.inactivityManager) {
      window.inactivityManager.stopSessionCheck();
    }
  } else {
    console.log("Page visible - resuming session check");
    if (window.inactivityManager) {
      window.inactivityManager.startSessionCheck();
      window.inactivityManager.resetInactivityTimer();
    }
  }
});
