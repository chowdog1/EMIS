// reports.js
window.addEventListener("load", function () {
  console.log("Reports page loaded, initializing");
  updateCurrentPage("Reports");
  checkAuthentication();
  setupDropdown();
  setupLogout();
  setupReportGeneration();
  populateYearDropdown();

  if (typeof initAccountLockNotifier === "function") {
    initAccountLockNotifier();
  } else {
    console.error("Account lock notifier function not found");
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// ── Current page tracker ──────────────────────────────────────────────────────
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

// ── Year dropdown ─────────────────────────────────────────────────────────────
async function populateYearDropdown() {
  const reportYearSelect = document.getElementById("reportYear");
  try {
    const response = await fetch("/api/reports/available-years");
    if (!response.ok) throw new Error("Failed to fetch available years");
    const years = await response.json();

    reportYearSelect.innerHTML = "";
    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      reportYearSelect.appendChild(option);
    });

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

// ── Shared helper: trigger a CSV download ────────────────────────────────────
function downloadCSV(url, btn, originalLabel) {
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
  btn.disabled = true;
  window.location.href = url;
  setTimeout(() => {
    btn.innerHTML = originalLabel;
    btn.disabled = false;
  }, 2000);
}

// ── Wire all report buttons ───────────────────────────────────────────────────
function setupReportGeneration() {
  const reportYearSelect = document.getElementById("reportYear");
  const selectedYearSpan = document.getElementById("selectedYear");

  // Keep displayed year in sync
  reportYearSelect.addEventListener("change", function () {
    selectedYearSpan.textContent = this.value;
  });

  // ── Environmental Clearance (all businesses) ──
  document
    .getElementById("generateReportBtn")
    .addEventListener("click", function () {
      const year = reportYearSelect.value;
      if (!confirm(`Generate Environmental Clearance report for ${year}?`))
        return;
      this.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Generating Report...';
      this.style.pointerEvents = "none";
      window.location.href = `/api/reports/csv/${year}`;
      setTimeout(() => {
        this.innerHTML = `APPLICATION FOR ENVIRONMENTAL CLEARANCE — <span id="selectedYear">${year}</span>`;
        this.style.pointerEvents = "";
      }, 2000);
    });

  // ── No Payments ──
  const noPayBtn = document.getElementById("noPaymentsReportBtn");
  noPayBtn.addEventListener("click", function () {
    const year = reportYearSelect.value;
    if (!confirm(`Generate No Payments report for ${year}?`)) return;
    downloadCSV(
      `/api/reports/csv/${year}/no-payments`,
      this,
      '<i class="fas fa-file-excel"></i> No Payments Report',
    );
  });

  // ── Inspection Reports ──
  const inspBtn = document.getElementById("inspectionsReportBtn");
  inspBtn.addEventListener("click", function () {
    const year = reportYearSelect.value;
    if (!confirm(`Export all inspection reports for ${year} as CSV?`)) return;
    downloadCSV(
      `/api/reports/csv/${year}/inspections`,
      this,
      '<i class="fas fa-file-csv"></i> Export Inspection Reports',
    );
  });

  // ── Violation Records ──
  const violBtn = document.getElementById("violationsReportBtn");
  violBtn.addEventListener("click", function () {
    const year = reportYearSelect.value;
    if (!confirm(`Export all violation records for ${year} as CSV?`)) return;
    downloadCSV(
      `/api/reports/csv/${year}/violations`,
      this,
      '<i class="fas fa-file-csv"></i> Export Violation Records',
    );
  });

  // ── Compliance Records ──
  const compBtn = document.getElementById("complianceReportBtn");
  compBtn.addEventListener("click", function () {
    const year = reportYearSelect.value;
    if (!confirm(`Export all compliance records for ${year} as CSV?`)) return;
    downloadCSV(
      `/api/reports/csv/${year}/compliance`,
      this,
      '<i class="fas fa-file-csv"></i> Export Compliance Records',
    );
  });
}
