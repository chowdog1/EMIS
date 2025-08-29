let currentYear = "2025"; // Default to 2025
let allSeminars = []; // Store all seminars for client-side operations
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let filteredSeminars = []; // Store filtered seminars for search functionality
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
// Function to get the authentication token
function getAuthToken() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }
  return token;
}
// Function to handle 401 errors
function handleUnauthorizedError() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  window.location.href = "/";
}
// Function to load seminar data
async function loadSeminarData() {
  try {
    console.log(`Loading seminar data for ${currentYear}...`);
    // Show loading state
    const tableRoot = document.getElementById("seminarTable");
    if (tableRoot) {
      tableRoot.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #6c757d">
          <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px"></i>
          <p>Loading ${currentYear} seminar data...</p>
        </div>
      `;
    }
    // Use the appropriate API endpoint based on the current year
    const apiUrl =
      currentYear === "2026" ? "/api/seminar2026" : "/api/seminar2025";
    const token = getAuthToken();
    const response = await fetch(apiUrl, {
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
        `Failed to load seminar data: ${response.status} ${response.statusText}`
      );
    }
    const seminars = await response.json();
    console.log(`Seminar data loaded for ${currentYear}:`, seminars);
    // Store all seminars
    allSeminars = seminars;
    filteredSeminars = [...seminars]; // Initialize filtered seminars with all seminars
    totalRecords = filteredSeminars.length;
    // Reset pagination
    currentPage = 1;
    // Update table with paginated data
    updateSeminarTable(getPaginatedData());
    // Update pagination controls
    updatePaginationControls();
  } catch (error) {
    console.error("Error loading seminar data:", error);
    showErrorMessage(`Failed to load seminar data: ${error.message}`);
  }
}
// Function to get paginated data
function getPaginatedData() {
  if (!filteredSeminars || filteredSeminars.length === 0) {
    return [];
  }
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return filteredSeminars.slice(startIndex, endIndex);
}
// Function to update pagination controls
function updatePaginationControls() {
  if (totalRecords === 0) {
    // Handle case when there are no records
    const paginationInfo = document.getElementById("paginationInfo");
    if (paginationInfo) {
      paginationInfo.textContent = "Showing 0 of 0 records";
    }
    // Disable all pagination buttons
    const buttons = [
      "firstPageBtn",
      "prevPageBtn",
      "nextPageBtn",
      "lastPageBtn",
    ];
    buttons.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });
    return;
  }
  const totalPages = Math.ceil(totalRecords / pageSize);
  // Update pagination info
  const paginationInfo = document.getElementById("paginationInfo");
  if (paginationInfo) {
    const startRecord = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);
    paginationInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
  }
  // Update button states
  const firstPageBtn = document.getElementById("firstPageBtn");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const lastPageBtn = document.getElementById("lastPageBtn");
  if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn)
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
  if (lastPageBtn)
    lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}
// Function to setup pagination controls
function setupPaginationControls() {
  // Set initial page size from the select element
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if (pageSizeSelect) {
    pageSize = parseInt(pageSizeSelect.value);
  }
  // First page button
  const firstPageBtn = document.getElementById("firstPageBtn");
  if (firstPageBtn) {
    firstPageBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage = 1;
        updateSeminarTable(getPaginatedData());
        updatePaginationControls();
      }
    });
  }
  // Previous page button
  const prevPageBtn = document.getElementById("prevPageBtn");
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--;
        updateSeminarTable(getPaginatedData());
        updatePaginationControls();
      }
    });
  }
  // Next page button
  const nextPageBtn = document.getElementById("nextPageBtn");
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", function () {
      const totalPages = Math.ceil(totalRecords / pageSize);
      if (currentPage < totalPages) {
        currentPage++;
        updateSeminarTable(getPaginatedData());
        updatePaginationControls();
      }
    });
  }
  // Last page button
  const lastPageBtn = document.getElementById("lastPageBtn");
  if (lastPageBtn) {
    lastPageBtn.addEventListener("click", function () {
      const totalPages = Math.ceil(totalRecords / pageSize);
      if (currentPage < totalPages) {
        currentPage = totalPages;
        updateSeminarTable(getPaginatedData());
        updatePaginationControls();
      }
    });
  }
  // Page size selector
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", function () {
      pageSize = parseInt(this.value);
      currentPage = 1; // Reset to first page
      updateSeminarTable(getPaginatedData());
      updatePaginationControls();
    });
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
  // Search on button click
  searchBtn.addEventListener("click", performSearch);
  // Search on Enter key press
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
    // If query is empty, reset to all seminars
    filteredSeminars = [...allSeminars];
  } else {
    // Filter seminars based on email or business name
    filteredSeminars = allSeminars.filter((seminar) => {
      return (
        seminar.email.toLowerCase().includes(query) ||
        seminar.businessName.toLowerCase().includes(query)
      );
    });
  }
  totalRecords = filteredSeminars.length;
  currentPage = 1; // Reset to first page
  // Update table with paginated data
  updateSeminarTable(getPaginatedData());
  // Update pagination controls
  updatePaginationControls();
}
// Function to update seminar table
function updateSeminarTable(seminars) {
  const tableRoot = document.getElementById("seminarTable");
  if (!tableRoot) {
    console.error("Seminar table root element not found");
    return;
  }
  // Check if React and ReactDOM are loaded
  if (typeof React === "undefined" || typeof ReactDOM === "undefined") {
    console.error("React or ReactDOM not loaded");
    renderSimpleTable(seminars);
    return;
  }
  try {
    // Status badge component
    const StatusBadge = ({ status }) => {
      let color = "";
      let text = status;
      // Normalize status text for consistent comparison
      const normalizedStatus = status.toLowerCase();
      if (
        normalizedStatus.includes("invitation sent") ||
        normalizedStatus === "invitation sent"
      ) {
        color = "#28a745"; // Green for invitation sent
      } else if (
        normalizedStatus.includes("uploaded") ||
        normalizedStatus === "uploaded"
      ) {
        color = "#ffc107"; // Yellow for uploaded
      } else if (
        normalizedStatus.includes("invitation resent") ||
        normalizedStatus === "invitation resent"
      ) {
        color = "#17a2b8"; // Blue for invitation resent
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
    // Action button component
    const ActionButton = ({ seminar, onResend }) => {
      const normalizedStatus = seminar.status.toLowerCase();
      // Show resend button for "invitation sent" or "invitation resent" status
      if (
        normalizedStatus.includes("invitation sent") ||
        normalizedStatus === "invitation sent" ||
        normalizedStatus.includes("invitation resent") ||
        normalizedStatus === "invitation resent"
      ) {
        return React.createElement(
          "button",
          {
            className: "btn btn-sm btn-outline-primary",
            onClick: () => onResend(seminar),
            style: {
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
            },
          },
          "Resend Invitation"
        );
      }
      return null; // Return null for other statuses
    };
    // Table component
    const App = () => {
      return React.createElement(
        "div",
        { style: { overflowX: "auto" } },
        React.createElement(
          "table",
          {
            className: "business-table",
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
            seminars.map((seminar, index) => {
              return React.createElement(
                "tr",
                {
                  key: index,
                  style: { borderBottom: "1px solid #e9ecef" },
                },
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  seminar.email
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  seminar.businessName
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  seminar.address
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(StatusBadge, { status: seminar.status })
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(ActionButton, {
                    seminar: seminar,
                    onResend: handleResendInvitation,
                  })
                )
              );
            })
          )
        )
      );
    };
    // Clear the existing content
    tableRoot.innerHTML = "";
    // Create a root for React 18
    const root = ReactDOM.createRoot(tableRoot);
    // Render the component
    root.render(React.createElement(App));
    console.log("Seminar table rendered successfully");
  } catch (error) {
    console.error("Error rendering seminar table:", error);
    renderSimpleTable(seminars);
  }
}
// Fallback function to render a simple table
function renderSimpleTable(seminars) {
  const tableRoot = document.getElementById("seminarTable");
  if (!tableRoot) {
    console.error("Seminar table root element not found");
    return;
  }
  // Create table element
  const table = document.createElement("table");
  table.className = "business-table";
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const headers = ["Email", "Business Name", "Address", "Status", "Actions"];
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
  // Create table body
  const tbody = document.createElement("tbody");
  seminars.forEach((seminar) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #e9ecef";
    // Email
    const emailCell = document.createElement("td");
    emailCell.textContent = seminar.email;
    emailCell.style.padding = "12px 15px";
    row.appendChild(emailCell);
    // Business Name
    const nameCell = document.createElement("td");
    nameCell.textContent = seminar.businessName;
    nameCell.style.padding = "12px 15px";
    row.appendChild(nameCell);
    // Address
    const addressCell = document.createElement("td");
    addressCell.textContent = seminar.address;
    addressCell.style.padding = "12px 15px";
    row.appendChild(addressCell);
    // Status
    const statusCell = document.createElement("td");
    statusCell.style.padding = "12px 15px";
    const statusBadge = document.createElement("span");
    statusBadge.textContent = seminar.status;
    statusBadge.className = "status-badge";
    statusBadge.style.display = "inline-block";
    statusBadge.style.padding = "0.25rem 0.5rem";
    statusBadge.style.borderRadius = "0.25rem";
    statusBadge.style.color = "white";
    statusBadge.style.fontSize = "0.75rem";
    statusBadge.style.fontWeight = "500";
    // Normalize status text for consistent comparison
    const normalizedStatus = seminar.status.toLowerCase();
    if (
      normalizedStatus.includes("invitation sent") ||
      normalizedStatus === "invitation sent"
    ) {
      statusBadge.style.backgroundColor = "#28a745"; // Green for invitation sent
    } else if (
      normalizedStatus.includes("uploaded") ||
      normalizedStatus === "uploaded"
    ) {
      statusBadge.style.backgroundColor = "#ffc107"; // Yellow for uploaded
    } else if (
      normalizedStatus.includes("invitation resent") ||
      normalizedStatus === "invitation resent"
    ) {
      statusBadge.style.backgroundColor = "#17a2b8"; // Blue for invitation resent
    } else {
      statusBadge.style.backgroundColor = "#6c757d"; // Gray for default
    }
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);
    // Actions
    const actionCell = document.createElement("td");
    actionCell.style.padding = "12px 15px";
    // Only show resend button for "invitation sent" or "invitation resent" status
    if (
      normalizedStatus.includes("invitation sent") ||
      normalizedStatus === "invitation sent" ||
      normalizedStatus.includes("invitation resent") ||
      normalizedStatus === "invitation resent"
    ) {
      const resendBtn = document.createElement("button");
      resendBtn.textContent = "Resend Invitation";
      resendBtn.className = "btn btn-sm btn-outline-primary";
      resendBtn.style.padding = "0.25rem 0.5rem";
      resendBtn.style.fontSize = "0.75rem";
      resendBtn.addEventListener("click", () =>
        handleResendInvitation(seminar)
      );
      actionCell.appendChild(resendBtn);
    }
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  // Clear the tableRoot and append the new table
  tableRoot.innerHTML = "";
  tableRoot.appendChild(table);
  console.log("Simple table rendered successfully");
}
// Function to handle resend invitation
function handleResendInvitation(seminar) {
  console.log("Resending invitation to:", seminar);
  // Populate the resend modal with seminar details
  document.getElementById("resendEmail").value = seminar.email;
  document.getElementById("resendBusinessName").value = seminar.businessName;
  // Set default values for the form
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  document.getElementById("resendSeminarDate").value = nextWeek
    .toISOString()
    .split("T")[0];
  document.getElementById("resendSeminarTime").value = "09:00";
  document.getElementById("resendSeminarVenue").value = "Via Zoom Meeting"; // Changed default venue
  document.getElementById("resendContactInfo").value =
    "Email: cenrosanjuanpcu@gmail.com | Phone: (0939)717-2394";
  // Generate initial email body
  generateResendEmailBody();
  // Show the modal
  const resendModal = document.getElementById("resendInvitationModal");
  resendModal.style.display = "block";
}
// Function to generate resend email body
function generateResendEmailBody() {
  const seminarDate = document.getElementById("resendSeminarDate");
  const seminarTime = document.getElementById("resendSeminarTime");
  const seminarVenue = document.getElementById("resendSeminarVenue");
  const zoomLink = document.getElementById("resendZoomLink");
  const zoomMeetingId = document.getElementById("resendZoomMeetingId");
  const zoomPassword = document.getElementById("resendZoomPassword");
  const contactInfo = document.getElementById("resendContactInfo");
  const emailBodyPreview = document.getElementById("resendEmailBodyPreview");
  const date = new Date(seminarDate.value);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = new Date(
    `2000-01-01T${seminarTime.value}`
  ).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Build event details with Zoom information included
  let eventDetails = `
    <div class="details">
      <h3>Event Details</h3>
      <ul>
        <li><strong>Date:</strong> ${formattedDate}</li>
        <li><strong>Time:</strong> ${formattedTime}</li>
        <li><strong>Venue:</strong> ${seminarVenue.value}</li>
        <li><strong>Program:</strong> 9:00 AM - 12:00 PM</li>
  `;

  // Add Zoom details to the event details if provided
  if (zoomLink.value || zoomMeetingId.value) {
    if (zoomLink.value) {
      eventDetails += `
      <li><strong>Zoom Link:</strong> <a href="${zoomLink.value}" style="color: #2c5282;">Join Zoom Meeting</a></li>
    `;
    }
    if (zoomMeetingId.value) {
      eventDetails += `
      <li><strong>Meeting ID:</strong> ${zoomMeetingId.value}</li>
    `;
    }
    if (zoomPassword.value) {
      eventDetails += `
      <li><strong>Password:</strong> ${zoomPassword.value}</li>
    `;
    }
  }
  eventDetails += `
    </ul>
  </div>
`;

  const businessName = document.getElementById("resendBusinessName").value;
  const body = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seminar Invitation</title>
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
            <h1>Business Environmental Awareness Seminar Invitation</h1>
        </div>
        <div class="content">
            <p>Isang Makakalikasang Araw, <strong>${businessName}</strong>,</p>
            <p>Thank you for registering for the CENRO Business Establishment Environmental Awareness Seminar. Below are the details for the abovementioned event.</p>
            
            ${eventDetails}
            
            <p>Please take note of the following reminders for the seminar:</p>
            <ol>
                <li>The seminar will be held via Zoom Online meetings. If you are not familiar with the Zoom software, please make sure to have someone by your side who is knowledgeable about Zoom to assist you during the session.</li>
                <li>We will only allow attendees representing multiple accounts if his/her establishments are located in the same address/building. Please allocate other attendees for another account.</li>
                <li>For proper documentation and attendance, please rename yourselves following this format: <strong>Business establishment name - your name (example: Laundrymatic Laundry Shop-Juan dela Cruz)</strong></li>
                <li>Please enter the meeting room around <strong>8:50 AM</strong>. We will only allow participants to join the session until <strong>9:20 AM</strong>.</li>
                <li>Please have a scanned copy or picture of your <strong>Tax Order of Payment ${new Date().getFullYear()}</strong> for the business/es you represent for your reference.</li>
                <li>We will conduct pre-test and post-test evaluations to gauge what you have learned during the seminar. Everyone is REQUIRED to participate in BOTH tests as this will be the basis for your attendance to the seminar.  Both tests will be done via Google Forms. The link will be provided during the seminar itself.</li>
            </ol>
            <br>
            <p>Please confirm your attendance by replying to this email or contacting our office.</p>
            <br>
            <p>We look forward to your participation in this important event.</p>
            
            <p>Best regards,<br>
            <strong>CENRO San Juan City</strong><br>
            <img src="https://i.ibb.co/PzW6YYTN/243202270-164184122563361-4894751073863392126-n.png" alt="cenro logo" style="width: 100px; height: auto;"></p>
        </div>
        <div class="footer">
            <p>This is an automated message.</p>
            <p>For inquiries, contact us at ${contactInfo.value}.</p>
            <p>© ${new Date().getFullYear()} City Government of San Juan. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  // Update preview
  emailBodyPreview.innerHTML = body;
  return body;
}
// Function to setup resend invitation modal
function setupResendInvitationModal() {
  const resendModal = document.getElementById("resendInvitationModal");
  const resendForm = document.getElementById("resendInvitationForm");
  const resendBtn = document.getElementById("resendInvitationBtn");
  const closeBtns = resendModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Form fields
  const seminarDate = document.getElementById("resendSeminarDate");
  const seminarTime = document.getElementById("resendSeminarTime");
  const seminarVenue = document.getElementById("resendSeminarVenue");
  const zoomLink = document.getElementById("resendZoomLink");
  const zoomMeetingId = document.getElementById("resendZoomMeetingId");
  const zoomPassword = document.getElementById("resendZoomPassword");
  const contactInfo = document.getElementById("resendContactInfo");
  // Add event listeners to form fields to auto-generate email body
  [
    seminarDate,
    seminarTime,
    seminarVenue,
    zoomLink,
    zoomMeetingId,
    zoomPassword,
    contactInfo,
  ].forEach((field) => {
    if (field) {
      field.addEventListener("input", generateResendEmailBody);
    }
  });
  // Close modal when clicking on close buttons
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      resendModal.style.display = "none";
    });
  });
  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === resendModal) {
      resendModal.style.display = "none";
    }
  });
  // Handle resend invitation
  if (resendBtn) {
    resendBtn.addEventListener("click", async function () {
      const email = document.getElementById("resendEmail").value;
      const subject = document.getElementById("resendSubject").value.trim();
      const body = generateResendEmailBody();
      if (!subject || !body) {
        showErrorMessage("Please fill in all required fields");
        return;
      }
      // Store original button state
      const originalBtnText = resendBtn.innerHTML;
      const originalBtnClass = resendBtn.className;
      // Make button unclickable and show sending animation
      resendBtn.disabled = true;
      resendBtn.className = "btn btn-success";
      resendBtn.style.cursor = "not-allowed";
      resendBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Sending...
      `;
      // Remove any existing progress containers
      const existingProgressContainers = resendModal.querySelectorAll(
        ".progress-container"
      );
      existingProgressContainers.forEach((container) => {
        container.remove();
      });
      // Create progress container with percentage
      const progressContainer = document.createElement("div");
      progressContainer.className = "progress-container mt-3";
      progressContainer.innerHTML = `
        <div class="d-flex justify-content-between mb-1">
          <span>Sending invitation</span>
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
          <small class="step">Completing</small>
        </div>
      `;
      // Insert progress container after the button
      resendBtn.parentNode.insertBefore(
        progressContainer,
        resendBtn.nextSibling
      );
      // Get progress elements
      const progressBar = progressContainer.querySelector(".progress-bar");
      const progressPercentage = progressContainer.querySelector(
        ".progress-percentage"
      );
      const progressSteps = progressContainer.querySelectorAll(".step");
      // Animate progress bar
      let progress = 0;
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        progress += 2;
        if (progress > 95) progress = 95; // Stop at 95% until we get a response
        // Update progress bar
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
          progressBar.setAttribute("aria-valuenow", progress);
        }
        // Update percentage text
        if (progressPercentage) {
          progressPercentage.textContent = `${progress}%`;
        }
        // Update steps
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
        // Try to use the resend-invitation endpoint first
        let apiUrl =
          currentYear === "2026"
            ? "/api/seminar2026/resend-invitation"
            : "/api/seminar2025/resend-invitation";
        let response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email,
            subject,
            body,
            seminarDetails: {
              date: seminarDate.value,
              time: seminarTime.value,
              venue: seminarVenue.value,
              zoomLink: zoomLink.value,
              zoomMeetingId: zoomMeetingId.value,
              zoomPassword: zoomPassword.value,
              contactInfo: contactInfo.value,
            },
          }),
        });
        // If the resend-invitation endpoint doesn't exist (404), fall back to the send-invitations endpoint
        if (response.status === 404) {
          console.log(
            "Resend invitation endpoint not found, falling back to send invitations endpoint"
          );
          apiUrl =
            currentYear === "2026"
              ? "/api/seminar2026/send-invitations"
              : "/api/seminar2025/send-invitations";
          response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              subject,
              body,
              seminarDetails: {
                date: seminarDate.value,
                time: seminarTime.value,
                venue: seminarVenue.value,
                zoomLink: zoomLink.value,
                zoomMeetingId: zoomMeetingId.value,
                zoomPassword: zoomPassword.value,
                contactInfo: contactInfo.value,
              },
              // Add a flag to indicate this is a single email resend
              singleEmail: email,
            }),
          });
        }
        // Complete progress bar
        clearInterval(progressInterval);
        if (!response.ok) {
          if (response.status === 401) {
            handleUnauthorizedError();
            return;
          }
          throw new Error(
            `Failed to resend invitation: ${response.status} ${response.statusText}`
          );
        }
        // Finish progress animation
        progressBar.style.width = "100%";
        progressBar.setAttribute("aria-valuenow", 100);
        progressPercentage.textContent = "100%";
        // Mark all steps as completed
        progressSteps.forEach((step) => {
          step.classList.remove("step-active");
          step.classList.add("step-completed");
        });
        // Simulate a brief delay to show completion
        setTimeout(() => {
          const result = response.json();
          result.then((data) => {
            // Show success state
            resendBtn.innerHTML = `
              <i class="fas fa-check-circle"></i>
              Invitation Resent
            `;
            // Update progress container to show success
            progressContainer.innerHTML = `
              <div class="alert alert-success d-flex align-items-center" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <div>
                  Invitation resent successfully!
                </div>
              </div>
            `;
            // Show success message
            showSuccessMessage(
              data.message || "Invitation resent successfully!"
            );
            // Refresh table data to update status automatically
            setTimeout(() => {
              loadSeminarData().then(() => {
                // After table is refreshed, close modal
                resendModal.style.display = "none";
                // Reset modal after closing
                setTimeout(() => {
                  resendBtn.innerHTML = originalBtnText;
                  resendBtn.className = originalBtnClass;
                  resendBtn.disabled = false;
                  resendBtn.style.cursor = "";
                }, 300);
              });
            }, 1000);
          });
        }, 500);
      } catch (error) {
        // Stop progress animation
        clearInterval(progressInterval);
        // Show error state
        resendBtn.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          Failed to Send
        `;
        resendBtn.className = "btn btn-danger";
        // Update progress container to show error
        progressContainer.innerHTML = `
          <div class="alert alert-danger d-flex align-items-center" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <div>
              Failed to resend invitation. Please try again.
            </div>
          </div>
        `;
        // Reset button after a delay but don't close modal
        setTimeout(() => {
          resendBtn.innerHTML = originalBtnText;
          resendBtn.className = originalBtnClass;
          resendBtn.disabled = false;
          resendBtn.style.cursor = "";
          console.error("Error resending invitation:", error);
          showErrorMessage(`Failed to resend invitation: ${error.message}`);
        }, 3000);
      }
    });
  }
}
// Function to setup year selection
function setupYearSelection() {
  const yearSelect = document.getElementById("yearSelect");
  if (yearSelect) {
    // Set the current value
    yearSelect.value = currentYear;
    // Add change event listener
    yearSelect.addEventListener("change", function () {
      currentYear = this.value;
      console.log(`Year changed to ${currentYear}`);
      // Show a brief loading message
      const tableRoot = document.getElementById("seminarTable");
      if (tableRoot) {
        tableRoot.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #6c757d">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px"></i>
            <p>Loading ${currentYear} seminar data...</p>
          </div>
        `;
      }
      // Load data for the selected year
      loadSeminarData();
    });
  }
}
// Function to setup refresh button
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      // Add spinning animation to the icon
      const icon = refreshBtn.querySelector("i");
      if (icon) {
        icon.classList.add("refreshing");
      }
      // Clear the search input field
      const searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.value = "";
      }
      // Reload the data
      loadSeminarData().finally(() => {
        // Remove spinning animation
        if (icon) {
          icon.classList.remove("refreshing");
        }
      });
    });
  }
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
  // Close modal when clicking on close buttons
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      uploadModal.style.display = "none";
    });
  });
  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === uploadModal) {
      uploadModal.style.display = "none";
    }
  });
  // Handle upload
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
        const apiUrl =
          currentYear === "2026"
            ? "/api/seminar2026/upload"
            : "/api/seminar2025/upload";
        const response = await fetch(apiUrl, {
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
        loadSeminarData(); // Refresh table
      } catch (error) {
        console.error("Error uploading file:", error);
        showErrorMessage(`Upload failed: ${error.message}`);
      }
    });
  }
}
// Function to reset send invitations modal
function resetSendInvitationsModal() {
  const sendInvitationsModal = document.getElementById("sendInvitationsModal");
  const invitationForm = document.getElementById("invitationForm");
  const sendInvitationsBtn = document.getElementById("sendInvitationsBtn");
  // Remove any existing progress containers
  const existingProgressContainers = sendInvitationsModal.querySelectorAll(
    ".progress-container"
  );
  existingProgressContainers.forEach((container) => {
    container.remove();
  });
  // Reset form
  invitationForm.reset();
  // Reset button to original state
  sendInvitationsBtn.disabled = false;
  sendInvitationsBtn.className = "btn btn-primary";
  sendInvitationsBtn.style.cursor = "";
  sendInvitationsBtn.innerHTML = "Send Invitations";
  // Set default values
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const seminarDate = document.getElementById("seminarDate");
  const seminarTime = document.getElementById("seminarTime");
  const seminarVenue = document.getElementById("seminarVenue");
  const contactInfo = document.getElementById("contactInfo");
  if (seminarDate) seminarDate.value = nextWeek.toISOString().split("T")[0];
  if (seminarTime) seminarTime.value = "09:00";
  if (seminarVenue) seminarVenue.value = "Via Zoom Meeting"; // Changed default venue
  if (contactInfo)
    contactInfo.value =
      "Email: cenrosanjuanpcu@gmail.com | Mobile: (0939)717-2394";
  // Generate initial email body
  const generateEmailBody =
    window.generateEmailBody ||
    function () {
      // Fallback if the function isn't defined yet
      console.log("Email body generation function not available yet");
    };
  generateEmailBody();
}
// Function to setup send invitations button
function setupSendInvitationsButton() {
  const sendInvitationsDataBtn = document.getElementById(
    "sendInvitationsDataBtn"
  );
  const sendInvitationsModal = document.getElementById("sendInvitationsModal");
  const invitationForm = document.getElementById("invitationForm");
  const sendInvitationsBtn = document.getElementById("sendInvitationsBtn");
  const closeBtns = sendInvitationsModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Form fields
  const seminarDate = document.getElementById("seminarDate");
  const seminarTime = document.getElementById("seminarTime");
  const seminarVenue = document.getElementById("seminarVenue");
  const zoomLink = document.getElementById("zoomLink");
  const zoomMeetingId = document.getElementById("zoomMeetingId");
  const zoomPassword = document.getElementById("zoomPassword");
  const contactInfo = document.getElementById("contactInfo");
  const emailBodyPreview = document.getElementById("emailBodyPreview");
  // Make generateEmailBody globally accessible for reset function
  window.generateEmailBody = function () {
    const date = new Date(seminarDate.value);
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = new Date(
      `2000-01-01T${seminarTime.value}`
    ).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    // Add this line to define businessName
    const businessName = "{{businessName}}"; // This is a placeholder that will be replaced when sending emails

    // Build event details with Zoom information included
    let eventDetails = `
      <div class="details">
        <h3>Event Details</h3>
        <ul>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${formattedTime}</li>
          <li><strong>Venue:</strong> ${seminarVenue.value}</li>
          <li><strong>Program:</strong> 9:00 AM - 12:00 PM</li>
    `;

    // Add Zoom details to the event details if provided
    if (zoomLink.value || zoomMeetingId.value) {
      if (zoomLink.value) {
        eventDetails += `
      <li><strong>Zoom Link:</strong> <a href="${zoomLink.value}" style="color: #2c5282;">Join Zoom Meeting</a></li>
    `;
      }
      if (zoomMeetingId.value) {
        eventDetails += `
      <li><strong>Meeting ID:</strong> ${zoomMeetingId.value}</li>
    `;
      }
      if (zoomPassword.value) {
        eventDetails += `
      <li><strong>Password:</strong> ${zoomPassword.value}</li>
    `;
      }
    }
    eventDetails += `
    </ul>
  </div>
`;

    const body = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seminar Invitation</title>
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
            <h1>Business Environmental Awareness Seminar Invitation</h1>
        </div>
        <div class="content">
            <p>Isang Makakalikasang Araw, <strong>${businessName}</strong>,</p>
            <p>Thank you for registering for the CENRO Business Establishment Environmental Awareness Seminar. Below are the details for the abovementioned event.</p>
            
            ${eventDetails}
            
            <p>Please take note of the following reminders for the seminar:</p>
            <ol>
                <li>The seminar will be held via Zoom Online meetings. If you are not familiar with the Zoom software, please make sure to have someone by your side who is knowledgeable about Zoom to assist you during the session.</li>
                <li>We will only allow attendees representing multiple accounts if his/her establishments are located in the same address/building. Please allocate other attendees for another account.</li>
                <li>For proper documentation and attendance, please rename yourselves following this format: <strong>Business establishment name - your name (example: Laundrymatic Laundry Shop-Juan dela Cruz)</strong></li>
                <li>Please enter the meeting room around <strong>8:50 AM</strong>. We will only allow participants to join the session until <strong>9:20 AM</strong>.</li>
                <li>Please have a scanned copy or picture of your <strong>Tax Order of Payment ${new Date().getFullYear()}</strong> for the business/es you represent for your reference.</li>
                <li>We will conduct pre-test and post-test evaluations to gauge what you have learned during the seminar. Everyone is REQUIRED to participate in BOTH tests as this will be the basis for your attendance to the seminar.  Both tests will be done via Google Forms. The link will be provided during the seminar itself.</li>
            </ol>
            <br>
            <p>Please confirm your attendance by replying to this email or contacting our office.</p>
            <br>
            <p>We look forward to your participation in this important event.</p>
            
            <p>Best regards,<br>
            <strong>CENRO San Juan City</strong><br>
            <img src="https://i.ibb.co/PzW6YYTN/243202270-164184122563361-4894751073863392126-n.png" alt="cenro logo" style="width: 100px; height: auto;">
            </p>
        </div>
        <div class="footer">
            <p>This is an automated message.</p>
            <p>For inquiries, contact us at ${contactInfo.value}.</p>
            <p>© ${new Date().getFullYear()} City Government of San Juan. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
    // Update preview
    emailBodyPreview.innerHTML = body;
    return body;
  };
  // Add event listeners to form fields to auto-generate email body
  [
    seminarDate,
    seminarTime,
    seminarVenue,
    zoomLink,
    zoomMeetingId,
    zoomPassword,
    contactInfo,
  ].forEach((field) => {
    if (field) {
      field.addEventListener("input", window.generateEmailBody);
    }
  });
  // Initialize modal on open
  if (sendInvitationsDataBtn) {
    sendInvitationsDataBtn.addEventListener("click", function () {
      // Reset modal before opening
      resetSendInvitationsModal();
      sendInvitationsModal.style.display = "block";
    });
  }
  // Close modal when clicking on close buttons
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      sendInvitationsModal.style.display = "none";
    });
  });
  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === sendInvitationsModal) {
      sendInvitationsModal.style.display = "none";
    }
  });
  // Handle send invitations
  if (sendInvitationsBtn) {
    sendInvitationsBtn.addEventListener("click", async function () {
      const subject = document.getElementById("emailSubject").value.trim();
      const body = window.generateEmailBody();
      if (!subject || !body) {
        showErrorMessage("Please fill in all required fields");
        return;
      }
      // Store original button state
      const originalBtnText = sendInvitationsBtn.innerHTML;
      const originalBtnClass = sendInvitationsBtn.className;
      // Make button unclickable and show sending animation
      sendInvitationsBtn.disabled = true;
      sendInvitationsBtn.className = "btn btn-success";
      sendInvitationsBtn.style.cursor = "not-allowed";
      sendInvitationsBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Sending...
      `;
      // Remove any existing progress containers
      const existingProgressContainers = sendInvitationsModal.querySelectorAll(
        ".progress-container"
      );
      existingProgressContainers.forEach((container) => {
        container.remove();
      });
      // Create progress container with percentage
      const progressContainer = document.createElement("div");
      progressContainer.className = "progress-container mt-3";
      progressContainer.innerHTML = `
        <div class="d-flex justify-content-between mb-1">
          <span>Sending invitations</span>
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
          <small class="step">Completing</small>
        </div>
      `;
      // Insert progress container after the button
      sendInvitationsBtn.parentNode.insertBefore(
        progressContainer,
        sendInvitationsBtn.nextSibling
      );
      // Get progress elements
      const progressBar = progressContainer.querySelector(".progress-bar");
      const progressPercentage = progressContainer.querySelector(
        ".progress-percentage"
      );
      const progressSteps = progressContainer.querySelectorAll(".step");
      // Animate progress bar
      let progress = 0;
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        progress += 2;
        if (progress > 95) progress = 95; // Stop at 95% until we get a response
        // Update progress bar
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
          progressBar.setAttribute("aria-valuenow", progress);
        }
        // Update percentage text
        if (progressPercentage) {
          progressPercentage.textContent = `${progress}%`;
        }
        // Update steps
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
        const apiUrl =
          currentYear === "2026"
            ? "/api/seminar2026/send-invitations"
            : "/api/seminar2025/send-invitations";
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject,
            body,
            seminarDetails: {
              date: seminarDate.value,
              time: seminarTime.value,
              venue: seminarVenue.value,
              zoomLink: zoomLink.value,
              zoomMeetingId: zoomMeetingId.value,
              zoomPassword: zoomPassword.value,
              contactInfo: contactInfo.value,
            },
          }),
        });
        // Complete progress bar
        clearInterval(progressInterval);
        if (!response.ok) {
          if (response.status === 401) {
            handleUnauthorizedError();
            return;
          }
          throw new Error(
            `Failed to send invitations: ${response.status} ${response.statusText}`
          );
        }
        // Finish progress animation
        progressBar.style.width = "100%";
        progressBar.setAttribute("aria-valuenow", 100);
        progressPercentage.textContent = "100%";
        // Mark all steps as completed
        progressSteps.forEach((step) => {
          step.classList.remove("step-active");
          step.classList.add("step-completed");
        });
        // Simulate a brief delay to show completion
        setTimeout(() => {
          const result = response.json();
          result.then((data) => {
            // Show success state
            sendInvitationsBtn.innerHTML = `
              <i class="fas fa-check-circle"></i>
              Sent Successfully
            `;
            // Update progress container to show success
            progressContainer.innerHTML = `
              <div class="alert alert-success d-flex align-items-center" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <div>
                  Invitations sent successfully!
                </div>
              </div>
            `;
            // Show success message
            showSuccessMessage(data.message);
            // Refresh table data to update status automatically
            setTimeout(() => {
              loadSeminarData().then(() => {
                // After table is refreshed, close modal and reset
                sendInvitationsModal.style.display = "none";
                // Reset modal after closing
                setTimeout(() => {
                  resetSendInvitationsModal();
                }, 300);
              });
            }, 1000);
          });
        }, 500);
      } catch (error) {
        // Stop progress animation
        clearInterval(progressInterval);
        // Show error state
        sendInvitationsBtn.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          Failed to Send
        `;
        sendInvitationsBtn.className = "btn btn-danger";
        // Update progress container to show error
        progressContainer.innerHTML = `
          <div class="alert alert-danger d-flex align-items-center" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <div>
              Failed to send invitations. Please try again.
            </div>
          </div>
        `;
        // Reset button after a delay but don't close modal
        setTimeout(() => {
          sendInvitationsBtn.innerHTML = originalBtnText;
          sendInvitationsBtn.className = originalBtnClass;
          sendInvitationsBtn.disabled = false;
          sendInvitationsBtn.style.cursor = "";
          console.error("Error sending invitations:", error);
          showErrorMessage(`Failed to send invitations: ${error.message}`);
        }, 3000);
      }
    });
  }
}
// Function to show success message
function showSuccessMessage(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert alert-success";
  alertDiv.style.position = "fixed";
  alertDiv.style.top = "20px";
  alertDiv.style.right = "20px";
  alertDiv.style.padding = "15px 20px";
  alertDiv.style.backgroundColor = "var(--success)";
  alertDiv.style.color = "white";
  alertDiv.style.borderRadius = "var(--border-radius-md)";
  alertDiv.style.boxShadow = "var(--shadow-lg)";
  alertDiv.style.zIndex = "10001";
  alertDiv.style.display = "flex";
  alertDiv.style.alignItems = "center";
  alertDiv.style.gap = "10px";
  alertDiv.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(alertDiv);
  setTimeout(() => {
    alertDiv.style.opacity = "0";
    alertDiv.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(alertDiv);
    }, 500);
  }, 3000);
}
// Function to show error message
function showErrorMessage(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert alert-danger";
  alertDiv.style.position = "fixed";
  alertDiv.style.top = "20px";
  alertDiv.style.right = "20px";
  alertDiv.style.padding = "15px 20px";
  alertDiv.style.backgroundColor = "var(--danger)";
  alertDiv.style.color = "white";
  alertDiv.style.borderRadius = "var(--border-radius-md)";
  alertDiv.style.boxShadow = "var(--shadow-lg)";
  alertDiv.style.zIndex = "10001";
  alertDiv.style.display = "flex";
  alertDiv.style.alignItems = "center";
  alertDiv.style.gap = "10px";
  alertDiv.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(alertDiv);
  setTimeout(() => {
    alertDiv.style.opacity = "0";
    alertDiv.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(alertDiv);
    }, 500);
  }, 5000);
}
// Function to setup dropdown functionality
function setupDropdown() {
  const userDropdown = document.getElementById("userDropdown");
  const userDropdownMenu = document.getElementById("userDropdownMenu");
  if (!userDropdown || !userDropdownMenu) {
    console.error("Dropdown elements not found");
    return;
  }
  userDropdown.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    userDropdownMenu.classList.toggle("show");
    document.addEventListener("click", function closeDropdown(e) {
      if (!e.target.closest(".user-dropdown")) {
        userDropdownMenu.classList.remove("show");
        document.removeEventListener("click", closeDropdown);
      }
    });
  });
}
// Function to setup logout functionality
function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) {
    console.error("Logout button not found");
    return;
  }
  logoutBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        // Call the logout API endpoint to invalidate the session on the server
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          console.error(
            "Logout API call failed:",
            response.status,
            response.statusText
          );
        }
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Always remove tokens and redirect, even if the API call fails
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
    }
  });
}
// Function to check if token is expired
function isTokenExpired(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return true;
    }
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) {
      return true;
    }
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    console.error("Error checking token expiration:", e);
    return true;
  }
}
// Function to verify token with server
function verifyTokenWithServer(token) {
  return fetch("/api/auth/verify-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (response.ok) {
        console.log("Token verification successful");
      } else {
        console.log("Token verification failed, status:", response.status);
        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_data");
          window.location.href = "/";
        }
      }
    })
    .catch((error) => {
      console.error("Error verifying token:", error);
    });
}
// Function to update the date and time display
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  const dateTimeString = now.toLocaleDateString("en-US", options);
  const datetimeElement = document.getElementById("datetime");
  if (datetimeElement) {
    datetimeElement.textContent = dateTimeString;
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
// Function to update user interface
async function updateUserInterface(user) {
  const userEmailElement = document.getElementById("userEmail");
  const userAvatarImage = document.getElementById("userAvatarImage");
  const userAvatarFallback = document.getElementById("userAvatarFallback");
  const greeting = getTimeBasedGreeting();
  const displayName = user.firstname || user.email;
  if (userEmailElement) {
    userEmailElement.textContent = `${greeting}, ${displayName}!`;
  }
  updateUserAvatar(user, userAvatarImage, userAvatarFallback);
}
// Function to get time-based greeting
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  } else if (hour < 18) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
}
// Helper function to get user initials
function getUserInitials(user) {
  if (user.firstname && user.lastname) {
    return `${user.firstname.charAt(0)}${user.lastname.charAt(
      0
    )}`.toUpperCase();
  } else if (user.firstname) {
    return user.firstname.charAt(0).toUpperCase();
  } else if (user.lastname) {
    return user.lastname.charAt(0).toUpperCase();
  } else {
    return user.email.charAt(0).toUpperCase();
  }
}
// Helper function to update user avatar
async function updateUserAvatar(user, imageElement, fallbackElement) {
  if (!imageElement || !fallbackElement) {
    console.error("Avatar elements not found");
    return;
  }
  if (user.hasProfilePicture) {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        showFallbackAvatar(user, fallbackElement);
        return;
      }
      const response = await fetch(`/api/auth/profile-picture/${user.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        imageElement.src = imageUrl;
        imageElement.style.display = "block";
        fallbackElement.style.display = "none";
      } else {
        showFallbackAvatar(user, fallbackElement);
      }
    } catch (error) {
      console.error("Error loading profile picture:", error);
      showFallbackAvatar(user, fallbackElement);
    }
  } else {
    showFallbackAvatar(user, fallbackElement);
  }
}
// Show fallback avatar with initials
function showFallbackAvatar(user, fallbackElement) {
  const initials = getUserInitials(user);
  fallbackElement.textContent = initials;
  fallbackElement.style.display = "flex";
  fallbackElement.style.alignItems = "center";
  fallbackElement.style.justifyContent = "center";
  const imageElement = document.getElementById("userAvatarImage");
  if (imageElement) {
    imageElement.style.display = "none";
  }
}
// Wait for DOM to be fully loaded
window.addEventListener("load", function () {
  console.log("Seminars page loaded, initializing");
  // Update current page for user tracking
  updateCurrentPage("Seminar Invitations");
  // Check if user is logged in
  checkAuthentication();
  // Setup dropdown functionality
  setupDropdown();
  // Setup logout functionality
  setupLogout();
  // Initialize seminar table
  loadSeminarData();
  // Setup year selection
  setupYearSelection();
  // Setup refresh button
  setupRefreshButton();
  // Setup upload button
  setupUploadButton();
  // Setup send invitations button
  setupSendInvitationsButton();
  // Setup search functionality
  setupSearch();
  // Setup pagination controls
  setupPaginationControls();
  // Setup resend invitation modal
  setupResendInvitationModal();
  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
});
