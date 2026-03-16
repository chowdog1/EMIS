// violations.js

let currentYear = new Date().getFullYear().toString();
if (currentYear < "2025") currentYear = "2025";
else if (currentYear > "2030") currentYear = "2030";

let activeTab = "violations";

// Violations state
let allViolations = [];
let vPage = 1,
  vSize = 10,
  vTotal = 0;

// Compliance state
let allCompliance = [];
let cPage = 1,
  cSize = 10,
  cTotal = 0;

let activeViolationId = null;
let activeComplianceId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("load", function () {
  if (typeof updateCurrentPage === "function")
    updateCurrentPage("Violations & Compliance");
  checkAuthentication();
  setupDropdown();
  setupLogout();
  updateDateTime();
  setInterval(updateDateTime, 1000);

  setupTabs();
  setupYearSelection();
  setupSearch();
  setupRefreshButton();
  setupPaginationListeners();
  setupModalClosers();
  setupEscapeKey();

  loadAll();
});

if (typeof initAccountLockNotifier === "function") initAccountLockNotifier();

// ── Year ──────────────────────────────────────────────────────────────────────
function setupYearSelection() {
  const sel = document.getElementById("yearSelect");
  if (!sel) return;
  sel.value = currentYear;
  sel.addEventListener("change", function () {
    currentYear = this.value;
    loadAll();
  });
}

async function loadAll() {
  await Promise.all([
    loadViolations(),
    loadCompliance(),
    loadViolationStats(),
    loadComplianceStats(),
  ]);
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      this.classList.add("active");
      activeTab = this.dataset.tab;
      document.getElementById(`tab-${activeTab}`).classList.add("active");
    });
  });
}

// ── Load violations ───────────────────────────────────────────────────────────
async function loadViolations(searchQ = "") {
  try {
    showLoading("violationsTable", "Loading violations...");
    const token = getAuthToken();
    let url = `/api/violations?year=${currentYear}`;
    if (searchQ) url += `&accountNo=${encodeURIComponent(searchQ)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load violations");
    allViolations = await res.json();
    vTotal = allViolations.length;
    vPage = 1;
    renderViolationsTable();
    document.getElementById("violationsCount").textContent = vTotal;
  } catch (e) {
    showError("violationsTable", e.message);
  }
}

async function loadViolationStats() {
  try {
    const token = getAuthToken();
    const res = await fetch(
      `/api/violations/stats/summary?year=${currentYear}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return;
    const s = await res.json();
    document.getElementById("vs_total").textContent = s.total || 0;
    document.getElementById("vs_unpaid").textContent = s.unpaid || 0;
    document.getElementById("vs_paid").textContent = s.paid || 0;
    document.getElementById("vs_waived").textContent = s.waived || 0;
    document.getElementById("vs_fines").textContent = s.totalFines
      ? `₱${Number(s.totalFines).toLocaleString()}`
      : "₱0";
  } catch (_) {}
}

function renderViolationsTable() {
  const start = (vPage - 1) * vSize;
  const slice = allViolations.slice(start, start + vSize);
  const el = document.getElementById("violationsTable");

  if (!slice.length) {
    el.innerHTML = `<div class="table-empty"><i class="fas fa-gavel" style="font-size:28px;margin-bottom:10px;display:block;color:var(--gray-400)"></i><p>No violation records found for ${currentYear}.</p></div>`;
    updateVPagination();
    return;
  }

  el.innerHTML = `
    <table class="vc-table">
      <thead><tr>
        <th>Inspection ID</th><th>Account No.</th><th>Business Name</th>
        <th>OVR No.</th><th>Date of Violation</th><th>Total Fine</th>
        <th>Payment</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${slice
          .map(
            (r) => `
          <tr>
            <td><span class="insp-id">${r.inspectionId || "—"}</span></td>
            <td><span class="acct-link" onclick="openViolationDetail('${r._id}')">${r.accountNo || "—"}</span></td>
            <td>${r.businessName || "—"}</td>
            <td><strong>${r.ovrNo || "—"}</strong></td>
            <td>${r.dateOfViolation ? new Date(r.dateOfViolation).toLocaleDateString("en-PH") : "—"}</td>
            <td style="font-weight:700;color:#dc3545;">₱${(r.totalFine || 0).toLocaleString()}</td>
            <td>${paymentBadge(r.paymentStatus)}</td>
            <td class="action-cell">
              <button class="act-btn act-view" title="View & Update Payment" onclick="openViolationDetail('${r._id}')"><i class="fas fa-eye"></i></button>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
  updateVPagination();
}

function paymentBadge(status) {
  const map = {
    UNPAID: "badge-unpaid",
    PAID: "badge-paid",
    WAIVED: "badge-waived",
  };
  return `<span class="badge ${map[status] || "badge-unpaid"}">${status || "UNPAID"}</span>`;
}

function updateVPagination() {
  const start = vTotal === 0 ? 0 : (vPage - 1) * vSize + 1;
  const end = Math.min(vPage * vSize, vTotal);
  document.getElementById("vPaginationInfo").textContent =
    `Showing ${start}–${end} of ${vTotal} records`;
  document.getElementById("vPrevBtn").disabled = vPage <= 1;
  document.getElementById("vNextBtn").disabled = end >= vTotal;
}

// ── Load compliance ───────────────────────────────────────────────────────────
async function loadCompliance(searchQ = "") {
  try {
    showLoading("complianceTable", "Loading compliance records...");
    const token = getAuthToken();
    let url = `/api/compliance?year=${currentYear}`;
    if (searchQ) url += `&accountNo=${encodeURIComponent(searchQ)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load compliance");
    allCompliance = await res.json();
    cTotal = allCompliance.length;
    cPage = 1;
    renderComplianceTable();
    document.getElementById("complianceCount").textContent = cTotal;
  } catch (e) {
    showError("complianceTable", e.message);
  }
}

async function loadComplianceStats() {
  try {
    const token = getAuthToken();
    const res = await fetch(
      `/api/compliance/stats/summary?year=${currentYear}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return;
    const s = await res.json();
    document.getElementById("cs_total").textContent = s.total || 0;
    document.getElementById("cs_pending").textContent = s.pending || 0;
    document.getElementById("cs_partial").textContent = s.partial || 0;
    document.getElementById("cs_full").textContent = s.full || 0;
    document.getElementById("cs_overdue").textContent = s.overdue || 0;
  } catch (_) {}
}

function renderComplianceTable() {
  const start = (cPage - 1) * cSize;
  const slice = allCompliance.slice(start, start + cSize);
  const el = document.getElementById("complianceTable");

  if (!slice.length) {
    el.innerHTML = `<div class="table-empty"><i class="fas fa-tasks" style="font-size:28px;margin-bottom:10px;display:block;color:var(--gray-400)"></i><p>No compliance records found for ${currentYear}.</p></div>`;
    updateCPagination();
    return;
  }

  el.innerHTML = `
    <table class="vc-table">
      <thead><tr>
        <th>Inspection ID</th><th>Account No.</th><th>Business Name</th>
        <th>Deadline</th><th>Deadline Date</th>
        <th>Requirements</th><th>Overall Status</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${slice
          .map((r) => {
            const complied =
              r.requirements?.filter((x) => x.status === "COMPLIED").length ||
              0;
            const total = r.requirements?.length || 0;
            return `
          <tr>
            <td><span class="insp-id">${r.inspectionId || "—"}</span></td>
            <td><span class="acct-link" onclick="openComplianceDetail('${r._id}')">${r.accountNo || "—"}</span></td>
            <td>${r.businessName || "—"}</td>
            <td>${r.complianceDeadline || "—"}</td>
            <td>${r.deadlineDate ? new Date(r.deadlineDate).toLocaleDateString("en-PH") : "—"}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;background:var(--gray-200);border-radius:10px;height:8px;overflow:hidden;">
                  <div style="height:100%;width:${total ? Math.round((complied / total) * 100) : 0}%;background:var(--primary-green);border-radius:10px;"></div>
                </div>
                <span style="font-size:0.78rem;font-weight:600;white-space:nowrap;">${complied}/${total}</span>
              </div>
            </td>
            <td>${complianceBadge(r.overallStatus)}</td>
            <td class="action-cell">
              <button class="act-btn act-view" title="View & Update" onclick="openComplianceDetail('${r._id}')"><i class="fas fa-edit"></i></button>
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
  updateCPagination();
}

function complianceBadge(status) {
  const map = {
    PENDING: { cls: "badge-pending", label: "Pending" },
    PARTIALLY_COMPLIED: { cls: "badge-partial", label: "Partial" },
    FULLY_COMPLIED: { cls: "badge-full", label: "Fully Complied" },
    OVERDUE: { cls: "badge-overdue", label: "Overdue" },
  };
  const s = map[status] || { cls: "badge-pending", label: status || "Pending" };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

function updateCPagination() {
  const start = cTotal === 0 ? 0 : (cPage - 1) * cSize + 1;
  const end = Math.min(cPage * cSize, cTotal);
  document.getElementById("cPaginationInfo").textContent =
    `Showing ${start}–${end} of ${cTotal} records`;
  document.getElementById("cPrevBtn").disabled = cPage <= 1;
  document.getElementById("cNextBtn").disabled = end >= cTotal;
}

// ── Open violation detail ─────────────────────────────────────────────────────
async function openViolationDetail(id) {
  try {
    const token = getAuthToken();
    const res = await fetch(`/api/violations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load");
    const r = await res.json();
    activeViolationId = id;

    const el = (id) => document.getElementById(id);
    const tx = (id, val) => {
      const e = el(id);
      if (e) e.textContent = val ?? "—";
    };
    tx("vd_inspectionId", r.inspectionId);
    tx("vd_ovrNo", r.ovrNo);
    tx("vd_accountNo", r.accountNo);
    tx("vd_businessName", r.businessName);
    tx(
      "vd_dateOfViolation",
      r.dateOfViolation
        ? new Date(r.dateOfViolation).toLocaleDateString("en-PH")
        : "—",
    );
    tx("vd_orNo", r.orNo || "—");
    tx(
      "vd_paymentDate",
      r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("en-PH") : "—",
    );
    el("vd_paymentStatus").innerHTML = paymentBadge(r.paymentStatus);

    // Ordinance list
    const list = el("vd_ordinanceList");
    list.innerHTML =
      (r.violatedOrdinances || [])
        .map(
          (o) =>
            `<li><span>${o.ordinanceLabel || o.ordinanceKey}</span><span class="ord-fee">₱${(o.fee || 0).toLocaleString()}</span></li>`,
        )
        .join("") ||
      "<li style='color:var(--gray-500)'>No ordinances recorded.</li>";
    tx("vd_totalFine", `₱${(r.totalFine || 0).toLocaleString()}`);

    // Pre-fill payment form
    el("pay_status").value = r.paymentStatus || "UNPAID";
    el("pay_orNo").value = r.orNo || "";
    el("pay_remarks").value = r.remarks || "";
    if (r.paymentDate)
      el("pay_date").value = new Date(r.paymentDate).toISOString().slice(0, 10);

    el("violationDetailModal").style.display = "block";
  } catch (e) {
    showErrorMessage(e.message);
  }
}

document
  .getElementById("savePaymentBtn")
  ?.addEventListener("click", async () => {
    if (!activeViolationId) return;
    try {
      const token = getAuthToken();
      const payload = {
        paymentStatus: document.getElementById("pay_status").value,
        paymentDate: document.getElementById("pay_date").value,
        orNo: document.getElementById("pay_orNo").value.trim(),
        remarks: document.getElementById("pay_remarks").value.trim(),
      };
      const res = await fetch(`/api/violations/${activeViolationId}/payment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save payment");
      document.getElementById("violationDetailModal").style.display = "none";
      showSuccessMessage("Payment status updated.");
      loadViolations();
      loadViolationStats();
    } catch (e) {
      showErrorMessage(e.message);
    }
  });

// ── Open compliance detail ────────────────────────────────────────────────────
async function openComplianceDetail(id) {
  try {
    const token = getAuthToken();
    const res = await fetch(`/api/compliance/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load");
    const r = await res.json();
    activeComplianceId = id;

    const tx = (eid, val) => {
      const e = document.getElementById(eid);
      if (e) e.textContent = val ?? "—";
    };
    tx("cd_inspectionId", r.inspectionId);
    tx("cd_accountNo", r.accountNo);
    tx("cd_businessName", r.businessName);
    tx("cd_deadline", r.complianceDeadline || "—");
    tx(
      "cd_deadlineDate",
      r.deadlineDate
        ? new Date(r.deadlineDate).toLocaleDateString("en-PH")
        : "—",
    );
    document.getElementById("cd_overallStatus").innerHTML = complianceBadge(
      r.overallStatus,
    );
    document.getElementById("cd_remarks").value = r.remarks || "";

    // Requirements rows
    const list = document.getElementById("cd_requirementsList");
    list.innerHTML =
      (r.requirements || [])
        .map(
          (req) => `
      <div class="req-row" data-key="${req.requirementKey}">
        <span class="req-label">${req.requirementLabel || req.requirementKey}</span>
        <select class="req-status-select" data-key="${req.requirementKey}" onchange="onReqStatusChange(this)">
          <option value="PENDING"  ${req.status === "PENDING" ? "selected" : ""}>Pending</option>
          <option value="COMPLIED" ${req.status === "COMPLIED" ? "selected" : ""}>Complied</option>
          <option value="OVERDUE"  ${req.status === "OVERDUE" ? "selected" : ""}>Overdue</option>
        </select>
        <input type="date" class="req-date-input" data-key="${req.requirementKey}"
          value="${req.complianceDate ? new Date(req.complianceDate).toISOString().slice(0, 10) : ""}"
          placeholder="Compliance date" style="display:${req.status === "COMPLIED" ? "block" : "none"};" />
      </div>`,
        )
        .join("") ||
      "<p style='color:var(--gray-500);'>No requirements recorded.</p>";

    document.getElementById("complianceDetailModal").style.display = "block";
  } catch (e) {
    showErrorMessage(e.message);
  }
}

function onReqStatusChange(select) {
  const key = select.dataset.key;
  const dateInp = document.querySelector(`.req-date-input[data-key="${key}"]`);
  if (dateInp)
    dateInp.style.display = select.value === "COMPLIED" ? "block" : "none";
}

document
  .getElementById("saveComplianceBtn")
  ?.addEventListener("click", async () => {
    if (!activeComplianceId) return;
    const token = getAuthToken();
    try {
      // Save each requirement that changed
      const selects = document.querySelectorAll(".req-status-select");
      for (const sel of selects) {
        const key = sel.dataset.key;
        const status = sel.value;
        const dateInp = document.querySelector(
          `.req-date-input[data-key="${key}"]`,
        );
        const compDate = dateInp ? dateInp.value : "";
        await fetch(`/api/compliance/${activeComplianceId}/requirement`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requirementKey: key,
            status,
            complianceDate: compDate || null,
          }),
        });
      }
      // Save overall remarks
      const remarks = document.getElementById("cd_remarks").value.trim();
      await fetch(`/api/compliance/${activeComplianceId}/remarks`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remarks }),
      });
      document.getElementById("complianceDetailModal").style.display = "none";
      showSuccessMessage("Compliance record updated.");
      loadCompliance();
      loadComplianceStats();
    } catch (e) {
      showErrorMessage(e.message);
    }
  });

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
  const q = document.getElementById("searchInput").value.trim();
  if (!q) {
    loadAll();
    return;
  }

  // Client-side filter on cached data
  const qLow = q.toLowerCase();
  if (activeTab === "violations") {
    const filtered = allViolations.filter(
      (r) =>
        (r.inspectionId || "").toLowerCase().includes(qLow) ||
        (r.accountNo || "").toLowerCase().includes(qLow) ||
        (r.businessName || "").toLowerCase().includes(qLow) ||
        (r.ovrNo || "").toLowerCase().includes(qLow),
    );
    allViolations = filtered;
    vTotal = filtered.length;
    vPage = 1;
    renderViolationsTable();
  } else {
    const filtered = allCompliance.filter(
      (r) =>
        (r.inspectionId || "").toLowerCase().includes(qLow) ||
        (r.accountNo || "").toLowerCase().includes(qLow) ||
        (r.businessName || "").toLowerCase().includes(qLow),
    );
    allCompliance = filtered;
    cTotal = filtered.length;
    cPage = 1;
    renderComplianceTable();
  }
}

function setupRefreshButton() {
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    loadAll();
  });
}

// ── Pagination listeners ──────────────────────────────────────────────────────
function setupPaginationListeners() {
  document.getElementById("vPrevBtn")?.addEventListener("click", () => {
    if (vPage > 1) {
      vPage--;
      renderViolationsTable();
    }
  });
  document.getElementById("vNextBtn")?.addEventListener("click", () => {
    if (vPage * vSize < vTotal) {
      vPage++;
      renderViolationsTable();
    }
  });
  document
    .getElementById("vPageSizeSelect")
    ?.addEventListener("change", function () {
      vSize = parseInt(this.value);
      vPage = 1;
      renderViolationsTable();
    });
  document.getElementById("cPrevBtn")?.addEventListener("click", () => {
    if (cPage > 1) {
      cPage--;
      renderComplianceTable();
    }
  });
  document.getElementById("cNextBtn")?.addEventListener("click", () => {
    if (cPage * cSize < cTotal) {
      cPage++;
      renderComplianceTable();
    }
  });
  document
    .getElementById("cPageSizeSelect")
    ?.addEventListener("change", function () {
      cSize = parseInt(this.value);
      cPage = 1;
      renderComplianceTable();
    });
}

// ── Modal closers ─────────────────────────────────────────────────────────────
function setupModalClosers() {
  document.querySelectorAll(".modal-close, .modal-close-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none";
    });
  });
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

// ── Table state helpers ───────────────────────────────────────────────────────
function showLoading(tableId, msg) {
  document.getElementById(tableId).innerHTML =
    `<div class="table-loading"><i class="fas fa-spinner fa-spin"></i><p>${msg}</p></div>`;
}
function showError(tableId, msg) {
  document.getElementById(tableId).innerHTML =
    `<div class="table-error"><i class="fas fa-exclamation-triangle"></i><p>${msg}</p></div>`;
}
