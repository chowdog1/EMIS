// businesses.js
const logoUrls = [
  "https://upload.wikimedia.org/wikipedia/commons/b/b1/Bagong_Pilipinas_logo.png",
  "https://upload.wikimedia.org/wikipedia/commons/3/34/Seal_of_San_Juan%2C_Metro_Manila.png",
  "/makabagong%20san%20juan%20Logo.png",
];

// Automatically detect current year and set as default (within supported range 2025-2030)
let currentYear = new Date().getFullYear().toString();
if (currentYear < "2025") {
  currentYear = "2025";
} else if (currentYear > "2030") {
  currentYear = "2030";
}
console.log("Current year set to:", currentYear);

// Pagination variables - Global scope
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let allBusinesses = []; // Store all businesses for client-side pagination

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

// Wait for DOM to be fully loaded
window.addEventListener("load", function () {
  console.log("Businesses page loaded, initializing");
  // Update current page for user tracking
  updateCurrentPage("Business Directory");
  // Preload logos
  preloadLogos();
  // Check if user is logged in
  checkAuthentication();
  // Setup dropdown functionality
  setupDropdown();
  // Setup logout functionality
  setupLogout();
  // Initialize business table
  initializeBusinessTable();
  // Setup search functionality
  setupSearch();
  // Setup modal event listeners
  setupModalEventListeners();
  // Setup year selection
  setupYearSelection();
  // Set the year dropdown value to match current year
  setYearDropdownValue();
  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Initialize account lock notifier
if (typeof initAccountLockNotifier === "function") {
  console.log("Initializing account lock notifier");
  initAccountLockNotifier();
} else {
  console.error("Account lock notifier function not found");
}

// Function to initialize business table
function initializeBusinessTable() {
  console.log("Initializing business table");
  // Setup pagination controls first to set the initial page size
  setupPaginationControls(
    currentPage,
    pageSize,
    totalRecords,
    updateTableWithPagination
  );
  // Setup refresh button
  setupRefreshButton();
  // Load initial data
  loadBusinessData();
  // Setup add business button
  setupAddBusinessButton();
}

// Function to update table with pagination - callback for pagination controls
function updateTableWithPagination(page, size) {
  console.log(`Updating table with page ${page}, size ${size}`);
  // Update current page and page size
  currentPage = page;
  pageSize = size;
  // Get paginated data
  const paginatedData = getPaginatedData(allBusinesses, currentPage, pageSize);
  // Update table
  updateBusinessTable(paginatedData);
  // Update pagination controls with the callback function
  updatePaginationControls(
    currentPage,
    pageSize,
    totalRecords,
    updateTableWithPagination
  );
  // Re-setup pagination button event listeners to ensure they have the latest state
  setupPaginationButtonListeners(
    currentPage,
    pageSize,
    totalRecords,
    updateTableWithPagination
  );
}

// Function to load business data
async function loadBusinessData() {
  try {
    console.log(`Loading business data for ${currentYear}...`);
    console.log("Current page size:", pageSize);
    // Show loading state
    const tableRoot = document.getElementById("businessTable");
    if (tableRoot) {
      tableRoot.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #6c757d;">
          <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
          <p>Loading ${currentYear} business data...</p>
        </div>
      `;
    }

    // Use the appropriate API endpoint based on the current year
    const apiUrl = `/api/business${currentYear}`;
    const token = getAuthToken();
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(
        `Failed to load business data: ${response.status} ${response.statusText}`
      );
    }
    const businesses = await response.json();
    console.log(`Business data loaded for ${currentYear}:`, businesses);
    console.log("Number of businesses:", businesses.length);
    // Store all businesses for client-side pagination
    allBusinesses = businesses;
    totalRecords = businesses.length;
    // Reset to first page
    currentPage = 1;
    // Update table with paginated data
    const paginatedData = getPaginatedData(
      allBusinesses,
      currentPage,
      pageSize
    );
    updateBusinessTable(paginatedData);
    // Update pagination controls
    updatePaginationControls(
      currentPage,
      pageSize,
      totalRecords,
      updateTableWithPagination
    );
  } catch (error) {
    console.error("Error loading business data:", error);
    // Show error message in table
    showTableError(`Failed to load business data: ${error.message}`);
  }
}

// Function to set the year dropdown value
function setYearDropdownValue() {
  const yearSelect = document.getElementById("yearSelect");
  if (yearSelect) {
    yearSelect.value = currentYear;
    console.log(`Year dropdown set to: ${currentYear}`);
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
      const tableRoot = document.getElementById("businessTable");
      if (tableRoot) {
        tableRoot.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #6c757d;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>Loading ${currentYear} business data...</p>
          </div>
        `;
      }
      // Load data for the selected year
      loadBusinessData();
    });
  }
}

// Function to update business table using React
function updateBusinessTable(businesses) {
  const tableRoot = document.getElementById("businessTable");
  if (!tableRoot) {
    console.error("Business table root element not found");
    return;
  }
  // Check if React and ReactDOM are loaded
  if (typeof React === "undefined" || typeof ReactDOM === "undefined") {
    console.error("React or ReactDOM not loaded");
    renderSimpleTable(businesses);
    return;
  }
  try {
    // Status badge component
    const StatusBadge = ({ status }) => {
      let color = "";
      let text = status;
      switch (status) {
        case "HIGHRISK":
          color = "#dc3545";
          text = "HIGHRISK";
          break;
        case "LOWRISK":
          color = "#28a745";
          text = "LOWRISK";
          break;
        default:
          color = "#6c757d";
      }
      return React.createElement(
        "span",
        {
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
    // Clickable Account Number component
    const ClickableAccountNo = ({ accountNo, onClick }) => {
      return React.createElement(
        "a",
        {
          href: "#",
          style: {
            color: "var(--primary-green)",
            fontWeight: "500",
            cursor: "pointer",
            textDecoration: "underline",
            transition: "color 0.2s",
          },
          onClick: (e) => {
            e.preventDefault();
            onClick(accountNo);
          },
        },
        accountNo
      );
    };
    // Table component with clickable account numbers
    const App = () => {
      return React.createElement(
        "div",
        { style: { overflowX: "auto" } },
        React.createElement(
          "table",
          {
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
                "Account No"
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
                "Owner"
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
                "Barangay"
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
                "Nature of Business"
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
                "Application Status"
              )
            )
          ),
          React.createElement(
            "tbody",
            null,
            businesses.map((business, index) => {
              // normalized and original field names
              const accountNo =
                business["accountNo"] || business["ACCOUNT NO"] || "N/A";
              const businessName =
                business["businessName"] ||
                business["NAME OF BUSINESS"] ||
                "N/A";
              const ownerName =
                business["ownerName"] || business["NAME OF OWNER"] || "N/A";
              const barangay =
                business["barangay"] || business["BARANGAY"] || "N/A";
              const natureOfBusiness =
                business["natureOfBusiness"] ||
                business["NATURE OF BUSINESS"] ||
                "N/A";
              const status = business["status"] || business["STATUS"] || "";
              const applicationStatus =
                business["applicationStatus"] ||
                business["APPLICATION STATUS"] ||
                "N/A";
              return React.createElement(
                "tr",
                {
                  key: index,
                  style: { borderBottom: "1px solid #e9ecef" },
                },
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(ClickableAccountNo, {
                    accountNo: accountNo,
                    onClick: showBusinessDetails,
                  })
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  businessName
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  ownerName
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  barangay
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  natureOfBusiness
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  React.createElement(StatusBadge, { status: status })
                ),
                React.createElement(
                  "td",
                  { style: { padding: "12px 15px" } },
                  applicationStatus
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
    console.log("Business table rendered successfully");
  } catch (error) {
    console.error("Error rendering business table:", error);
    console.error("Error details:", error.message, error.stack);
    renderSimpleTable(businesses);
  }
}

// Also update the renderSimpleTable function to include the new columns
function renderSimpleTable(businesses) {
  const tableRoot = document.getElementById("businessTable");
  if (!tableRoot) {
    console.error("Business table root element not found");
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
  // Updated headers without OR No and Amount Paid
  const headers = [
    "Account No",
    "Business Name",
    "Owner",
    "Barangay",
    "Nature of Business",
    "Status",
    "Application Status",
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
  // Create table body
  const tbody = document.createElement("tbody");
  // Use the businesses passed to this function (already paginated)
  businesses.forEach((business) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #e9ecef";
    // Account No (clickable)
    const accountCell = document.createElement("td");
    accountCell.style.padding = "12px 15px";
    const accountNo = business["accountNo"] || business["ACCOUNT NO"] || "N/A";
    const accountLink = document.createElement("a");
    accountLink.href = "#";
    accountLink.textContent = accountNo;
    accountLink.className = "clickable-account";
    accountLink.onclick = (e) => {
      e.preventDefault();
      showBusinessDetails(accountNo);
    };
    accountCell.appendChild(accountLink);
    row.appendChild(accountCell);
    // Business Name
    const nameCell = document.createElement("td");
    nameCell.textContent =
      business["businessName"] || business["NAME OF BUSINESS"] || "N/A";
    nameCell.style.padding = "12px 15px";
    row.appendChild(nameCell);
    // Owner
    const ownerCell = document.createElement("td");
    ownerCell.textContent =
      business["ownerName"] || business["NAME OF OWNER"] || "N/A";
    ownerCell.style.padding = "12px 15px";
    row.appendChild(ownerCell);
    // Barangay
    const barangayCell = document.createElement("td");
    barangayCell.textContent =
      business["barangay"] || business["BARANGAY"] || "N/A";
    barangayCell.style.padding = "12px 15px";
    row.appendChild(barangayCell);
    // Nature of Business
    const natureCell = document.createElement("td");
    natureCell.textContent =
      business["natureOfBusiness"] || business["NATURE OF BUSINESS"] || "N/A";
    natureCell.style.padding = "12px 15px";
    row.appendChild(natureCell);
    // Status
    const statusCell = document.createElement("td");
    statusCell.style.padding = "12px 15px";
    const status = business["status"] || business["STATUS"] || "";
    let statusBadge = document.createElement("span");
    statusBadge.textContent =
      status === "HIGHRISK"
        ? "High Risk"
        : status === "LOWRISK"
        ? "Low Risk"
        : status;
    statusBadge.style.display = "inline-block";
    statusBadge.style.padding = "0.25rem 0.5rem";
    statusBadge.style.borderRadius = "0.25rem";
    statusBadge.style.color = "white";
    statusBadge.style.fontSize = "0.75rem";
    statusBadge.style.fontWeight = "500";
    if (status === "HIGHRISK") {
      statusBadge.style.backgroundColor = "#dc3545";
    } else if (status === "LOWRISK") {
      statusBadge.style.backgroundColor = "#28a745";
    } else {
      statusBadge.style.backgroundColor = "#6c757d";
    }
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);
    // Application Status
    const appStatusCell = document.createElement("td");
    appStatusCell.textContent =
      business["applicationStatus"] || business["APPLICATION STATUS"] || "N/A";
    appStatusCell.style.padding = "12px 15px";
    row.appendChild(appStatusCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  // Clear the tableRoot and append the new table
  tableRoot.innerHTML = "";
  tableRoot.appendChild(table);
  console.log("Simple table rendered successfully");
}

// Function to show business details modal
async function showBusinessDetails(accountNo) {
  try {
    console.log(
      `Fetching details for account number: ${accountNo} from ${currentYear}`
    );
    const token = getAuthToken();
    const response = await fetch(
      `/api/business${currentYear}/account/${encodeURIComponent(accountNo)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      throw new Error("Failed to fetch business details");
    }
    const business = await response.json();
    console.log("Business details:", business);
    // Populate modal with business details - try both camelCase and original property names
    document.getElementById("modalAccountNo").textContent =
      business.accountNo || business["ACCOUNT NO"] || "N/A";
    document.getElementById("modalBusinessName").textContent =
      business.businessName || business["NAME OF BUSINESS"] || "N/A";
    document.getElementById("modalOwnerName").textContent =
      business.ownerName || business["NAME OF OWNER"] || "N/A";
    document.getElementById("modalAddress").textContent =
      business.address || business.ADDRESS || "N/A";
    document.getElementById("modalBarangay").textContent =
      business.barangay || business.BARANGAY || "N/A";
    document.getElementById("modalNatureOfBusiness").textContent =
      business.natureOfBusiness || business["NATURE OF BUSINESS"] || "N/A";
    document.getElementById("modalStatus").textContent =
      business.status || business.STATUS || "N/A";
    document.getElementById("modalApplicationStatus").textContent =
      business.applicationStatus || business["APPLICATION STATUS"] || "N/A";
    // Format dates if they exist
    const dateOfApplication =
      business.dateOfApplication || business["DATE OF APPLICATION"];
    document.getElementById("modalDateOfApplication").textContent =
      dateOfApplication
        ? new Date(dateOfApplication).toLocaleDateString()
        : "N/A";
    document.getElementById("modalOrNo").textContent =
      business.orNo || business["OR NO"] || "N/A";
    document.getElementById("modalAmountPaid").textContent =
      business.amountPaid || business["AMOUNT PAID"] || "N/A";
    const dateOfPayment = business.dateOfPayment || business["DATE OF PAYMENT"];
    document.getElementById("modalDateOfPayment").textContent = dateOfPayment
      ? new Date(dateOfPayment).toLocaleDateString()
      : "N/A";
    document.getElementById("modalRemarks").textContent =
      business.remarks || business.REMARKS || "N/A";
    // Show the modal
    const modal = document.getElementById("businessDetailsModal");
    modal.style.display = "block";
    // Setup delete button event listener after modal is shown
    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
      // Remove any existing event listeners to prevent duplicates
      const newDeleteBtn = deleteBtn.cloneNode(true);
      deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
      // Add event listener to the new button
      newDeleteBtn.addEventListener("click", handleDelete);
      console.log("Delete button event listener attached");
    } else {
      console.error("Delete button not found in modal");
    }
  } catch (error) {
    console.error("Error fetching business details:", error);
    showErrorMessage(`Failed to fetch business details: ${error.message}`);
  }
}

// Function to setup modal event listeners
function setupModalEventListeners() {
  // Get business details modal elements
  const detailsModal = document.getElementById("businessDetailsModal");
  const detailsCloseBtns = detailsModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Add click event to close buttons for details modal
  detailsCloseBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      detailsModal.style.display = "none";
    });
  });
  // Get business edit modal elements
  const editModal = document.getElementById("businessEditModal");
  const editCloseBtns = editModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Add click event to close buttons for edit modal
  editCloseBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      editModal.style.display = "none";
    });
  });
  // Get business add modal elements
  const addModal = document.getElementById("businessAddModal");
  const addCloseBtns = addModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  // Add click event to close buttons for add modal
  addCloseBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      addModal.style.display = "none";
    });
  });
  // Close modals when clicking outside of them
  window.addEventListener("click", function (event) {
    if (event.target === detailsModal) {
      detailsModal.style.display = "none";
    }
    if (event.target === editModal) {
      editModal.style.display = "none";
    }
    if (event.target === addModal) {
      addModal.style.display = "none";
    }
  });
  // Add click event to Print AEC button
  const printAecBtn = document.getElementById("printAecBtn");
  if (printAecBtn) {
    printAecBtn.addEventListener("click", printAEC);
  }
  // Add click event to Modify button
  const modifyBtn = document.getElementById("modifyBtn");
  if (modifyBtn) {
    modifyBtn.addEventListener("click", handleModify);
  }
  // Add click event to Save Changes button
  const saveBusinessBtn = document.getElementById("saveBusinessBtn");
  if (saveBusinessBtn) {
    saveBusinessBtn.addEventListener("click", saveBusinessChanges);
  }
  // Add click event to Add Business button in the modal
  const modalAddBusinessBtn = document.querySelector(
    "#businessAddModal #addBusinessBtn"
  );
  if (modalAddBusinessBtn) {
    modalAddBusinessBtn.addEventListener("click", addNewBusiness);
  }
  console.log("Modal event listeners setup complete");
}

// Preload logos when the page loads
function preloadLogos() {
  logoUrls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

// Function to print AEC
function printAEC() {
  // Get the business details from the modal
  const accountNo = document.getElementById("modalAccountNo").textContent;
  const businessName = document.getElementById("modalBusinessName").textContent;
  const address = document.getElementById("modalAddress").textContent;
  const barangay = document.getElementById("modalBarangay").textContent;
  const status = document.getElementById("modalStatus").textContent;
  const orNo = document.getElementById("modalOrNo").textContent;
  const amountPaid = document.getElementById("modalAmountPaid").textContent;
  const dateOfPayment =
    document.getElementById("modalDateOfPayment").textContent;
  // Get the selected year from the year selector dropdown
  const selectedYear = document.getElementById("yearSelect").value;
  // Get current date for the certificate
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // Get generated date and time
  const generatedDateTime =
    new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
  // Create a temporary div with the certificate content
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.width = "10cm";
  tempDiv.style.height = "12cm";
  tempDiv.style.padding = "0.4cm";
  tempDiv.style.boxSizing = "border-box";
  tempDiv.style.fontFamily = "Verdana, sans-serif";
  tempDiv.style.border = "1px solid green";
  tempDiv.style.display = "flex";
  tempDiv.style.flexDirection = "column";
  // Set the HTML content
  tempDiv.innerHTML = `
    <!-- Logos -->
    <div style="display: flex; justify-content: center; gap: 0.3cm; margin-bottom: 0.3cm;">
      <img src="${
        logoUrls[0]
      }" alt="Bagong Pilipinas" style="height: 1.2cm; width: 1.2cm; object-fit: contain;">
      <img src="${
        logoUrls[1]
      }" alt="San Juan Logo" style="height: 1.2cm; width: 1.2cm; object-fit: contain;">
      <img src="${
        logoUrls[2]
      }" alt="CENRO Logo" style="height: 1.2cm; width: 1.2cm; object-fit: contain;">
    </div>
    
    <!-- Header Text -->
    <div style="text-align: center; font-size: 6pt; margin-bottom: 0.1cm; line-height: 1.1;">CITY GOVERNMENT OF SAN JUAN</div>
    <div style="text-align: center; font-size: 6pt; margin-bottom: 0.1cm; line-height: 1.1;">CITY ENVIRONMENT AND NATURAL RESOURCES OFFICE</div>
    
    <!-- Certificate Title -->
    <div style="background-color: #005a08ff; color: white; text-align: center; font-weight: bold; padding: 0.15cm; margin-bottom: 0.3cm; font-size: 10pt;">ASSESSMENT CERTIFICATE</div>
    
    <!-- Details Row -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.3cm;">
      <div style="width: 48%;">
        <div style="font-size: 6pt; margin-bottom: 0.1cm;">Account No.: ${accountNo}</div>
        <div style="font-size: 6pt; margin-bottom: 0.1cm;">Status: 
          <span style="color: ${
            status === "HIGHRISK" ? "red" : "green"
          }; font-weight: bold;">
            ${status === "HIGHRISK" ? "HIGH RISK" : "LOW RISK"}
          </span>
        </div>
      </div>
      <div style="width: 48%; text-align: right;">
        <div style="font-size: 6pt; margin-bottom: 0.1cm;">Date of Application: ${currentDate}</div>
      </div>
    </div>
    
    <!-- Certification Section -->
    <div style="margin-bottom: 0.2cm;">
      <div style="text-align: center; font-size: 6pt; margin-bottom: 0.05cm;">This is to certify that</div>
      <div style="text-align: center; font-weight: bold; font-size: 9pt; margin-bottom: 0.05cm; line-height: 1.1; max-height: 1.2cm; overflow: hidden;">${businessName}</div>
      <div style="text-align: left; font-size: 6pt; margin-top: 0.5cm; margin-bottom: 0.2cm; line-height: 1.2;">
        located at <span style="font-weight: bold;">${address}</span>, 
        <span style="font-weight: bold;">${barangay}</span>, has paid environmental protection and preservation fee of 
        <span style="font-weight: bold;">${selectedYear}</span>
      </div>
    </div>
    
    <!-- Info Box -->
    <div style="border: 1px solid #000; padding: 0.15cm; margin-bottom: 0.4cm; font-size: 6pt; line-height: 1.2;">
      Valid for 1 year<br>
      Subject for inspection in ${selectedYear}<br>
      Subject to annual renewal and payment of environmental compliance fee
    </div>
    
    <!-- Signature Section -->
    <div style="margin-bottom: 0.3cm; display: flex; flex-direction: column; align-items: center; margin-top: 1.2cm;">
      <div style="width: 5cm; border-bottom: 1px solid #000; margin-bottom: 0.1cm;"></div>
      <div style="text-align: center; font-size: 6pt; margin-top: 0.05cm;">Secretariat</div>
    </div>
    
    <!-- Footer -->
    <div style="margin-top: auto; padding-top: 0.2cm;">
      <div style="display: flex; justify-content: space-between; font-size: 6pt;">
        <div style="width: 30%;">
          OR No.: ${orNo}
          <div style="font-size: 4pt; margin-top: 0.05cm;">Generated: ${generatedDateTime}</div>
        </div>
        <div style="width: 30%; text-align: center;">Amount Paid: ${amountPaid}</div>
        <div style="width: 30%; text-align: right;">Date: ${dateOfPayment}</div>
      </div>
    </div>
  `;
  // Add to body temporarily
  document.body.appendChild(tempDiv);
  // Load libraries if not already loaded
  loadLibraries(() => {
    // Wait for images to load
    const images = tempDiv.querySelectorAll("img");
    let loadedImages = 0;
    const onImageLoad = () => {
      loadedImages++;
      if (loadedImages === images.length) {
        // All images loaded, now generate PDF
        generatePDF(tempDiv);
      }
    };
    // Check if images are already loaded (cached)
    const checkIfLoaded = () => {
      let allLoaded = true;
      images.forEach((img) => {
        if (!img.complete) {
          allLoaded = false;
        }
      });
      if (allLoaded) {
        onImageLoad();
      }
    };
    // Add load event listeners to images
    images.forEach((img) => {
      if (img.complete) {
        onImageLoad();
      } else {
        img.addEventListener("load", onImageLoad);
        img.addEventListener("error", onImageLoad);
      }
    });
    // Check if images are already loaded (cached)
    checkIfLoaded();
  });
}

// Function to load required libraries
function loadLibraries(callback) {
  const libraries = [
    {
      name: "html2canvas",
      url: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    },
    {
      name: "jsPDF",
      url: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    },
  ];
  let loadedCount = 0;
  libraries.forEach((lib) => {
    if (window[lib.name]) {
      loadedCount++;
      if (loadedCount === libraries.length) {
        callback();
      }
      return;
    }
    const script = document.createElement("script");
    script.src = lib.url;
    script.onload = () => {
      loadedCount++;
      if (loadedCount === libraries.length) {
        callback();
      }
    };
    document.head.appendChild(script);
  });
}

// Function to generate PDF from HTML element
function generatePDF(element) {
  // Use html2canvas to capture the element
  html2canvas(element, {
    scale: 2, // Higher resolution
    logging: false,
    useCORS: true, // Allow cross-origin images
  })
    .then((canvas) => {
      // Calculate dimensions
      const imgWidth = 100; // 10cm in mm
      const pageHeight = 120; // 12cm in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      // Create PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [imgWidth, pageHeight],
      });
      let position = 0;
      // Add image to PDF
      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      // Remove the temporary element
      document.body.removeChild(element);
      // Generate PDF as blob and open in new tab
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      // Show success message
      alert("PDF generated successfully! It should open in a new tab.");
    })
    .catch((error) => {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
      document.body.removeChild(element);
    });
}

// Function to setup add business button
function setupAddBusinessButton() {
  const addBusinessBtn = document.getElementById("headerAddBusinessBtn");
  if (addBusinessBtn) {
    addBusinessBtn.addEventListener("click", handleAddBusiness);
    console.log("Add Business button setup complete");
  } else {
    console.error("Add Business button not found");
  }
}

// Function to handle delete button click
async function handleDelete() {
  // Get the account number from the modal
  const accountNo = document.getElementById("modalAccountNo").textContent;
  // Show browser warning popup
  const isConfirmed = window.confirm(
    "Are you sure you want to delete this data? This cannot be undone. Proceed with caution."
  );
  // If user clicked Cancel, return without deleting
  if (!isConfirmed) {
    return;
  }
  try {
    // Show loading state
    const deleteBtn = document.getElementById("deleteBtn");
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;
    // Send delete request to server
    const token = getAuthToken();
    const response = await fetch(
      `/api/business${currentYear}/account/${encodeURIComponent(accountNo)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    // Restore button state
    deleteBtn.innerHTML = originalText;
    deleteBtn.disabled = false;
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      throw new Error("Failed to delete business");
    }
    // Close the modal
    document.getElementById("businessDetailsModal").style.display = "none";
    // Show success message
    showSuccessMessage("Business deleted successfully!");
    // Refresh the business table
    loadBusinessData();
  } catch (error) {
    console.error("Error deleting business:", error);
    showErrorMessage(`Failed to delete business: ${error.message}`);
  }
}

// Function to handle add business button click
function handleAddBusiness() {
  console.log("Add Business button clicked");
  // Clear the form
  document.getElementById("businessAddForm").reset();
  // Set today's date as default for date of application
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("addDateOfApplication").value = today;
  // Show the add modal
  document.getElementById("businessAddModal").style.display = "block";
}

// Function to add a new business (with browser warning popup)
async function addNewBusiness() {
  try {
    // Get form data
    const businessData = {
      accountNo: document.getElementById("addAccountNo").value.trim(),
      businessName: document.getElementById("addBusinessName").value.trim(),
      ownerName: document.getElementById("addOwnerName").value.trim(),
      address: document.getElementById("addAddress").value.trim(),
      barangay: document.getElementById("addBarangay").value.trim(),
      natureOfBusiness: document
        .getElementById("addNatureOfBusiness")
        .value.trim(),
      status: document.getElementById("addStatus").value,
      applicationStatus: document.getElementById("addApplicationStatus").value,
      dateOfApplication: document.getElementById("addDateOfApplication").value,
      orNo: document.getElementById("addOrNo").value.trim() || null,
      amountPaid:
        parseFloat(document.getElementById("addAmountPaid").value) || 0,
      dateOfPayment: document.getElementById("addDateOfPayment").value || null,
      remarks: document.getElementById("addRemarks").value.trim(),
    };
    // Validate required fields
    const requiredFields = [
      { id: "addAccountNo", name: "Account No" },
      { id: "addBusinessName", name: "Business Name" },
      { id: "addOwnerName", name: "Owner Name" },
      { id: "addAddress", name: "Address" },
      { id: "addBarangay", name: "Barangay" },
      { id: "addNatureOfBusiness", name: "Nature of Business" },
      { id: "addStatus", name: "Status" },
      { id: "addApplicationStatus", name: "Application Status" },
      { id: "addDateOfApplication", name: "Date of Application" },
    ];
    // Check if all required fields are filled
    for (const field of requiredFields) {
      const element = document.getElementById(field.id);
      const value = element.value.trim();
      if (!value) {
        element.classList.add("is-invalid");
        // Add error message if it doesn't exist
        let errorElement = element.nextElementSibling;
        if (
          !errorElement ||
          !errorElement.classList.contains("invalid-feedback")
        ) {
          errorElement = document.createElement("div");
          errorElement.className = "invalid-feedback";
          errorElement.textContent = `${field.name} is required`;
          element.parentNode.insertBefore(errorElement, element.nextSibling);
        }
        // Focus on the first invalid field
        element.focus();
        return;
      } else {
        element.classList.remove("is-invalid");
        // Remove error message if it exists
        const errorElement = element.nextElementSibling;
        if (
          errorElement &&
          errorElement.classList.contains("invalid-feedback")
        ) {
          errorElement.remove();
        }
      }
    }
    // Validate amount paid is a positive number if provided
    const amountPaid = document.getElementById("addAmountPaid").value;
    if (amountPaid && (isNaN(amountPaid) || parseFloat(amountPaid) < 0)) {
      const amountField = document.getElementById("addAmountPaid");
      amountField.classList.add("is-invalid");
      let errorElement = amountField.nextElementSibling;
      if (
        !errorElement ||
        !errorElement.classList.contains("invalid-feedback")
      ) {
        errorElement = document.createElement("div");
        errorElement.className = "invalid-feedback";
        errorElement.textContent = "Amount Paid must be a positive number";
        amountField.parentNode.insertBefore(
          errorElement,
          amountField.nextSibling
        );
      }
      amountField.focus();
      return;
    }
    // Check if account number already exists
    console.log(
      "Checking if account number already exists:",
      businessData.accountNo
    );
    const token = getAuthToken();
    const accountCheckResponse = await fetch(
      `/api/business${currentYear}/account/${encodeURIComponent(
        businessData.accountNo
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (accountCheckResponse.ok) {
      // Account number already exists
      const accountField = document.getElementById("addAccountNo");
      accountField.classList.add("is-invalid");
      let errorElement = accountField.nextElementSibling;
      if (
        !errorElement ||
        !errorElement.classList.contains("invalid-feedback")
      ) {
        errorElement = document.createElement("div");
        errorElement.className = "invalid-feedback";
        errorElement.textContent = "Account number already exists";
        accountField.parentNode.insertBefore(
          errorElement,
          accountField.nextSibling
        );
      }
      accountField.focus();
      return;
    }
    // Show browser warning popup
    const isConfirmed = window.confirm(
      "Are you sure the data that are filled is correct?"
    );
    // If user clicked Cancel, return without adding
    if (!isConfirmed) {
      return;
    }
    // Show loading state
    const addBtn = document.getElementById("addBusinessBtn");
    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    addBtn.disabled = true;

    // Determine the correct API endpoint based on the current year
    const apiUrl = `/api/business${currentYear}`;

    // Send create request to server
    console.log("Sending request to server at:", apiUrl);
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(businessData),
    });
    // Restore button state
    addBtn.innerHTML = originalText;
    addBtn.disabled = false;
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to add business");
    }
    // Close the add modal
    document.getElementById("businessAddModal").style.display = "none";

    // Reset the form after successful submission
    document.getElementById("businessAddForm").reset();

    // Show success message
    showSuccessMessage("Business added successfully!");
    // Refresh the business table
    loadBusinessData();
  } catch (error) {
    console.error("Error adding business:", error);
    showErrorMessage(`Failed to add business: ${error.message}`);
  }
}

// Function to handle modify button click
function handleModify() {
  // Get the business details from the modal
  const accountNo = document.getElementById("modalAccountNo").textContent;
  const businessName = document.getElementById("modalBusinessName").textContent;
  const ownerName = document.getElementById("modalOwnerName").textContent;
  const address = document.getElementById("modalAddress").textContent;
  const barangay = document.getElementById("modalBarangay").textContent;
  const natureOfBusiness = document.getElementById(
    "modalNatureOfBusiness"
  ).textContent;
  const status = document.getElementById("modalStatus").textContent;
  const applicationStatus = document.getElementById(
    "modalApplicationStatus"
  ).textContent;
  const dateOfApplication = document.getElementById(
    "modalDateOfApplication"
  ).textContent;
  const orNo = document.getElementById("modalOrNo").textContent;
  const amountPaid = document.getElementById("modalAmountPaid").textContent;
  const dateOfPayment =
    document.getElementById("modalDateOfPayment").textContent;
  const remarks = document.getElementById("modalRemarks").textContent;
  // Close the details modal
  document.getElementById("businessDetailsModal").style.display = "none";
  // Populate the edit form with current data
  document.getElementById("editAccountNo").value = accountNo;
  document.getElementById("editBusinessName").value = businessName;
  document.getElementById("editOwnerName").value = ownerName;
  document.getElementById("editAddress").value = address;
  // Set the barangay dropdown value
  const barangaySelect = document.getElementById("editBarangay");
  for (let i = 0; i < barangaySelect.options.length; i++) {
    if (barangaySelect.options[i].value === barangay) {
      barangaySelect.selectedIndex = i;
      break;
    }
  }
  document.getElementById("editNatureOfBusiness").value = natureOfBusiness;
  document.getElementById("editStatus").value = status;
  document.getElementById("editApplicationStatus").value = applicationStatus;
  // Format dates for input fields
  if (dateOfApplication && dateOfApplication !== "N/A") {
    const appDate = new Date(dateOfApplication);
    document.getElementById("editDateOfApplication").value = appDate
      .toISOString()
      .split("T")[0];
  }
  document.getElementById("editOrNo").value = orNo;
  document.getElementById("editAmountPaid").value = amountPaid;
  if (dateOfPayment && dateOfPayment !== "N/A") {
    const payDate = new Date(dateOfPayment);
    document.getElementById("editDateOfPayment").value = payDate
      .toISOString()
      .split("T")[0];
  }
  // Show the edit modal
  document.getElementById("businessEditModal").style.display = "block";
}

// Function to save business changes
async function saveBusinessChanges() {
  try {
    // Get form data
    const accountNo = document.getElementById("editAccountNo").value;
    const businessData = {
      businessName: document.getElementById("editBusinessName").value,
      ownerName: document.getElementById("editOwnerName").value,
      address: document.getElementById("editAddress").value,
      barangay: document.getElementById("editBarangay").value,
      natureOfBusiness: document.getElementById("editNatureOfBusiness").value,
      status: document.getElementById("editStatus").value,
      applicationStatus: document.getElementById("editApplicationStatus").value,
      dateOfApplication: document.getElementById("editDateOfApplication").value,
      orNo: document.getElementById("editOrNo").value,
      amountPaid:
        parseFloat(document.getElementById("editAmountPaid").value) || 0,
      dateOfPayment: document.getElementById("editDateOfPayment").value,
      remarks: document.getElementById("editRemarks").value,
    };
    // Get authentication token
    const token = getAuthToken();
    // Send update request to server
    const response = await fetch(
      `/api/business${currentYear}/account/${encodeURIComponent(accountNo)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(businessData),
      }
    );
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      throw new Error("Failed to update business details");
    }
    // Close the edit modal
    document.getElementById("businessEditModal").style.display = "none";

    // Reset the form after successful submission
    document.getElementById("businessEditForm").reset();

    // Show success message
    showSuccessMessage("Business details updated successfully!");
    // Refresh the business table
    loadBusinessData();
  } catch (error) {
    console.error("Error saving business changes:", error);
    showErrorMessage(`Failed to save business changes: ${error.message}`);
  }
}

// Function to show error in table
function showTableError(message) {
  const tableRoot = document.getElementById("businessTable");
  if (!tableRoot) {
    console.error("Business table root element not found");
    return;
  }
  tableRoot.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>${message}</p>
            <button onclick="loadBusinessData()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Retry
            </button>
        </div>
    `;
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
      loadBusinessData().finally(() => {
        // Remove spinning animation
        if (icon) {
          icon.classList.remove("refreshing");
        }
      });
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
async function performSearch() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput.value.trim();
  if (!query) {
    // If query is empty, load all businesses
    loadBusinessData();
    return;
  }
  try {
    console.log(`Searching for account number: ${query} in ${currentYear}`);
    const token = getAuthToken();
    const response = await fetch(
      `/api/business${currentYear}/search?query=${encodeURIComponent(
        query
      )}&field=accountNo`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorizedError();
        return;
      }
      throw new Error("Search failed");
    }
    const businesses = await response.json();
    console.log("Search results:", businesses);
    // Store search results for pagination
    allBusinesses = businesses;
    totalRecords = businesses.length;
    currentPage = 1; // Reset to first page
    // Update table with paginated data
    const paginatedData = getPaginatedData(
      allBusinesses,
      currentPage,
      pageSize
    );
    updateBusinessTable(paginatedData);
    // Update pagination controls
    updatePaginationControls(
      currentPage,
      pageSize,
      totalRecords,
      updateTableWithPagination
    );
  } catch (error) {
    console.error("Error searching businesses:", error);
    showErrorMessage(`Search failed: ${error.message}`);
  }
}
