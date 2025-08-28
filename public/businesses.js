// businesses.js
const logoUrls = [
  "https://upload.wikimedia.org/wikipedia/commons/b/b1/Bagong_Pilipinas_logo.png",
  "https://upload.wikimedia.org/wikipedia/commons/3/34/Seal_of_San_Juan%2C_Metro_Manila.png",
  "/makabagong%20san%20juan%20Logo.png",
];
let currentYear = "2025"; // Default to 2025
// Pagination variables - Global scope
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let allBusinesses = []; // Store all businesses for client-side pagination

// Helper function to get the authentication token
function getAuthToken() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }
  return token;
}

// Helper function to handle 401 errors
function handleUnauthorizedError() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  window.location.href = "/";
}

// Inactivity Manager Class
class InactivityManager {
  constructor() {
    this.sessionCheckInterval = null;
    this.inactivityTimer = null;
    this.warningTimer = null;
    this.inactivityTimeout = 180 * 1000; // 1 minute in milliseconds
    this.warningTimeout = 160 * 1000; // Show warning 20 seconds before logout
    this.init();
  }
  init() {
    console.log("Initializing inactivity manager");
    // Start periodic session check
    this.startSessionCheck();
    // Setup inactivity detection
    this.setupInactivityDetection();
    // Create inactivity warning popup
    this.createInactivityWarning();
  }
  // Start periodic session check
  startSessionCheck() {
    // Clear any existing interval
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    // Check every 1 minute
    this.sessionCheckInterval = setInterval(async () => {
      const isValid = await this.checkSessionValidity();
      if (!isValid) {
        console.log("Session expired or invalid");
        this.clearSessionData();
        window.location.href = "/";
      }
    }, 1 * 60 * 1000); // 1 minute
    console.log("Session check started (1 minute interval)");
  }
  // Stop session check
  stopSessionCheck() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
      console.log("Session check stopped");
    }
  }
  // Setup inactivity detection
  setupInactivityDetection() {
    console.log("Setting up inactivity detection");
    // Reset inactivity timer on user activity
    const resetInactivityTimer = () => {
      console.log("User activity detected, resetting inactivity timer");
      this.resetInactivityTimer();
    };
    // Add event listeners for user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown",
      "input",
    ];
    events.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer, true);
    });
    // Start the inactivity timer
    this.resetInactivityTimer();
    console.log("Inactivity detection setup complete");
  }
  // Reset inactivity timer
  resetInactivityTimer() {
    // Clear existing timers
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    // Hide warning popup if it's visible
    this.hideInactivityWarning();
    // Set warning timer (40 seconds before logout)
    this.warningTimer = setTimeout(() => {
      console.log("Showing inactivity warning");
      this.showInactivityWarning();
    }, this.warningTimeout);
    // Set logout timer (60 seconds total)
    this.inactivityTimer = setTimeout(() => {
      console.log("User inactive for 1 minute, logging out");
      this.logout();
    }, this.inactivityTimeout);
    console.log(
      `Inactivity timer reset (will logout after ${
        this.inactivityTimeout / 1000
      } seconds of inactivity)`
    );
  }
  // Create inactivity warning popup
  createInactivityWarning() {
    // Create popup container
    const popup = document.createElement("div");
    popup.id = "inactivityWarning";
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 24px;
      max-width: 400px;
      width: 90%;
      z-index: 10000;
      display: none;
      text-align: center;
      border: 1px solid #e0e0e0;
    `;
    // Create warning icon
    const icon = document.createElement("div");
    icon.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
    icon.style.marginBottom = "16px";
    // Create warning message
    const message = document.createElement("h3");
    message.textContent = "Session Timeout Warning";
    message.style.cssText = `
      margin: 0 0 12px 0;
      color: #333;
      font-size: 18px;
      font-weight: 600;
    `;
    // Create warning text
    const text = document.createElement("p");
    text.textContent =
      "You have been inactive for a while. You will be automatically logged out in 20 seconds.";
    text.style.cssText = `
      margin: 0 0 24px 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    `;
    // Create countdown timer
    const countdown = document.createElement("div");
    countdown.id = "inactivityCountdown";
    countdown.textContent = "20";
    countdown.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: #ff9800;
      margin-bottom: 20px;
    `;
    // Create buttons container
    const buttons = document.createElement("div");
    buttons.style.cssText =
      "display: flex; gap: 12px; justify-content: center;";
    // Create stay logged in button
    const stayButton = document.createElement("button");
    stayButton.textContent = "Stay Logged In";
    stayButton.style.cssText = `
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    stayButton.addEventListener("click", () => {
      this.resetInactivityTimer();
    });
    stayButton.addEventListener("mouseenter", () => {
      stayButton.style.background = "#45a049";
    });
    stayButton.addEventListener("mouseleave", () => {
      stayButton.style.background = "#4caf50";
    });
    // Create logout button
    const logoutButton = document.createElement("button");
    logoutButton.textContent = "Logout Now";
    logoutButton.style.cssText = `
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    logoutButton.addEventListener("click", () => {
      this.logout();
    });
    logoutButton.addEventListener("mouseenter", () => {
      logoutButton.style.background = "#d32f2f";
    });
    logoutButton.addEventListener("mouseleave", () => {
      logoutButton.style.background = "#f44336";
    });
    // Append elements
    buttons.appendChild(stayButton);
    buttons.appendChild(logoutButton);
    popup.appendChild(icon);
    popup.appendChild(message);
    popup.appendChild(text);
    popup.appendChild(countdown);
    popup.appendChild(buttons);
    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "inactivityOverlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: none;
    `;
    // Add to document
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    console.log("Inactivity warning popup created");
  }
  // Show inactivity warning popup
  showInactivityWarning() {
    const popup = document.getElementById("inactivityWarning");
    const overlay = document.getElementById("inactivityOverlay");
    const countdown = document.getElementById("inactivityCountdown");
    if (popup && overlay && countdown) {
      popup.style.display = "block";
      overlay.style.display = "block";
      // Start countdown
      let timeLeft = 20;
      countdown.textContent = timeLeft;
      const countdownInterval = setInterval(() => {
        timeLeft--;
        countdown.textContent = timeLeft;
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
      // Store interval ID to clear it later
      popup.countdownInterval = countdownInterval;
    }
  }
  // Hide inactivity warning popup
  hideInactivityWarning() {
    const popup = document.getElementById("inactivityWarning");
    const overlay = document.getElementById("inactivityOverlay");
    if (popup && overlay) {
      popup.style.display = "none";
      overlay.style.display = "none";
      // Clear countdown interval if it exists
      if (popup.countdownInterval) {
        clearInterval(popup.countdownInterval);
      }
    }
  }
  // Check session validity
  async checkSessionValidity() {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return false;
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return response.ok;
    } catch (error) {
      console.error("Session check error:", error);
      // If server is unavailable, allow the session to continue
      return true;
    }
  }
  // Clear session data
  clearSessionData() {
    console.log("Clearing session data");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    // Clear all cookies
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    // Clear sessionStorage
    sessionStorage.clear();
  }
  // Logout function
  async logout() {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        // Call server logout endpoint
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          console.log("Server logout successful");
        } else {
          console.error("Server logout failed");
        }
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Always clear local data and redirect
      this.clearSessionData();
      window.location.href = "/";
    }
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

// Wait for DOM to be fully loaded
window.addEventListener("load", function () {
  console.log("Businesses page loaded, initializing");
  // Update current page for user tracking
  updateCurrentPage("Business Directory");
  //Preload logos
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
  // Initialize inactivity manager
  window.inactivityManager = new InactivityManager();
  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Handle page visibility change
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
      // Reset inactivity timer when page becomes visible again
      window.inactivityManager.resetInactivityTimer();
    }
  }
});

// Handle beforeunload event
window.addEventListener("beforeunload", () => {
  // Note: This won't reliably call the server logout
  // It's better to rely on the periodic session check
  console.log("Page is unloading");
});

// Function to check authentication
function checkAuthentication() {
  console.log("=== Checking Authentication ===");
  const token = localStorage.getItem("auth_token");
  const userData = localStorage.getItem("user_data");
  console.log("Token found:", !!token);
  console.log("User data found:", !!userData);
  if (!token || !userData) {
    console.log("No token or user data found, redirecting to login");
    window.location.href = "/";
    return;
  }
  try {
    // Check if token has valid format first
    if (!window.isValidTokenFormat(token)) {
      console.log("Invalid token format, clearing data and redirecting");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
      return;
    }
    // Check if token is expired locally first
    if (window.isTokenExpired(token)) {
      console.log("Token is expired, clearing data and redirecting");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
      return;
    }
    const user = JSON.parse(userData);
    console.log("User data parsed successfully:", user);
    console.log("User ID:", user.id);
    console.log("User Email:", user.email);
    // Verify that the token user matches the stored user data
    const tokenUser = window.getUserFromToken(token);
    if (!tokenUser || tokenUser.userId !== user.id) {
      console.log("Token user ID doesn't match stored user ID, clearing data");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
      return;
    }
    // Update user info in the UI
    updateUserInterface(user);
    // Verify token with server in the background - don't await it
    verifyTokenWithServer(token)
      .then((success) => {
        console.log("Server token verification successful");
      })
      .catch((error) => {
        console.error("Token verification failed:", error);
        // Only redirect if it's a 401 error
        if (error.status === 401) {
          console.log("Server rejected token, logging out");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_data");
          window.location.href = "/";
        }
      });
  } catch (e) {
    console.error("Error parsing user data:", e);
    window.location.href = "/";
  }
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

// Function to update user interface
async function updateUserInterface(user) {
  console.log("Updating user interface with user:", user);
  const userEmailElement = document.getElementById("userEmail");
  const userAvatarImage = document.getElementById("userAvatarImage");
  const userAvatarFallback = document.getElementById("userAvatarFallback");
  // Get the greeting based on current time
  const greeting = getTimeBasedGreeting();
  // Get the user's first name if available, otherwise fall back to email
  const displayName = user.firstname || user.email;
  if (userEmailElement) {
    // Update with greeting and first name
    userEmailElement.textContent = `${greeting}, ${displayName}!`;
    console.log("Updated user greeting to:", userEmailElement.textContent);
  } else {
    console.error("User email element not found");
  }
  // Update avatar using the shared utility function
  updateUserAvatar(user, userAvatarImage, userAvatarFallback);
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

// Function to verify token with server
async function verifyTokenWithServer(token) {
  try {
    console.log("=== Verifying Token with Server ===");
    console.log("Token being verified:", token.substring(0, 20) + "...");
    const response = await fetch("/api/auth/verify-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    if (response.ok) {
      console.log("Token verification successful");
      const data = await response.json();
      console.log("Response data:", data);
      // Update localStorage with fresh user data
      if (data.user && data.valid) {
        localStorage.setItem("user_data", JSON.stringify(data.user));
        console.log("Updated localStorage with fresh user data");
      }
      return true;
    } else {
      console.log("Token verification failed, status:", response.status);
      // Only reject if the token is actually invalid (401)
      if (response.status === 401) {
        throw new Error("Invalid token");
      }
      // For other errors, don't reject
      return true;
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    // For network errors or other issues, don't reject
    return true;
  }
}

// Function to initialize business table
function initializeBusinessTable() {
  console.log("Initializing business table");
  // Setup pagination controls first to set the initial page size
  setupPaginationControls();
  // Setup refresh button
  setupRefreshButton();
  // Load initial data
  loadBusinessData();
  // Setup add business button
  setupAddBusinessButton();
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
    const apiUrl =
      currentYear === "2026" ? "/api/business2026" : "/api/business2025";
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
    updateBusinessTable(getPaginatedData());
    // Update pagination controls
    updatePaginationControls();
  } catch (error) {
    console.error("Error loading business data:", error);
    // Show error message in table
    showTableError(`Failed to load business data: ${error.message}`);
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

// Function to get paginated data
function getPaginatedData() {
  if (!allBusinesses || allBusinesses.length === 0) {
    return [];
  }
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return allBusinesses.slice(startIndex, endIndex);
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
          text = "High Risk";
          break;
        case "LOWRISK":
          color = "#28a745";
          text = "Low Risk";
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
    month: "long",
    day: "numeric",
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
    let apiUrl;
    if (currentYear === "2026") {
      apiUrl = "/api/business2026";
    } else {
      apiUrl = "/api/business2025";
    }
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
    // Show success message
    showSuccessMessage("Business added successfully!");
    // Refresh the business table
    loadBusinessData();
  } catch (error) {
    console.error("Error adding business:", error);
    showErrorMessage(`Failed to add business: ${error.message}`);
  }
}

// Function to show success message
function showSuccessMessage(message) {
  // Create success alert element
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
  // Add to body
  document.body.appendChild(alertDiv);
  // Remove after 3 seconds
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
  // Create error alert element
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
  // Add to body
  document.body.appendChild(alertDiv);
  // Remove after 5 seconds
  setTimeout(() => {
    alertDiv.style.opacity = "0";
    alertDiv.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(alertDiv);
    }, 500);
  }, 5000);
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
    console.log("Initial page size set to:", pageSize);
  }
  // First page button
  const firstPageBtn = document.getElementById("firstPageBtn");
  if (firstPageBtn) {
    firstPageBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage = 1;
        updateBusinessTable(getPaginatedData());
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
        updateBusinessTable(getPaginatedData());
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
        updateBusinessTable(getPaginatedData());
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
        updateBusinessTable(getPaginatedData());
        updatePaginationControls();
      }
    });
  }
  // Page size selector
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", function () {
      pageSize = parseInt(this.value);
      currentPage = 1; // Reset to first page
      updateBusinessTable(getPaginatedData());
      updatePaginationControls();
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
    updateBusinessTable(getPaginatedData());
    // Update pagination controls
    updatePaginationControls();
  } catch (error) {
    console.error("Error searching businesses:", error);
    showErrorMessage(`Search failed: ${error.message}`);
  }
}

// Function to setup dropdown functionality
function setupDropdown() {
  console.log("Setting up dropdown functionality");
  const userDropdown = document.getElementById("userDropdown");
  const userDropdownMenu = document.getElementById("userDropdownMenu");
  if (!userDropdown || !userDropdownMenu) {
    console.error("Dropdown elements not found");
    return;
  }
  // Remove any existing event listeners
  const newUserDropdown = userDropdown.cloneNode(true);
  userDropdown.parentNode.replaceChild(newUserDropdown, userDropdown);
  // Add click event listener
  newUserDropdown.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Dropdown clicked");
    // Toggle dropdown menu
    userDropdownMenu.classList.toggle("show");
    // Close dropdown when clicking outside
    document.addEventListener("click", function closeDropdown(e) {
      if (!e.target.closest(".user-dropdown")) {
        userDropdownMenu.classList.remove("show");
        document.removeEventListener("click", closeDropdown);
      }
    });
  });
  console.log("Dropdown functionality setup complete");
}

// Function to setup logout functionality
function setupLogout() {
  console.log("Setting up logout functionality");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) {
    console.error("Logout button not found");
    return;
  }
  // Remove any existing event listeners
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
  // Add click event listener
  newLogoutBtn.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("Logout button clicked");
    // Use the inactivity manager's logout method if available
    if (window.inactivityManager) {
      window.inactivityManager.logout();
    } else {
      // Fallback logout
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
    }
  });
  console.log("Logout functionality setup complete");
}

// Helper functions for token handling
function isTokenExpired(token) {
  try {
    // Split the token and get the payload
    const parts = token.split(".");
    if (parts.length !== 3) {
      return true; // Invalid token format
    }
    // Decode the payload
    const payload = JSON.parse(atob(parts[1]));
    // Check if it has an expiration time
    if (!payload.exp) {
      return true; // No expiration time
    }
    // Check if it's expired
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    console.error("Error checking token expiration:", e);
    return true; // Assume expired if there's an error
  }
}

function getUserFromToken(token) {
  try {
    // Split the token and get the payload
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null; // Invalid token format
    }
    // Decode the payload
    return JSON.parse(atob(parts[1]));
  } catch (e) {
    console.error("Error decoding token:", e);
    return null;
  }
}

// Helper function to update user avatar
async function updateUserAvatar(user, imageElement, fallbackElement) {
  if (!imageElement || !fallbackElement) {
    console.error("Avatar elements not found");
    return;
  }
  // Check if user has a profile picture
  if (user.hasProfilePicture) {
    try {
      // Get the token for authorization
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("No auth token found");
        showFallbackAvatar(user, fallbackElement);
        return;
      }
      // Fetch the profile picture
      const response = await fetch(`/api/auth/profile-picture/${user.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        // Convert the response to a blob URL
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        // Set the image source and show it
        imageElement.src = imageUrl;
        imageElement.style.display = "block";
        fallbackElement.style.display = "none";
        console.log("Profile picture loaded successfully");
      } else {
        console.error("Failed to load profile picture:", response.status);
        showFallbackAvatar(user, fallbackElement);
      }
    } catch (error) {
      console.error("Error loading profile picture:", error);
      showFallbackAvatar(user, fallbackElement);
    }
  } else {
    // User doesn't have a profile picture, show fallback
    console.log("User has no profile picture, showing fallback");
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
  // Hide the image element
  const imageElement = document.getElementById("userAvatarImage");
  if (imageElement) {
    imageElement.style.display = "none";
  }
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
