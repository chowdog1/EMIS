// EMIS/public/js/paginationUtils.js
function setupPaginationControls(
  currentPage,
  pageSize,
  totalRecords,
  updateTableCallback,
  options = {}
) {
  const {
    pageSizeSelectId = "pageSizeSelect",
    firstPageBtnId = "firstPageBtn",
    prevPageBtnId = "prevPageBtn",
    nextPageBtnId = "nextPageBtn",
    lastPageBtnId = "lastPageBtn",
    paginationInfoId = "paginationInfo",
  } = options;

  // Set initial page size from the select element
  const pageSizeSelect = document.getElementById(pageSizeSelectId);
  if (pageSizeSelect) {
    pageSize = parseInt(pageSizeSelect.value);
  }

  // Setup event listeners only once
  setupPaginationEventListenersOnce(updateTableCallback);
}

function setupPaginationEventListenersOnce(updateTableCallback) {
  // Next page button
  const nextPageBtn = document.getElementById("nextPageBtn");
  if (nextPageBtn && !nextPageBtn.hasAttribute("data-listener-attached")) {
    nextPageBtn.addEventListener("click", function () {
      const totalPages = Math.ceil(totalRecords / pageSize);
      if (currentPage < totalPages) {
        updateTableCallback(currentPage + 1, pageSize);
      }
    });
    nextPageBtn.setAttribute("data-listener-attached", "true");
  }

  // Previous page button
  const prevPageBtn = document.getElementById("prevPageBtn");
  if (prevPageBtn && !prevPageBtn.hasAttribute("data-listener-attached")) {
    prevPageBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        updateTableCallback(currentPage - 1, pageSize);
      }
    });
    prevPageBtn.setAttribute("data-listener-attached", "true");
  }

  // First page button
  const firstPageBtn = document.getElementById("firstPageBtn");
  if (firstPageBtn && !firstPageBtn.hasAttribute("data-listener-attached")) {
    firstPageBtn.addEventListener("click", function () {
      updateTableCallback(1, pageSize);
    });
    firstPageBtn.setAttribute("data-listener-attached", "true");
  }

  // Last page button
  const lastPageBtn = document.getElementById("lastPageBtn");
  if (lastPageBtn && !lastPageBtn.hasAttribute("data-listener-attached")) {
    lastPageBtn.addEventListener("click", function () {
      const totalPages = Math.ceil(totalRecords / pageSize);
      updateTableCallback(totalPages, pageSize);
    });
    lastPageBtn.setAttribute("data-listener-attached", "true");
  }

  // Page size selector
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if (
    pageSizeSelect &&
    !pageSizeSelect.hasAttribute("data-listener-attached")
  ) {
    pageSizeSelect.addEventListener("change", function () {
      const newPageSize = parseInt(this.value);
      updateTableCallback(1, newPageSize);
    });
    pageSizeSelect.setAttribute("data-listener-attached", "true");
  }
}

function updatePaginationControls(
  currentPage,
  pageSize,
  totalRecords,
  updateTableCallback,
  options = {}
) {
  const {
    firstPageBtnId = "firstPageBtn",
    prevPageBtnId = "prevPageBtn",
    nextPageBtnId = "nextPageBtn",
    lastPageBtnId = "lastPageBtn",
    paginationInfoId = "paginationInfo",
  } = options;

  // Ensure we have valid values
  currentPage = Math.max(1, currentPage);
  pageSize = Math.max(1, pageSize);
  totalRecords = Math.max(0, totalRecords);

  if (totalRecords === 0) {
    const paginationInfo = document.getElementById(paginationInfoId);
    if (paginationInfo) {
      paginationInfo.textContent = "Showing 0 of 0 records";
    }
    // Disable all pagination buttons
    const buttons = [
      firstPageBtnId,
      prevPageBtnId,
      nextPageBtnId,
      lastPageBtnId,
    ];
    buttons.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Ensure currentPage is within valid range
  currentPage = Math.min(currentPage, totalPages);

  // Update pagination info
  const paginationInfo = document.getElementById(paginationInfoId);
  if (paginationInfo) {
    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);
    paginationInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
  }

  // Update button states
  const firstPageBtn = document.getElementById(firstPageBtnId);
  const prevPageBtn = document.getElementById(prevPageBtnId);
  const nextPageBtn = document.getElementById(nextPageBtnId);
  const lastPageBtn = document.getElementById(lastPageBtnId);

  if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;
}

function getPaginatedData(dataArray, currentPage, pageSize) {
  if (!dataArray || dataArray.length === 0) {
    return [];
  }

  // Ensure valid values
  currentPage = Math.max(1, currentPage);
  pageSize = Math.max(1, pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return dataArray.slice(startIndex, endIndex);
}

// Make functions available globally
window.setupPaginationControls = setupPaginationControls;
window.updatePaginationControls = updatePaginationControls;
window.getPaginatedData = getPaginatedData;
