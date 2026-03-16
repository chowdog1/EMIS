// inspections.js

let currentYear = new Date().getFullYear().toString();
if (currentYear < "2025") currentYear = "2025";
else if (currentYear > "2030") currentYear = "2030";

let allReports = [];
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;

let currentModal = 1;
let formData = {};
let editingReportId = null;

// ── Violation fee + priority map ──────────────────────────────────────────────
// priority: "HIGH" | "MEDIUM" | "LOW"
// HIGH   = ₱2,500–₱5,000  (serious environmental offenses)
// MEDIUM = ₱1,000–₱3,000  (moderate)
// LOW    = ₱500            (minor: segregation, labels, cover)
const VIOLATIONS_META = {
  ordinance35_2004_sec2a: {
    fee: 1000,
    priority: "LOW",
    label: "City Ordinance No. 35-2004 sec.2a — Failure to segregate wastes",
  },
  ordinance30_1999_sec5c: {
    fee: 500,
    priority: "LOW",
    label:
      "City Ordinance No. 30-1999 sec.5c — Failure to specify appropriate garbage bin label",
  },
  ordinance94_1994_sec1: {
    fee: 500,
    priority: "LOW",
    label:
      "City Ordinance No. 94-1994 sec.1 — Failure to cover trash receptacle",
  },
  ordinance91_2013_sec5F03d: {
    fee: 5000,
    priority: "HIGH",
    label:
      "City Ordinance No. 91-2013 sec.5F-03d — Failure to install adequate anti-pollution devices",
  },
  ordinance21_11_sec14_2: {
    fee: 3000,
    priority: "MEDIUM",
    label:
      "City Ordinance No. 21-11 sec 14.2 — Failure to desludge septic tank",
  },
  ordinance91_2013_sec5F03e: {
    fee: 5000,
    priority: "HIGH",
    label:
      "City Ordinance No. 91-2013 sec.5F-03e — Failure to present/provide a true copy of all clearances, permits and certifications",
  },
  ordinance10_2011: {
    fee: 5000,
    priority: "HIGH",
    label:
      "City Ordinance No. 10-2011 — Dumping of solid waste into canals, drainage & water systems",
  },
  ordinance09_2011_sec3_1: {
    fee: 500,
    priority: "LOW",
    label:
      "City Ordinance No. 09-2011 sec.3-1 — Littering and illegally dumping of solid wastes",
  },
  ordinance91_2013_sec5F03a: {
    fee: 2500,
    priority: "HIGH",
    label:
      "City Ordinance No. 91-2013 sec.5F-03a — Failure to pay Environmental Protection and Preservation Fee",
  },
  ordinance91_2013_sec5F03b: {
    fee: 2500,
    priority: "HIGH",
    label:
      "City Ordinance No. 91-2013 sec.5F-03b — Failure to appoint/designate Pollution Control Officer (PCO)",
  },
  ordinance91_2013_sec5F03c: {
    fee: 2500,
    priority: "HIGH",
    label:
      "City Ordinance No. 91-2013 sec.5F-03c — Refuse to allow inspectors to enter and inspect the premises",
  },
  ordinance15_11_sec1b: {
    fee: 5000,
    priority: "HIGH",
    label:
      "City Ordinance No. 15-11 sec.1b — Improper disposal of used cooking oil",
  },
  ordinance14_2024_sec5w: {
    fee: 5000,
    priority: "HIGH",
    label: "City Ordinance No. 14-2024 sec.5w — Tobacco Advertisement",
  },
};

// Sorted order: HIGH first, then MEDIUM, then LOW
const VIOLATION_KEYS_SORTED = Object.entries(VIOLATIONS_META)
  .sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a[1].priority] - order[b[1].priority];
  })
  .map(([k]) => k);

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("load", function () {
  if (typeof updateCurrentPage === "function") updateCurrentPage("Inspections");
  checkAuthentication();
  setupDropdown();
  setupLogout();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  setupEscapeKey();
  setupYearSelection();
  setYearDropdownValue();
  loadReports();
  setupSearch();
  setupRefreshButton();

  document
    .getElementById("newInspectionBtn")
    .addEventListener("click", openNewInspection);
  setupModalNavigation();
  setupAutoCapitalize();
  setupAccountNoLookup();
});

if (typeof initAccountLockNotifier === "function") initAccountLockNotifier();

// ── Auto-capitalize all text/textarea inputs in modals ────────────────────────
function setupAutoCapitalize() {
  // Apply to any text input or textarea inside the 3 modals
  const selectors =
    "#modal1 input[type=text], #modal1 input[type=email], #modal1 textarea, " +
    "#modal2 input[type=text], #modal2 input[type=email], #modal2 textarea, " +
    "#modal3 input[type=text], #modal3 input[type=email], #modal3 textarea";
  document.querySelectorAll(selectors).forEach((el) => {
    el.addEventListener("input", function () {
      // Preserve cursor position while upcasing
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.toUpperCase();
      if (this.setSelectionRange) this.setSelectionRange(start, end);
    });
  });
}

// ── Account No. live lookup — auto-fill + disable business name & address ─────
function setupAccountNoLookup() {
  const acctInput = document.getElementById("p1_accountNo");
  if (!acctInput) return;

  let lookupTimeout = null;

  acctInput.addEventListener("input", function () {
    const val = this.value.toUpperCase().trim();
    this.value = val; // capitalize as typed

    clearTimeout(lookupTimeout);
    // Reset fields while user is still typing
    resetBizFields();

    if (val.length < 3) return; // don't fire until at least 3 chars

    lookupTimeout = setTimeout(async () => {
      await fetchAndFillBusiness(val);
    }, 500); // debounce 500ms
  });
}

function resetBizFields() {
  const nameEl = document.getElementById("p1_businessName");
  const addrEl = document.getElementById("p1_address");
  const brgyEl = document.getElementById("p1_barangay");
  if (nameEl) {
    nameEl.value = "";
    nameEl.disabled = false;
    nameEl.style.background = "";
    nameEl.placeholder = "Auto-filled after Account No.";
  }
  if (addrEl) {
    addrEl.value = "";
    addrEl.disabled = false;
    addrEl.style.background = "";
    addrEl.placeholder = "Auto-filled after Account No.";
  }
  if (brgyEl) {
    brgyEl.value = "";
    brgyEl.disabled = false;
    brgyEl.style.background = "";
    brgyEl.placeholder = "Auto-filled after Account No.";
  }
  const badge = document.getElementById("newBizBadge");
  if (badge) badge.style.display = "none";
  const note = document.getElementById("autofillNote");
  if (note) note.classList.remove("visible");
}

async function fetchAndFillBusiness(accountNo) {
  if (!accountNo) return;
  try {
    const token = getAuthToken();
    const res = await fetch(
      `/api/business${currentYear}/account/${encodeURIComponent(accountNo)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) {
      resetBizFields();
      return;
    }
    const biz = await res.json();

    const name = (
      biz["NAME OF BUSINESS"] ||
      biz.businessName ||
      ""
    ).toUpperCase();
    const addr = (biz.ADDRESS || biz.address || "").toUpperCase();
    const barangay = (biz.BARANGAY || biz.barangay || "").toUpperCase();
    const appStatus = biz["APPLICATION STATUS"] || biz.applicationStatus || "";

    const nameEl = document.getElementById("p1_businessName");
    const addrEl = document.getElementById("p1_address");
    const brgyEl = document.getElementById("p1_barangay");

    if (nameEl) {
      nameEl.value = name;
      nameEl.disabled = true;
      nameEl.placeholder = "";
      nameEl.style.background = "#e9ecef";
    }
    if (addrEl) {
      addrEl.value = addr;
      addrEl.disabled = true;
      addrEl.placeholder = "";
      addrEl.style.background = "#e9ecef";
    }
    if (brgyEl) {
      brgyEl.value = barangay;
      brgyEl.disabled = true;
      brgyEl.placeholder = "";
      brgyEl.style.background = "#e9ecef";
    }

    const badge = document.getElementById("newBizBadge");
    if (badge)
      badge.style.display = appStatus === "NEW" ? "inline-flex" : "none";

    // Show autofill note
    const note = document.getElementById("autofillNote");
    if (note) note.classList.add("visible");

    formData.businessName = name;
    formData.address = addr;
    formData.barangay = barangay;
    formData.applicationStatus = appStatus;
  } catch (_) {
    resetBizFields();
  }
}

// Keep fetchBusinessInfo for backward-compat (used when clicking Next on edit)
async function fetchBusinessInfo(accountNo) {
  await fetchAndFillBusiness(accountNo);
}

// ── Year ──────────────────────────────────────────────────────────────────────
function setYearDropdownValue() {
  const sel = document.getElementById("yearSelect");
  if (sel) sel.value = currentYear;
}
function setupYearSelection() {
  const sel = document.getElementById("yearSelect");
  if (!sel) return;
  sel.value = currentYear;
  sel.addEventListener("change", function () {
    currentYear = this.value;
    loadReports();
  });
}

// ── Load & render table ───────────────────────────────────────────────────────
async function loadReports() {
  try {
    showTableLoading();
    const token = getAuthToken();
    const res = await fetch(`/api/inspections?year=${currentYear}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorizedError();
        return;
      }
      throw new Error("Failed to load");
    }
    allReports = await res.json();
    totalRecords = allReports.length;
    currentPage = 1;
    renderTable();
  } catch (e) {
    showTableError(e.message);
  }
}

function showTableLoading() {
  document.getElementById("inspectionsTable").innerHTML =
    `<div class="table-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading inspection reports...</p></div>`;
}
function showTableError(msg) {
  document.getElementById("inspectionsTable").innerHTML =
    `<div class="table-error"><i class="fas fa-exclamation-triangle"></i><p>${msg}</p>
     <button onclick="loadReports()">Retry</button></div>`;
}

function resultBadgeHtml(result) {
  if (result === "PASSED")
    return `<span class="result-badge badge-passed">Passed</span>`;
  if (result === "VIOLATED")
    return `<span class="result-badge badge-violated-raw">Violated</span>`;
  if (result === "NOTICE_WARNING")
    return `<span class="result-badge badge-notice">Notice/Warning</span>`;
  return `<span class="result-badge">—</span>`;
}

function statusBadge(inspectionStatus) {
  const map = {
    PASSED: { cls: "badge-passed", label: "Passed" },
    WITH_VIOLATIONS: { cls: "badge-violated", label: "With Violations" },
    WITH_COMPLIANCE: { cls: "badge-compliance", label: "With Compliance" },
    BOTH: { cls: "badge-both", label: "Violations + Compliance" },
    NOTICE: { cls: "badge-notice", label: "Notice/Warning" },
  };
  const s = map[inspectionStatus] || {
    cls: "badge-passed",
    label: inspectionStatus || "—",
  };
  return `<span class="result-badge ${s.cls}">${s.label}</span>`;
}

function priorityBadgeHtml(violationPriority) {
  if (violationPriority === "PRIORITY")
    return `<span class="result-badge badge-priority">Priority</span>`;
  if (violationPriority === "LOW_PRIORITY")
    return `<span class="result-badge badge-low-priority">Low Priority</span>`;
  return `<span style="color:var(--gray-400);font-size:0.75rem;">—</span>`;
}

// Client-side mirror of server computeViolationPriority
function computeViolationPriority(violations, recommendations) {
  const MINOR_VIOL = [
    "ordinance35_2004_sec2a",
    "ordinance30_1999_sec5c",
    "ordinance94_1994_sec1",
  ];
  const MINOR_REC = [
    "properWasteSegregation",
    "provideSegregationBins",
    "attendSeminar",
  ];

  const checkedViols = violations
    ? Object.keys(violations).filter(
        (k) =>
          !["ovrNo", "totalFine", "isNA"].includes(k) && violations[k] === true,
      )
    : [];
  const checkedRecs = recommendations
    ? Object.keys(recommendations).filter((k) => recommendations[k] === true)
    : [];

  if (!checkedViols.length && !checkedRecs.length) return null;

  const hasNonMinorViol = checkedViols.some((k) => !MINOR_VIOL.includes(k));
  const hasNonMinorRec = checkedRecs.some((k) => !MINOR_REC.includes(k));

  return hasNonMinorViol || hasNonMinorRec ? "PRIORITY" : "LOW_PRIORITY";
}

function renderTable() {
  const start = (currentPage - 1) * pageSize;
  const slice = allReports.slice(start, start + pageSize);
  const tbody = document.getElementById("inspectionsTable");

  if (!slice.length) {
    tbody.innerHTML = `<div class="table-empty"><i class="fas fa-clipboard"></i><p>No inspection reports found for ${currentYear}.</p></div>`;
    updatePaginationInfo();
    return;
  }

  tbody.innerHTML = `
    <table class="insp-table">
      <thead><tr>
        <th>Inspection ID</th><th>Account No.</th><th>Business Name</th><th>Barangay</th>
        <th>Date of Inspection</th><th>Result</th><th>Status</th>
        <th>Priority</th><th>Inspectors</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${slice
          .map(
            (r) => `
          <tr>
            <td>
              <span class="insp-id-badge">${r.inspectionId || "—"}</span>
              ${r.isReinspection ? `<span class="badge-reinspection" title="Reinspection #${r.reinspectionNumber}">Re-#${r.reinspectionNumber}</span>` : ""}
            </td>
            <td><span class="acct-link" onclick="viewReport('${r._id}')">${r.accountNo || "—"}</span></td>
            <td>${r.businessName || "—"}</td>
            <td>${r.barangay || "—"}</td>
            <td>${r.dateOfInspection ? new Date(r.dateOfInspection).toLocaleDateString("en-PH") : "—"}</td>
            <td>${resultBadgeHtml(r.inspectionResult)}</td>
            <td>${statusBadge(r.inspectionStatus)}</td>
            <td>${priorityBadgeHtml(r.violationPriority)}</td>
            <td class="inspector-cell" title="Encoded by: ${r.encodedByName || r.encodedByEmail || "—"}">${getInspectorNames(r.inspectors)}</td>
            <td class="action-cell">
              <button class="act-btn act-view" title="View" onclick="viewReport('${r._id}')"><i class="fas fa-eye"></i></button>
              <button class="act-btn act-edit" title="Edit" onclick="editReport('${r._id}')"><i class="fas fa-edit"></i></button>
              <button class="act-btn act-del"  title="Delete" onclick="deleteReport('${r._id}')"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
  updatePaginationInfo();
}

function getInspectorNames(inspectors) {
  if (!inspectors) return "—";
  const map = {
    alvinMagbanua: "Alvin M.",
    edwinPaderes: "Edwin P.",
    jaycelEden: "Jaycel E.",
    jeffreyBasco: "Jeffrey B.",
    jennySandrino: "Jenny S.",
    jhonIvanMadronal: "Jhon Ivan M.",
    jovenSantiago: "Joven S.",
    marcJoelRato: "Marc Joel R.",
    ninaTan: "Niña T.",
    robinRomero: "Robin R.",
  };
  const names = Object.entries(map)
    .filter(([k]) => inspectors[k])
    .map(([, v]) => v);
  return names.length ? names.join(", ") : "—";
}

function updatePaginationInfo() {
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);
  document.getElementById("paginationInfo").textContent =
    `Showing ${start}–${end} of ${totalRecords} records`;
  document.getElementById("prevPageBtn").disabled = currentPage <= 1;
  document.getElementById("nextPageBtn").disabled = end >= totalRecords;
}

// ── Search ────────────────────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  if (!input || !btn) return;
  btn.addEventListener("click", performSearch);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });
}
function performSearch() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!q) {
    loadReports();
    return;
  }
  allReports = allReports.filter(
    (r) =>
      (r.inspectionId || "").toLowerCase().includes(q) ||
      (r.accountNo || "").toLowerCase().includes(q) ||
      (r.businessName || "").toLowerCase().includes(q),
  );
  totalRecords = allReports.length;
  currentPage = 1;
  renderTable();
}
function setupRefreshButton() {
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    loadReports();
  });
}

// ── Pagination ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("prevPageBtn")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  document.getElementById("nextPageBtn")?.addEventListener("click", () => {
    if (currentPage * pageSize < totalRecords) {
      currentPage++;
      renderTable();
    }
  });
  document
    .getElementById("pageSizeSelect")
    ?.addEventListener("change", function () {
      pageSize = parseInt(this.value);
      currentPage = 1;
      renderTable();
    });
});

// ── View ──────────────────────────────────────────────────────────────────────
async function viewReport(id) {
  try {
    const token = getAuthToken();
    const res = await fetch(`/api/inspections/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load report");
    populateViewModal(await res.json());
    document.getElementById("viewReportModal").style.display = "block";
  } catch (e) {
    showErrorMessage(e.message);
  }
}
// Track the currently-viewed report for reinspection/timeline buttons
let activeViewReportId = null;

function populateViewModal(r) {
  activeViewReportId = r._id;
  const el = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val ?? "—";
  };
  el("view_inspectionId", r.inspectionId);
  el("view_accountNo", r.accountNo);
  el("view_businessName", r.businessName);
  el("view_address", r.address);
  el("view_appStatus", r.applicationStatus);
  el(
    "view_dateOfInspection",
    r.dateOfInspection
      ? new Date(r.dateOfInspection).toLocaleString("en-PH")
      : "—",
  );
  el("view_barangay", r.barangay);
  el(
    "view_result",
    r.inspectionResult === "NOTICE_WARNING"
      ? "Notice/Warning"
      : r.inspectionResult,
  );
  el("view_ovrNo", r.violations?.ovrNo || "—");
  el(
    "view_totalFine",
    r.violations?.totalFine
      ? `₱${r.violations.totalFine.toLocaleString()}`
      : "—",
  );
  el("view_complianceDeadline", r.complianceDeadline);
  el("view_directives", r.directives);
  el("view_observation", r.findings?.observationStatement);
  el(
    "view_operationStatus",
    r.findings?.operationStatus
      ? r.findings.operationStatus.replace(/_/g, " ")
      : "—",
  );
  const vp = document.getElementById("view_violationPriority");
  if (vp) vp.innerHTML = priorityBadgeHtml(r.violationPriority);
  el("view_inspectors", getInspectorNames(r.inspectors));
  el("view_encodedBy", r.encodedByName || r.encodedByEmail || "—");
  el("view_lastUpdatedBy", r.lastUpdatedByEmail || "—");
  const statusEl = document.getElementById("view_status");
  if (statusEl) statusEl.innerHTML = statusBadge(r.inspectionStatus);

  // Reinspection badge
  const riBadge = document.getElementById("view_reinspectionBadge");
  if (riBadge) {
    if (r.isReinspection) {
      riBadge.textContent = `Reinspection #${r.reinspectionNumber}`;
      riBadge.style.display = "inline-block";
    } else {
      riBadge.style.display = "none";
    }
  }
}

// ── Create Reinspection ──────────────────────────────────────────────────────
async function openReinspection() {
  if (!activeViewReportId) return;
  try {
    const token = getAuthToken();
    const res = await fetch(`/api/inspections/${activeViewReportId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load inspection");
    const r = await res.json();

    // Close view modal, open form pre-filled with original data
    document.getElementById("viewReportModal").style.display = "none";
    editingReportId = null; // This is a NEW record, not an edit
    formData = {};
    resetAllForms();
    openModal(1);
    fillAllPartsFromData(r);
  } catch (e) {
    showErrorMessage(e.message);
  }
}

/** Pre-fill all 3 modal parts from a source report object */
function fillAllPartsFromData(r) {
  // ── Part 1 ──
  // Account No — trigger the live lookup to re-disable biz fields
  const acctEl = document.getElementById("p1_accountNo");
  if (acctEl) {
    acctEl.value = r.accountNo || "";
  }

  // Fill + lock biz fields directly (same as auto-fill does)
  const nameEl = document.getElementById("p1_businessName");
  const addrEl = document.getElementById("p1_address");
  const brgyEl = document.getElementById("p1_barangay");
  if (nameEl) {
    nameEl.value = r.businessName || "";
    nameEl.disabled = true;
    nameEl.style.background = "#e9ecef";
  }
  if (addrEl) {
    addrEl.value = r.address || "";
    addrEl.disabled = true;
    addrEl.style.background = "#e9ecef";
  }
  if (brgyEl) {
    brgyEl.value = r.barangay || "";
    brgyEl.disabled = true;
    brgyEl.style.background = "#e9ecef";
  }

  // Show note + new badge
  const note = document.getElementById("autofillNote");
  if (note) note.classList.add("visible");
  const badge = document.getElementById("newBizBadge");
  if (badge)
    badge.style.display =
      r.applicationStatus === "NEW" ? "inline-flex" : "none";

  // Date — clear it so inspector sets a new date
  sv("p1_dateOfInspection", "");

  // Inspection result
  const resultRadio = document.querySelector(
    `input[name="inspectionResult"][value="${r.inspectionResult}"]`,
  );
  if (resultRadio) {
    resultRadio.checked = true;
    setViolationState(r.inspectionResult);
  }

  // Violations
  if (r.violations) {
    Object.keys(VIOLATIONS_META).forEach((key) => {
      const cb = document.getElementById("viol_" + key);
      if (cb) cb.checked = r.violations[key] || false;
    });
    const naCbEl = document.getElementById("viol_na");
    if (naCbEl) naCbEl.checked = r.violations.isNA || false;
    sv("p1_ovrNo", ""); // Clear OVR — new ticket number for reinspection
    recalcFine();
  }

  sv("p1_complianceDeadline", r.complianceDeadline || ""); // blank = inspector must choose for reinspection

  if (r.recommendations) {
    document.querySelectorAll(".rec-cb").forEach((cb) => {
      cb.checked = r.recommendations[cb.dataset.key] || false;
    });
  }

  // Show editing label with parent ID
  const idDisplay = document.getElementById("modal1InspectionId");
  if (idDisplay) {
    idDisplay.textContent = `Reinspection of: ${r.inspectionId}`;
    idDisplay.style.display = "inline-block";
    idDisplay.style.background = "#cce5ff";
    idDisplay.style.color = "#004085";
    idDisplay.style.borderColor = "#b8daff";
  }

  // Store parent info so submit knows to call /reinspect
  formData._reinspectFromId = activeViewReportId;
  formData._parentInspectionId = r.inspectionId;

  // ── Part 2 pre-fill (stored in formData, applied on Next) ──
  formData._prefillPart2 = {
    permits: r.permits,
    pco: r.pco,
    wasteManagement: r.wasteManagement,
  };

  // ── Part 3 pre-fill ──
  formData._prefillPart3 = {
    purposeOfInspection: r.purposeOfInspection,
    physicalEnvironment: r.physicalEnvironment,
    findings: r.findings,
    directives: r.directives,
    afterRecommendations: r.afterRecommendations,
    inspectors: r.inspectors,
  };
}

// ── View Timeline ─────────────────────────────────────────────────────────────
async function viewTimeline() {
  if (!activeViewReportId) return;
  try {
    document.getElementById("timelineModal").style.display = "block";
    document.getElementById("timelineContent").innerHTML =
      `<div style="text-align:center;padding:30px;color:var(--gray-500);">
        <i class="fas fa-spinner fa-spin" style="font-size:22px;"></i>
        <p style="margin-top:8px;">Loading timeline...</p>
      </div>`;

    const token = getAuthToken();
    const res = await fetch(`/api/inspections/${activeViewReportId}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load timeline");
    const chain = await res.json();

    if (!chain.length) {
      document.getElementById("timelineContent").innerHTML =
        `<p style="color:var(--gray-500);text-align:center;">No inspection history found.</p>`;
      return;
    }

    const root = chain[0];
    document.getElementById("timelineSubtitle").textContent =
      `${root.businessName || root.accountNo} — ${chain.length} inspection${chain.length > 1 ? "s" : ""} total`;

    const html = chain
      .map((r, i) => {
        const isOriginal = !r.isReinspection;
        const dotCls = isOriginal ? "dot-original" : "dot-reinspect";
        const label = isOriginal
          ? "Original Inspection"
          : `Reinspection #${r.reinspectionNumber}`;
        const dateStr = r.dateOfInspection
          ? new Date(r.dateOfInspection).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "No date set";
        const resultLabel =
          r.inspectionResult === "NOTICE_WARNING"
            ? "Notice/Warning"
            : r.inspectionResult === "PASSED"
              ? "Passed"
              : "Violated";
        const priorityHtml =
          r.violationPriority === "PRIORITY"
            ? `<span class="result-badge badge-priority" style="font-size:0.7rem;">Priority</span>`
            : r.violationPriority === "LOW_PRIORITY"
              ? `<span class="result-badge badge-low-priority" style="font-size:0.7rem;">Low Priority</span>`
              : "";

        return `
        <div class="timeline-item">
          <div class="timeline-dot ${dotCls}"></div>
          <div class="timeline-card" onclick="openFromTimeline('${r._id}')">
            <div class="tc-head">
              <span class="tc-id">${r.inspectionId || "—"}</span>
              <span style="font-size:0.72rem;font-weight:600;color:${isOriginal ? "var(--primary-green)" : "var(--sky-blue)"};">${label}</span>
              ${statusBadge(r.inspectionStatus)}
              ${priorityHtml}
            </div>
            <div class="tc-body">
              <span><strong>Date:</strong> ${dateStr}</span>
              <span><strong>Result:</strong> ${resultLabel}</span>
              <span><strong>OVR No.:</strong> ${r.violations?.ovrNo || "—"}</span>
              <span><strong>Fine:</strong> ${r.violations?.totalFine ? "₱" + r.violations.totalFine.toLocaleString() : "—"}</span>
              <span style="grid-column:1/-1;"><strong>Inspectors:</strong> ${getInspectorNames(r.inspectors)}</span>
              <span style="grid-column:1/-1;"><strong>Encoded by:</strong> ${r.encodedByName || r.encodedByEmail || "—"}</span>
            </div>
          </div>
        </div>`;
      })
      .join("");

    document.getElementById("timelineContent").innerHTML =
      `<div class="timeline">${html}</div>`;
  } catch (e) {
    document.getElementById("timelineContent").innerHTML =
      `<div style="text-align:center;padding:20px;color:var(--danger);">${e.message}</div>`;
  }
}

function openFromTimeline(id) {
  document.getElementById("timelineModal").style.display = "none";
  viewReport(id);
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteReport(id) {
  if (
    !confirm(
      "Delete this inspection report? Linked violation and compliance records will also be removed. This cannot be undone.",
    )
  )
    return;
  try {
    const token = getAuthToken();
    const res = await fetch(`/api/inspections/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete");
    showSuccessMessage("Inspection report deleted.");
    loadReports();
  } catch (e) {
    showErrorMessage(e.message);
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────────
async function editReport(id) {
  try {
    const token = getAuthToken();
    const res = await fetch(`/api/inspections/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load report");
    const r = await res.json();
    editingReportId = id;
    formData = JSON.parse(JSON.stringify(r));
    resetAllForms();
    openModal(1);
    fillPart1(r);
  } catch (e) {
    showErrorMessage(e.message);
  }
}

// ── New inspection ────────────────────────────────────────────────────────────
function openNewInspection() {
  editingReportId = null;
  formData = {};
  resetAllForms();
  openModal(1);
}

function resetAllForms() {
  ["part1Form", "part2Form", "part3Form"].forEach((id) => {
    const f = document.getElementById(id);
    if (f) f.reset();
  });
  // Re-enable biz fields after reset
  const nameEl = document.getElementById("p1_businessName");
  const addrEl = document.getElementById("p1_address");
  const brgyEl = document.getElementById("p1_barangay");
  if (nameEl) {
    nameEl.disabled = false;
    nameEl.style.background = "";
    nameEl.placeholder = "Auto-filled after Account No.";
  }
  if (addrEl) {
    addrEl.disabled = false;
    addrEl.style.background = "";
    addrEl.placeholder = "Auto-filled after Account No.";
  }
  if (brgyEl) {
    brgyEl.disabled = false;
    brgyEl.style.background = "";
    brgyEl.placeholder = "Auto-filled after Account No.";
  }
  const autofillNote = document.getElementById("autofillNote");
  if (autofillNote) autofillNote.classList.remove("visible");

  setViolationState("PASSED"); // disable violations
  setConditionalFields();
  const fine = document.getElementById("totalFineDisplay");
  if (fine) fine.textContent = "₱0";
  const badge = document.getElementById("newBizBadge");
  if (badge) badge.style.display = "none";
  const idDisplay = document.getElementById("modal1InspectionId");
  if (idDisplay) {
    idDisplay.textContent = "";
    idDisplay.style.display = "none";
  }
}

// ── 3-step modal ──────────────────────────────────────────────────────────────
function openModal(step) {
  currentModal = step;
  ["modal1", "modal2", "modal3"].forEach((id, i) => {
    document.getElementById(id).style.display =
      i + 1 === step ? "block" : "none";
  });
}

function setupModalNavigation() {
  document.getElementById("next1Btn").addEventListener("click", async () => {
    if (!collectPart1()) return;
    openModal(2);
    // Apply Part 2 prefill when creating a reinspection
    if (formData._prefillPart2) {
      applyPart2Prefill(formData._prefillPart2);
    }
  });
  document.getElementById("back2Btn").addEventListener("click", () => {
    collectPart2();
    openModal(1);
  });
  document.getElementById("next2Btn").addEventListener("click", () => {
    collectPart2();
    openModal(3);
    if (formData._prefillPart3) {
      applyPart3Prefill(formData._prefillPart3);
    }
  });
  document.getElementById("back3Btn").addEventListener("click", () => {
    collectPart3();
    openModal(2);
  });
  document.getElementById("submitBtn").addEventListener("click", submitReport);

  document.querySelectorAll(".modal-close, .modal-close-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none";
    });
  });

  // Reinspection + Timeline buttons in view modal
  document
    .getElementById("createReinspectionBtn")
    ?.addEventListener("click", openReinspection);
  document
    .getElementById("viewTimelineBtn")
    ?.addEventListener("click", viewTimeline);

  // Inspection result radio — controls violation section state
  document
    .querySelectorAll('input[name="inspectionResult"]')
    .forEach((radio) => {
      radio.addEventListener("change", function () {
        setViolationState(this.value);
      });
    });

  document.querySelectorAll(".violation-cb, .violation-na-cb").forEach((cb) => {
    cb.addEventListener("change", recalcFine);
  });
  document.querySelectorAll(".permit-radio, .waste-radio").forEach((r) => {
    r.addEventListener("change", setConditionalFields);
  });
}

// ── Violation section state ───────────────────────────────────────────────────
// mode: "PASSED" | "VIOLATED" | "NOTICE_WARNING"
function setViolationState(mode) {
  const isViolated = mode === "VIOLATED";
  const isNotice = mode === "NOTICE_WARNING";
  const enabled = isViolated || isNotice;

  // Enable/disable violation checkboxes
  document.querySelectorAll(".violation-cb").forEach((cb) => {
    cb.disabled = !enabled;
    if (!enabled) cb.checked = false;
  });

  // N/A is always visible as a list item; enable it for Notice/Warning only
  document.querySelectorAll(".violation-na-cb").forEach((cb) => {
    cb.disabled = !isNotice;
    if (!isNotice) cb.checked = false;
  });

  // OVR No. — available in both VIOLATED and NOTICE_WARNING
  const ovrInput = document.getElementById("p1_ovrNo");
  if (ovrInput) {
    ovrInput.disabled = !enabled;
    if (!enabled) ovrInput.value = "";
  }

  // Priority section header visibility
  const priorityWrap = document.getElementById("priorityNotice");
  if (priorityWrap) priorityWrap.style.display = enabled ? "flex" : "none";

  if (!enabled) {
    const fine = document.getElementById("totalFineDisplay");
    if (fine) fine.textContent = "₱0";
  } else {
    recalcFine();
  }
}

// ── Priority badge helper ─────────────────────────────────────────────────────
function priorityBadge(priority) {
  if (priority === "HIGH")
    return `<span class="prio-badge prio-high">HIGH</span>`;
  if (priority === "MEDIUM")
    return `<span class="prio-badge prio-medium">MEDIUM</span>`;
  return `<span class="prio-badge prio-low">LOW</span>`;
}

// ── Collect Part 1 ────────────────────────────────────────────────────────────
function collectPart1() {
  const accountNo = document
    .getElementById("p1_accountNo")
    .value.trim()
    .toUpperCase();
  if (!accountNo) {
    alert("Account No. is required.");
    return false;
  }
  const resultEl = document.querySelector(
    'input[name="inspectionResult"]:checked',
  );
  if (!resultEl) {
    alert("Please select an inspection result.");
    return false;
  }
  if (!document.getElementById("p1_dateOfInspection").value) {
    alert("Date / Time of Inspection is required.");
    return false;
  }

  formData.accountNo = accountNo;
  formData.businessName = document
    .getElementById("p1_businessName")
    .value.trim()
    .toUpperCase();
  formData.address = document
    .getElementById("p1_address")
    .value.trim()
    .toUpperCase();
  formData.barangay = (
    document.getElementById("p1_barangay")?.value.trim() || ""
  ).toUpperCase();
  formData.dateOfInspection = document.getElementById(
    "p1_dateOfInspection",
  ).value;
  formData.inspectionResult = resultEl.value;
  formData.complianceDeadline =
    document.getElementById("p1_complianceDeadline").value || null;

  // Violations — if the N/A checkbox is checked, all violation flags are cleared
  const naChecked = document.getElementById("viol_na")?.checked || false;
  const violations = {};
  let totalFine = 0;
  Object.keys(VIOLATIONS_META).forEach((key) => {
    const cb = document.getElementById("viol_" + key);
    violations[key] = naChecked ? false : cb ? cb.checked : false;
    if (violations[key]) totalFine += VIOLATIONS_META[key].fee;
  });
  violations.isNA = naChecked;
  violations.ovrNo =
    document.getElementById("p1_ovrNo")?.value.trim().toUpperCase() || "";
  violations.totalFine = naChecked ? 0 : totalFine;
  formData.violations = violations;

  const recs = {};
  document.querySelectorAll(".rec-cb").forEach((cb) => {
    recs[cb.dataset.key] = cb.checked;
  });
  formData.recommendations = recs;
  return true;
}

// ── Collect Part 2 ────────────────────────────────────────────────────────────
function collectPart2() {
  formData.permits = {
    mayorsPermit: getRadioVal("permit_mayors"),
    environmentalProtectionFee: getRadioVal("permit_epf"),
    ecc: {
      status: getRadioVal("permit_ecc"),
      eccNumber: vu("p2_eccNumber"),
      dateIssued: v("p2_eccDate"),
    },
    cnc: {
      status: getRadioVal("permit_cnc"),
      cncNumber: vu("p2_cncNumber"),
      dateIssued: v("p2_cncDate"),
    },
    wdp: {
      status: getRadioVal("permit_wdp"),
      wdpNumber: vu("p2_wdpNumber"),
      validity: vu("p2_wdpValidity"),
    },
    pto: {
      status: getRadioVal("permit_pto"),
      ptoNumber: vu("p2_ptoNumber"),
      validity: vu("p2_ptoValidity"),
    },
    hwid: {
      status: getRadioVal("permit_hwid"),
      hwidNumber: vu("p2_hwidNumber"),
      dateIssued: v("p2_hwidDate"),
    },
  };
  formData.pco = {
    name: vu("p2_pcoName"),
    accreditationNo: vu("p2_pcoAccred"),
    contactNo: vu("p2_pcoContact"),
    email: vu("p2_pcoEmail"),
  };
  formData.wasteManagement = {
    solidWaste: {
      wasteBinsProvided: getRadioVal("sw_bins"),
      binsProperlyLabelled: getRadioVal("sw_labels"),
      binsCovered: getRadioVal("sw_covered"),
      properSegregation: getRadioVal("sw_segregation"),
      mrf: getRadioVal("sw_mrf"),
      wastesCollected: getRadioVal("sw_collected"),
      frequencyOfHauling: vu("sw_frequency"),
      hauler: vu("sw_hauler"),
    },
    liquidWaste: {
      septicTank: {
        status: getRadioVal("lw_septic"),
        location: vu("st_location"),
        capacity: vu("st_capacity"),
        frequencyOfDesludging: vu("st_frequency"),
        dateOfDesludging: v("st_date"),
        serviceProvider: vu("st_provider"),
      },
      greaseTrap: {
        status: getRadioVal("lw_grease"),
        location: vu("gt_location"),
        capacity: vu("gt_capacity"),
        frequencyOfHauling: vu("gt_frequency"),
        hauler: vu("gt_hauler"),
      },
      wwtp: {
        status: getRadioVal("lw_wwtp"),
        laboratoryAnalysisResult: vu("wwtp_result"),
      },
      usedOil: {
        status: getRadioVal("lw_oil"),
        typeOfOil: vu("oil_type"),
        frequencyOfHauling: vu("oil_frequency"),
        hauler: vu("oil_hauler"),
      },
    },
    airPollution: {
      pollutionControlDevices: {
        status: getRadioVal("air_devices"),
        deviceType: vu("air_deviceType"),
        maintenanceProvider: vu("air_maintenance"),
      },
    },
  };
}

// ── Collect Part 3 ────────────────────────────────────────────────────────────
function collectPart3() {
  formData.purposeOfInspection = {
    newEstablishment: ck("p3_newEstab"),
    complianceCheck: ck("p3_compliance"),
  };
  formData.physicalEnvironment = {
    landUse: {
      commercial: ck("lu_commercial"),
      residential: ck("lu_residential"),
      industrial: ck("lu_industrial"),
      institutional: ck("lu_institutional"),
    },
    ownershipTerms: {
      proprietorship: ck("ot_proprietorship"),
      privateCorporation: ck("ot_private"),
      multiNational: ck("ot_multinational"),
    },
    occupancyTerms: {
      lessee: getRadioVal("occ_lessee"),
      standAlone: getRadioVal("occ_standalone"),
    },
  };
  formData.findings = {
    // Radio button — single value
    operationStatus: getRadioVal("operationStatus"),
    observationStatement: vu("p3_observation"),
  };
  formData.directives = vu("p3_directives");
  formData.afterRecommendations = {
    forReinspection: ck("ar_reinspection"),
    forSeminar: ck("ar_seminar"),
    complianceMeasures: ck("ar_compliance"),
    forCDO: ck("ar_cdo"),
    issuanceCEC: ck("ar_cec"),
    forCaseConference: ck("ar_conference"),
    forCaseTermination: ck("ar_termination"),
  };
  const inspectors = {};
  document.querySelectorAll(".inspector-cb").forEach((cb) => {
    inspectors[cb.dataset.key] = cb.checked;
  });
  formData.inspectors = inspectors;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitReport() {
  collectPart3();
  if (
    !getRadioVal("operationStatus") ||
    getRadioVal("operationStatus") === "NA"
  ) {
    alert("Please select the establishment operation's status.");
    return;
  }
  const inspectorSelected = Object.values(formData.inspectors || {}).some(
    Boolean,
  );
  if (!inspectorSelected) {
    alert("Please select at least one inspector.");
    return;
  }
  if (
    !confirm(
      "Submit this inspection report? Violations and compliance records will be automatically synced.",
    )
  )
    return;

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  try {
    const token = getAuthToken();
    let method, url;
    if (editingReportId) {
      // Editing an existing report
      method = "PUT";
      url = `/api/inspections/${editingReportId}`;
    } else if (formData._reinspectFromId) {
      // Creating a reinspection — POST to /reinspect endpoint
      method = "POST";
      url = `/api/inspections/${formData._reinspectFromId}/reinspect`;
    } else {
      method = "POST";
      url = "/api/inspections";
    }
    // Strip internal prefill meta keys before sending
    const payload = { ...formData };
    delete payload._reinspectFromId;
    delete payload._parentInspectionId;
    delete payload._prefillPart2;
    delete payload._prefillPart3;
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to save");
    }
    ["modal1", "modal2", "modal3"].forEach((id) => {
      document.getElementById(id).style.display = "none";
    });
    showSuccessMessage(
      editingReportId
        ? "Inspection report updated. Violations & compliance synced."
        : "Inspection report saved. Violations & compliance records created automatically.",
    );
    editingReportId = null;
    formData = {};
    loadReports();
  } catch (e) {
    showErrorMessage(`Failed to save: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Submit Report';
  }
}

// ── Fill forms for editing ────────────────────────────────────────────────────
function fillPart1(r) {
  sv("p1_accountNo", r.accountNo);

  // Restore biz fields (might be disabled from previous session)
  const nameEl = document.getElementById("p1_businessName");
  const addrEl = document.getElementById("p1_address");
  if (nameEl) {
    nameEl.disabled = false;
    nameEl.style.background = "";
  }
  if (addrEl) {
    addrEl.disabled = false;
    addrEl.style.background = "";
  }

  sv("p1_businessName", r.businessName);
  sv("p1_address", r.address);

  const brgyEl2 = document.getElementById("p1_barangay");
  if (brgyEl2) {
    brgyEl2.disabled = false;
    brgyEl2.style.background = "";
  }
  sv("p1_barangay", r.barangay);
  // Disable after filling on edit too
  if (nameEl && r.businessName) {
    nameEl.disabled = true;
    nameEl.style.background = "#e9ecef";
  }
  if (addrEl && r.address) {
    addrEl.disabled = true;
    addrEl.style.background = "#e9ecef";
  }
  if (brgyEl2 && r.barangay) {
    brgyEl2.disabled = true;
    brgyEl2.style.background = "#e9ecef";
  }

  if (r.dateOfInspection)
    sv(
      "p1_dateOfInspection",
      new Date(r.dateOfInspection).toISOString().slice(0, 16),
    );

  const resultRadio = document.querySelector(
    `input[name="inspectionResult"][value="${r.inspectionResult}"]`,
  );
  if (resultRadio) {
    resultRadio.checked = true;
    setViolationState(r.inspectionResult);
  }

  if (r.violations) {
    Object.keys(VIOLATIONS_META).forEach((key) => {
      const cb = document.getElementById("viol_" + key);
      if (cb) cb.checked = r.violations[key] || false;
    });
    sv("p1_ovrNo", r.violations.ovrNo);
    const naCbEl = document.getElementById("viol_na");
    if (naCbEl) naCbEl.checked = r.violations.isNA || false;
    recalcFine();
  }
  sv("p1_complianceDeadline", r.complianceDeadline);
  if (r.recommendations) {
    document.querySelectorAll(".rec-cb").forEach((cb) => {
      cb.checked = r.recommendations[cb.dataset.key] || false;
    });
  }
  const badge = document.getElementById("newBizBadge");
  if (badge)
    badge.style.display =
      r.applicationStatus === "NEW" ? "inline-flex" : "none";

  const idDisplay = document.getElementById("modal1InspectionId");
  if (idDisplay) {
    idDisplay.textContent = r.inspectionId ? `Editing: ${r.inspectionId}` : "";
    idDisplay.style.display = r.inspectionId ? "inline-block" : "none";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRadioVal(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "NA";
}
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}
function vu(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim().toUpperCase() : "";
} // value uppercased
function sv(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.value = val;
}
function ck(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function recalcFine() {
  // If N/A is checked, total is 0
  const naChecked = document.getElementById("viol_na")?.checked || false;
  let total = 0;
  if (!naChecked) {
    Object.keys(VIOLATIONS_META).forEach((key) => {
      const cb = document.getElementById("viol_" + key);
      if (cb && cb.checked) total += VIOLATIONS_META[key].fee;
    });
  }
  const fine = document.getElementById("totalFineDisplay");
  if (fine) fine.textContent = `₱${total.toLocaleString()}`;
}

function setConditionalFields() {
  const map = {
    permit_ecc: "eccFields",
    permit_cnc: "cncFields",
    permit_wdp: "wdpFields",
    permit_pto: "ptoFields",
    permit_hwid: "hwidFields",
    lw_septic: "septicFields",
    lw_grease: "greaseFields",
    lw_wwtp: "wwtpFields",
    lw_oil: "oilFields",
    air_devices: "airDeviceFields",
  };
  Object.entries(map).forEach(([name, fieldId]) => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    const el = document.getElementById(fieldId);
    if (el)
      el.style.display = checked && checked.value === "YES" ? "block" : "none";
  });
}

// ── Apply prefill to Part 2 form fields ──────────────────────────────────────
function applyPart2Prefill(p2) {
  if (!p2) return;
  // Permits
  const setRadio = (name, val) => {
    const el = document.querySelector(
      `input[name="${name}"][value="${val || "NA"}"]`,
    );
    if (el) {
      el.checked = true;
      setConditionalFields();
    }
  };
  if (p2.permits) {
    setRadio("permit_mayors", p2.permits.mayorsPermit);
    setRadio("permit_epf", p2.permits.environmentalProtectionFee);
    if (p2.permits.ecc) {
      setRadio("permit_ecc", p2.permits.ecc.status);
      sv("p2_eccNumber", p2.permits.ecc.eccNumber);
      sv("p2_eccDate", p2.permits.ecc.dateIssued?.slice?.(0, 10) || "");
    }
    if (p2.permits.cnc) {
      setRadio("permit_cnc", p2.permits.cnc.status);
      sv("p2_cncNumber", p2.permits.cnc.cncNumber);
      sv("p2_cncDate", p2.permits.cnc.dateIssued?.slice?.(0, 10) || "");
    }
    if (p2.permits.wdp) {
      setRadio("permit_wdp", p2.permits.wdp.status);
      sv("p2_wdpNumber", p2.permits.wdp.wdpNumber);
      sv("p2_wdpValidity", p2.permits.wdp.validity || "");
    }
    if (p2.permits.pto) {
      setRadio("permit_pto", p2.permits.pto.status);
      sv("p2_ptoNumber", p2.permits.pto.ptoNumber);
      sv("p2_ptoValidity", p2.permits.pto.validity || "");
    }
    if (p2.permits.hwid) {
      setRadio("permit_hwid", p2.permits.hwid.status);
      sv("p2_hwidNumber", p2.permits.hwid.hwidNumber);
      sv("p2_hwidDate", p2.permits.hwid.dateIssued?.slice?.(0, 10) || "");
    }
    setConditionalFields();
  }
  // PCO
  if (p2.pco) {
    sv("p2_pcoName", p2.pco.name);
    sv("p2_pcoAccred", p2.pco.accreditationNo);
    sv("p2_pcoContact", p2.pco.contactNo);
    sv("p2_pcoEmail", p2.pco.email);
  }
  // Waste management — solid
  const sw = p2.wasteManagement?.solidWaste;
  if (sw) {
    const sr = (n, v) => {
      const el = document.querySelector(
        `input[name="${n}"][value="${v || "NO"}"]`,
      );
      if (el) el.checked = true;
    };
    sr("sw_bins", sw.wasteBinsProvided);
    sr("sw_labels", sw.binsProperlyLabelled);
    sr("sw_covered", sw.binsCovered);
    sr("sw_segregation", sw.properSegregation);
    sr("sw_mrf", sw.mrf);
    sr("sw_collected", sw.wastesCollected);
    sv("sw_frequency", sw.frequencyOfHauling);
    sv("sw_hauler", sw.hauler);
  }
  // Liquid
  const lw = p2.wasteManagement?.liquidWaste;
  if (lw) {
    const lr = (n, v) => {
      const el = document.querySelector(
        `input[name="${n}"][value="${v || "NA"}"]`,
      );
      if (el) {
        el.checked = true;
        setConditionalFields();
      }
    };
    if (lw.septicTank) {
      lr("lw_septic", lw.septicTank.status);
      sv("st_location", lw.septicTank.location);
      sv("st_capacity", lw.septicTank.capacity);
      sv("st_frequency", lw.septicTank.frequencyOfDesludging);
      sv("st_date", lw.septicTank.dateOfDesludging?.slice?.(0, 10) || "");
      sv("st_provider", lw.septicTank.serviceProvider);
    }
    if (lw.greaseTrap) {
      lr("lw_grease", lw.greaseTrap.status);
      sv("gt_location", lw.greaseTrap.location);
      sv("gt_capacity", lw.greaseTrap.capacity);
      sv("gt_frequency", lw.greaseTrap.frequencyOfHauling);
      sv("gt_hauler", lw.greaseTrap.hauler);
    }
    if (lw.wwtp) {
      lr("lw_wwtp", lw.wwtp.status);
      sv("wwtp_result", lw.wwtp.laboratoryAnalysisResult);
    }
    if (lw.usedOil) {
      lr("lw_oil", lw.usedOil.status);
      sv("oil_type", lw.usedOil.typeOfOil);
      sv("oil_frequency", lw.usedOil.frequencyOfHauling);
      sv("oil_hauler", lw.usedOil.hauler);
    }
  }
  // Air
  const air = p2.wasteManagement?.airPollution?.pollutionControlDevices;
  if (air) {
    const el = document.querySelector(
      `input[name="air_devices"][value="${air.status || "NA"}"]`,
    );
    if (el) {
      el.checked = true;
      setConditionalFields();
    }
    sv("air_deviceType", air.deviceType);
    sv("air_maintenance", air.maintenanceProvider);
  }
}

// ── Apply prefill to Part 3 form fields ──────────────────────────────────────
function applyPart3Prefill(p3) {
  if (!p3) return;
  const setChk = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  };
  const setRad = (name, val) => {
    if (!val) return;
    const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
    if (el) el.checked = true;
  };

  if (p3.purposeOfInspection) {
    setChk("p3_newEstab", p3.purposeOfInspection.newEstablishment);
    setChk("p3_compliance", p3.purposeOfInspection.complianceCheck);
  }
  if (p3.physicalEnvironment) {
    const lu = p3.physicalEnvironment.landUse || {};
    setChk("lu_commercial", lu.commercial);
    setChk("lu_residential", lu.residential);
    setChk("lu_industrial", lu.industrial);
    setChk("lu_institutional", lu.institutional);
    const ot = p3.physicalEnvironment.ownershipTerms || {};
    setChk("ot_proprietorship", ot.proprietorship);
    setChk("ot_private", ot.privateCorporation);
    setChk("ot_multinational", ot.multiNational);
    const occ = p3.physicalEnvironment.occupancyTerms || {};
    setRad("occ_lessee", occ.lessee);
    setRad("occ_standalone", occ.standAlone);
  }
  if (p3.findings) {
    setRad("operationStatus", p3.findings.operationStatus);
    sv("p3_observation", p3.findings.observationStatement);
  }
  sv("p3_directives", p3.directives);
  if (p3.afterRecommendations) {
    const ar = p3.afterRecommendations;
    setChk("ar_reinspection", ar.forReinspection);
    setChk("ar_seminar", ar.forSeminar);
    setChk("ar_compliance", ar.complianceMeasures);
    setChk("ar_cdo", ar.forCDO);
    setChk("ar_cec", ar.issuanceCEC);
    setChk("ar_conference", ar.forCaseConference);
    setChk("ar_termination", ar.forCaseTermination);
  }
  if (p3.inspectors) {
    document.querySelectorAll(".inspector-cb").forEach((cb) => {
      cb.checked = p3.inspectors[cb.dataset.key] || false;
    });
  }
}

function setupEscapeKey() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal").forEach((m) => {
        if (m.style.display === "block") m.style.display = "none";
      });
    }
  });
}
