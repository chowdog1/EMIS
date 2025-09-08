// reports.js
// Wait for DOM to be fully loaded
window.addEventListener("load", function () {
  console.log("Reports page loaded, initializing");
  // Update current page for user tracking
  updateCurrentPage("Reports");
  // Check if user is logged in
  checkAuthentication();
  // Setup dropdown functionality
  setupDropdown();
  // Setup logout functionality
  setupLogout();
  // Setup report generation
  setupReportGeneration();
  // Populate year dropdown with available years
  populateYearDropdown();

  // Initialize inactivity manager
  window.inactivityManager = new InactivityManager();

  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

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

// Function to populate year dropdown with available years
async function populateYearDropdown() {
  const reportYearSelect = document.getElementById("reportYear");
  try {
    // Fetch available years from the server
    const response = await fetch("/api/reports/available-years");
    if (!response.ok) throw new Error("Failed to fetch available years");
    const years = await response.json();
    // Clear existing options
    reportYearSelect.innerHTML = "";
    // Add each year as an option
    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      reportYearSelect.appendChild(option);
    });
    // Set the current year as default
    const currentYear = new Date().getFullYear().toString();
    if (years.includes(currentYear)) {
      reportYearSelect.value = currentYear;
      document.getElementById("selectedYear").textContent = currentYear;
    } else if (years.length > 0) {
      reportYearSelect.value = years[0];
      document.getElementById("selectedYear").textContent = years[0];
    }
  } catch (error) {
    console.error("Error populating year dropdown:", error);
    // Fallback to hardcoded years if API fails
    const fallbackYears = ["2025", "2026"];
    fallbackYears.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      reportYearSelect.appendChild(option);
    });
    if (fallbackYears.length > 0) {
      reportYearSelect.value = fallbackYears[0];
      document.getElementById("selectedYear").textContent = fallbackYears[0];
    }
  }
}

// Function to setup report generation
function setupReportGeneration() {
  const reportYearSelect = document.getElementById("reportYear");
  const selectedYearSpan = document.getElementById("selectedYear");
  const generateReportBtn = document.getElementById("generateReportBtn");
  const noPaymentsReportBtn = document.getElementById("noPaymentsReportBtn");
  // Update the displayed year when selection changes
  reportYearSelect.addEventListener("change", function () {
    selectedYearSpan.textContent = this.value;
  });
  // Setup main report generation
  generateReportBtn.addEventListener("click", function () {
    const year = reportYearSelect.value;
    const isConfirmed = confirm(
      `Are you sure you want to create a report for the year ${year}?`
    );
    if (isConfirmed) {
      // Show loading state
      generateReportBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Generating Report...';
      generateReportBtn.disabled = true;
      // Make request to generate CSV
      window.location.href = `/api/reports/csv/${year}`;
      // Reset button after a delay
      setTimeout(() => {
        generateReportBtn.innerHTML = `APPLICATION FOR ENVIRONMENTAL CLEARANCE - <span id="selectedYear">${year}</span>`;
        generateReportBtn.disabled = false;
      }, 2000);
    }
  });
  // Setup no payments report generation
  noPaymentsReportBtn.addEventListener("click", function () {
    const year = reportYearSelect.value;
    const isConfirmed = confirm(
      `Are you sure you want to create a no-payments report for the year ${year}?`
    );
    if (isConfirmed) {
      // Show loading state
      noPaymentsReportBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Generating Report...';
      noPaymentsReportBtn.disabled = true;
      // Make request to generate CSV
      window.location.href = `/api/reports/csv/${year}/no-payments`;
      // Reset button after a delay
      setTimeout(() => {
        noPaymentsReportBtn.innerHTML =
          '<i class="fas fa-file-excel"></i> Generate No Payments Report';
        noPaymentsReportBtn.disabled = false;
      }, 2000);
    }
  });
}

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
