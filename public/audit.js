// audit.js
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let allAuditLogs = [];
// Wait for DOM to be fully loaded
window.addEventListener("load", function () {
  console.log("Audit Trail page loaded, initializing");
  // Check if user is logged in
  checkAuthentication();
  // Setup dropdown functionality
  setupDropdown();
  // Setup logout functionality
  setupLogout();
  // Initialize audit table
  initializeAuditTable();
  // Setup search functionality
  setupSearch();
  // Setup filter functionality
  setupFilters();
  // Setup refresh button
  setupRefreshButton();
  // Setup pagination controls
  setupPaginationControls();
  // Setup modal event listeners
  setupModalEventListeners();

  // Initialize inactivity manager
  window.inactivityManager = new InactivityManager();

  // Initialize account lock notifier
  if (typeof initAccountLockNotifier === "function") {
    console.log("Initializing account lock notifier");
    initAccountLockNotifier();
  } else {
    console.error("Account lock notifier function not found");
  }

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

// Function to initialize audit table
function initializeAuditTable() {
  loadAuditData();
}

// Function to load audit data
async function loadAuditData() {
  try {
    console.log("Loading audit data...");
    const tableRoot = document.getElementById("auditTable");
    if (tableRoot) {
      tableRoot.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #6c757d;">
          <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
          <p>Loading audit logs...</p>
        </div>
      `;
    }
    const token = localStorage.getItem("auth_token");
    const actionFilter = document.getElementById("actionFilter").value;
    const collectionFilter = document.getElementById("collectionFilter").value;
    let url = `/api/audit?page=${currentPage}&limit=${pageSize}`;
    if (actionFilter) url += `&action=${actionFilter}`;
    if (collectionFilter) url += `&collectionName=${collectionFilter}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to load audit data: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    console.log("Audit logs loaded:", data);
    allAuditLogs = data.logs;
    totalRecords = data.total;
    updateAuditTable(allAuditLogs);
    updatePaginationControls();
  } catch (error) {
    console.error("Error loading audit data:", error);
    showTableError(`Failed to load audit data: ${error.message}`);
  }
}

// Function to update audit table
function updateAuditTable(logs) {
  const tableRoot = document.getElementById("auditTable");
  if (!tableRoot) {
    console.error("Audit table root element not found");
    return;
  }
  if (logs.length === 0) {
    tableRoot.innerHTML = `
      <div class="no-records">
        <i class="fas fa-inbox"></i>
        <p>No audit logs found</p>
      </div>
    `;
    return;
  }
  // Create table element
  const table = document.createElement("table");
  table.className = "audit-table";
  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const headers = [
    "Timestamp",
    "User",
    "Action",
    "Business Year",
    "Account No",
    "Changes",
  ];
  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  // Create table body
  const tbody = document.createElement("tbody");
  logs.forEach((log) => {
    const row = document.createElement("tr");
    // Timestamp
    const timestampCell = document.createElement("td");
    timestampCell.textContent = new Date(log.timestamp).toLocaleString();
    row.appendChild(timestampCell);
    // User
    const userCell = document.createElement("td");
    const userName = log.userId
      ? `${log.userId.firstname} ${log.userId.lastname}`
      : "Unknown";
    userCell.textContent = userName;
    row.appendChild(userCell);
    // Action
    const actionCell = document.createElement("td");
    const actionBadge = document.createElement("span");
    actionBadge.textContent = log.action;
    actionBadge.className = `action-badge action-${log.action.toLowerCase()}`;
    actionCell.appendChild(actionBadge);
    row.appendChild(actionCell);
    // Business Year (extracted from collection name)
    const yearCell = document.createElement("td");
    const year = log.collectionName.replace("business", "");
    yearCell.textContent = year;
    row.appendChild(yearCell);
    // Account No
    const accountNoCell = document.createElement("td");
    // Check if accountNo exists and is not empty
    if (log.accountNo && log.accountNo.trim() !== "") {
      accountNoCell.textContent = log.accountNo;
    } else {
      accountNoCell.textContent = "Unknown";
      accountNoCell.style.color = "#6c757d"; // Gray color for unknown
    }
    accountNoCell.style.fontFamily = "monospace";
    accountNoCell.style.fontWeight = "bold";
    row.appendChild(accountNoCell);
    // Changes
    const changesCell = document.createElement("td");
    const changesSummary = getChangesSummary(log);
    changesCell.textContent = changesSummary;
    changesCell.className = "changes-cell";
    changesCell.title = getFullChanges(log);
    // Add click event to show details modal
    changesCell.addEventListener("click", () => {
      showAuditDetailModal(log);
    });
    row.appendChild(changesCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  tableRoot.innerHTML = "";
  tableRoot.appendChild(table);
  console.log("Audit table rendered successfully");
}

// Function to get changes summary
function getChangesSummary(log) {
  if (log.action === "CREATE") {
    return "New record created";
  } else if (log.action === "DELETE") {
    return "Record deleted";
  } else if (log.action === "UPDATE") {
    const changes = log.changes;
    if (changes && typeof changes === "object") {
      const fields = Object.keys(changes);
      return `${fields.length} field(s) updated`;
    }
  }
  return "No details";
}

// Function to get full changes for tooltip
function getFullChanges(log) {
  if (log.action === "CREATE" || log.action === "DELETE") {
    return JSON.stringify(log.changes, null, 2);
  } else if (log.action === "UPDATE") {
    const changes = log.changes;
    let result = "";
    for (const field in changes) {
      result += `${field}:\n`;
      result += `  Before: ${JSON.stringify(changes[field].before)}\n`;
      result += `  After: ${JSON.stringify(changes[field].after)}\n\n`;
    }
    return result;
  }
  return "No details";
}

// Function to show audit detail modal
function showAuditDetailModal(log) {
  const modal = document.getElementById("auditDetailModal");
  const modalBody = document.getElementById("auditDetailBody");
  // Clear previous content
  modalBody.innerHTML = "";
  // Extract year from collection name
  const year = log.collectionName.replace("business", "");
  // Create detail items
  const detailItems = [
    { label: "Timestamp", value: new Date(log.timestamp).toLocaleString() },
    { label: "Action", value: log.action },
    { label: "Business Year", value: year },
    {
      label: "Account No",
      value:
        log.accountNo && log.accountNo.trim() !== ""
          ? log.accountNo
          : "Unknown",
    },
    {
      label: "User",
      value: log.userId
        ? `${log.userId.firstname} ${log.userId.lastname} (${log.userId.email})`
        : "Unknown",
    },
    { label: "IP Address", value: log.ipAddress || "Unknown" },
    { label: "User Agent", value: log.userAgent || "Unknown" },
    { label: "Changes", value: JSON.stringify(log.changes, null, 2) },
  ];
  detailItems.forEach((item) => {
    const detailItem = document.createElement("div");
    detailItem.className = "detail-item";
    const detailLabel = document.createElement("div");
    detailLabel.className = "detail-label";
    detailLabel.textContent = item.label;
    const detailValue = document.createElement("div");
    detailValue.className = "detail-value";
    detailValue.textContent = item.value;
    detailItem.appendChild(detailLabel);
    detailItem.appendChild(detailValue);
    modalBody.appendChild(detailItem);
  });
  // Show the modal
  modal.style.display = "block";
}

// Function to setup modal event listeners
function setupModalEventListeners() {
  const modal = document.getElementById("auditDetailModal");
  const closeBtn = modal.querySelector(".detail-modal-close");
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
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
async function performSearch() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput.value.trim();
  if (!query) {
    loadAuditData();
    return;
  }
  try {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(
      `/api/audit/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(
        `Search failed: ${response.status} ${response.statusText}`
      );
    }
    const results = await response.json();
    allAuditLogs = results;
    totalRecords = results.length;
    currentPage = 1;
    updateAuditTable(allAuditLogs);
    updatePaginationControls();
  } catch (error) {
    console.error("Error searching audit logs:", error);
    showTableError(`Search failed: ${error.message}`);
  }
}

// Function to setup filter functionality
function setupFilters() {
  const actionFilter = document.getElementById("actionFilter");
  const collectionFilter = document.getElementById("collectionFilter");
  if (actionFilter) {
    actionFilter.addEventListener("change", function () {
      currentPage = 1;
      loadAuditData();
    });
  }
  if (collectionFilter) {
    collectionFilter.addEventListener("change", function () {
      currentPage = 1;
      loadAuditData();
    });
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
      loadAuditData().finally(() => {
        if (icon) {
          icon.classList.remove("refreshing");
        }
      });
    });
  }
}

// Function to setup pagination controls
function setupPaginationControls() {
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if (pageSizeSelect) {
    pageSize = parseInt(pageSizeSelect.value);
    pageSizeSelect.addEventListener("change", function () {
      pageSize = parseInt(this.value);
      currentPage = 1;
      loadAuditData();
    });
  }
  // First page button
  const firstPageBtn = document.getElementById("firstPageBtn");
  if (firstPageBtn) {
    firstPageBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage = 1;
        loadAuditData();
      }
    });
  }
  // Previous page button
  const prevPageBtn = document.getElementById("prevPageBtn");
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--;
        loadAuditData();
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
        loadAuditData();
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
        loadAuditData();
      }
    });
  }
}

// Function to update pagination controls
function updatePaginationControls() {
  if (totalRecords === 0) {
    const paginationInfo = document.getElementById("paginationInfo");
    if (paginationInfo) {
      paginationInfo.textContent = "Showing 0 of 0 records";
    }
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
  const paginationInfo = document.getElementById("paginationInfo");
  if (paginationInfo) {
    const startRecord = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);
    paginationInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
  }
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

// Function to show error in table
function showTableError(message) {
  const tableRoot = document.getElementById("auditTable");
  if (!tableRoot) {
    console.error("Audit table root element not found");
    return;
  }
  tableRoot.innerHTML = `
    <div style="padding: 20px; text-align: center; color: #dc3545;">
      <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
      <p>${message}</p>
      <button onclick="loadAuditData()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Retry
      </button>
    </div>
  `;
}
