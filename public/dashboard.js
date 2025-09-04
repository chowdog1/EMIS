// dashboard.js
class DashboardManager {
  constructor() {
    this.sessionCheckInterval = null;
    this.inactivityTimer = null;
    this.warningTimer = null;
    this.inactivityTimeout = 180 * 1000; // 1 minute in milliseconds
    this.warningTimeout = 160 * 1000; // Show warning 20 seconds before logout
    this.currentYear = "2025"; // Default year
    this.barangayChartInstance = null;
    this.monthlyChartInstance = null;
    this.init();
  }
  init() {
    console.log("Initializing dashboard manager");
    // Check if user is logged in
    this.checkAuthentication();
    // Setup dropdown functionality
    this.setupDropdown();
    // Setup logout functionality
    this.setupLogout();
    // Setup year selector
    this.setupYearSelector();
    // Fetch dashboard data
    this.fetchDashboardData();
    // Start periodic session check
    this.startSessionCheck();
    // Setup inactivity detection
    this.setupInactivityDetection();
    // Create inactivity warning popup
    this.createInactivityWarning();
  }
  // Setup year selector
  setupYearSelector() {
    const yearSelect = document.getElementById("yearSelect");
    if (yearSelect) {
      // Set the initial value
      yearSelect.value = this.currentYear;
      // Add change event listener
      yearSelect.addEventListener("change", (e) => {
        this.currentYear = e.target.value;
        console.log(`Year changed to: ${this.currentYear}`);
        // Update the year display in the header
        const selectedYearElement = document.getElementById("selectedYear");
        const selectedYearInCardElement =
          document.getElementById("selectedYearInCard");
        if (selectedYearElement) {
          selectedYearElement.textContent = this.currentYear;
        }
        if (selectedYearInCardElement) {
          selectedYearInCardElement.textContent = this.currentYear;
        }
        // Fetch dashboard data for the selected year
        this.fetchDashboardData();
      });
    } else {
      console.error("Year selector element not found");
    }
  }
  // Function to check authentication
  async checkAuthentication() {
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
      const user = JSON.parse(userData);
      console.log("User data parsed successfully:", user);
      console.log("User ID:", user.id);
      console.log("User Email:", user.email);
      // Update user info in the UI
      this.updateUserInterface(user);
      // Verify token with server
      const isValid = await this.verifyTokenWithServer(token);
      if (!isValid) {
        console.log("Token verification failed, redirecting to login");
        this.clearSessionData();
        window.location.href = "/";
        return;
      }
      // Only fetch dashboard data after successful verification
      this.fetchDashboardData();
    } catch (e) {
      console.error("Error parsing user data:", e);
      this.clearSessionData();
      window.location.href = "/";
    }
  }
  // Function to get time-based greeting
  getTimeBasedGreeting() {
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
  async updateUserInterface(user) {
    console.log("Updating user interface with user:", user);
    const userEmailElement = document.getElementById("userEmail");
    const userAvatarImage = document.getElementById("userAvatarImage");
    const userAvatarFallback = document.getElementById("userAvatarFallback");
    // Get the greeting based on current time
    const greeting = this.getTimeBasedGreeting();
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
    this.updateUserAvatar(user, userAvatarImage, userAvatarFallback);
  }
  // Helper function to get user initials
  getUserInitials(user) {
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
  async verifyTokenWithServer(token) {
    try {
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        console.log("Token verification successful");
        return true;
      } else {
        console.log("Token verification failed, status:", response.status);
        // Try to get more information about the failure
        try {
          const errorData = await response.json();
          console.log("Error data:", errorData);
        } catch (e) {
          console.log("Could not parse error response");
        }
        return false;
      }
    } catch (error) {
      console.error("Error verifying token:", error);
      // If server is unavailable, we'll allow the session to continue
      // but log the error
      console.log("Continuing with session despite token verification error");
      return true; // Changed to true to allow offline access
    }
  }
  // Function to fetch dashboard data
  async fetchDashboardData() {
    try {
      console.log(`Fetching dashboard data for year: ${this.currentYear}`);
      const token = localStorage.getItem("auth_token");
      // Determine the API endpoint based on the current year
      let apiUrl;
      if (this.currentYear === "2026") {
        apiUrl = "/api/business2026/stats";
      } else {
        apiUrl = "/api/business2025/stats";
      }
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const data = await response.json();
      console.log("Dashboard data:", data);
      // Update dashboard cards
      this.updateDashboardCards(data);
      // Create barangay chart
      this.createBarangayChart(data.barangayStats);
      // Create monthly chart
      this.createMonthlyChart(data.monthlyTotals || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Try to load businesses directly if stats fail
      this.loadBusinessData();
    }
  }
  // Function to update dashboard cards
  updateDashboardCards(data) {
    console.log("Updating dashboard cards with data:", data);
    // Update total businesses
    const totalBusinessesElement = document.getElementById("totalBusinesses");
    if (totalBusinessesElement) {
      totalBusinessesElement.textContent = data.totalBusinesses || 0;
      console.log("Set total businesses to:", data.totalBusinesses || 0);
    } else {
      console.error("Total businesses element not found");
    }
    // Update active businesses
    const activeBusinessesElement = document.getElementById(
      "activeBusinessesCount"
    );
    if (activeBusinessesElement) {
      activeBusinessesElement.textContent = data.activeBusinessesCount || 0;
      console.log("Set active businesses to:", data.activeBusinessesCount || 0);
    } else {
      console.error("Active businesses element not found");
    }
    // Update high risk count
    const highRiskElement = document.getElementById("highRiskCount");
    if (highRiskElement) {
      highRiskElement.textContent = data.statusCounts?.HIGHRISK || 0;
      console.log("Set high risk count to:", data.statusCounts?.HIGHRISK || 0);
    } else {
      console.error("High risk element not found");
    }
    // Update low risk count
    const lowRiskElement = document.getElementById("lowRiskCount");
    if (lowRiskElement) {
      lowRiskElement.textContent = data.statusCounts?.LOWRISK || 0;
      console.log("Set low risk count to:", data.statusCounts?.LOWRISK || 0);
    } else {
      console.error("Low risk element not found");
    }
    // Update renewal pending count
    const renewalElement = document.getElementById("renewalCount");
    if (renewalElement) {
      renewalElement.textContent = data.renewalPendingCount || 0;
      console.log(
        "Set renewal pending count to:",
        data.renewalPendingCount || 0
      );
    } else {
      console.error("Renewal element not found");
    }
    // Update total amount paid
    const totalAmountPaidElement = document.getElementById("totalAmountPaid");
    if (totalAmountPaidElement) {
      // Format as Philippine Peso
      totalAmountPaidElement.textContent = `₱${data.totalAmountPaid.toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;
      console.log("Set total amount paid to:", data.totalAmountPaid);
    } else {
      console.error("Total amount paid element not found");
    }
  }
  // Function to create barangay chart (MODIFIED TO USE BAR CHART)
  createBarangayChart(barangayStats) {
    console.log("Creating barangay chart with data:", barangayStats);
    const ctx = document.getElementById("barangayChart");
    if (!ctx) {
      console.error("Barangay chart canvas not found");
      return;
    }
    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not loaded");
      return;
    }
    // Sort barangayStats by count (descending) for better visualization
    barangayStats.sort((a, b) => b.count - a.count);
    // Prepare data for the chart
    const labels = barangayStats.map((item) => item._id);
    const data = barangayStats.map((item) => item.count);
    console.log("Chart labels:", labels);
    console.log("Chart data:", data);
    try {
      // Destroy existing chart instance if it exists
      if (this.barangayChartInstance) {
        this.barangayChartInstance.destroy();
      }
      this.barangayChartInstance = new Chart(ctx, {
        type: "bar", // Changed from 'pie' to 'bar'
        data: {
          labels: labels,
          datasets: [
            {
              label: "Number of Businesses",
              data: data,
              backgroundColor: "rgba(45, 90, 39, 0.7)", // Primary green with opacity
              borderColor: "rgba(45, 90, 39, 1)", // Solid primary green
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Number of Businesses",
              },
            },
            x: {
              title: {
                display: true,
                text: "Barangay",
              },
            },
          },
          plugins: {
            legend: {
              display: false, // We don't need a legend for a single dataset bar chart
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `Businesses: ${context.raw}`;
                },
              },
            },
          },
        },
      });
      console.log("Bar chart created successfully");
    } catch (error) {
      console.error("Error creating chart:", error);
    }
  }

  // Function to create monthly payment chart
  createMonthlyChart(monthlyData) {
    console.log("Creating monthly chart with data:", monthlyData);
    const ctx = document.getElementById("monthlyChart");
    if (!ctx) {
      console.error("Monthly chart canvas not found");
      return;
    }

    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not loaded");
      return;
    }

    // Prepare data for the chart
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const labels = [];
    const data = [];

    // Initialize all months with 0
    for (let i = 1; i <= 12; i++) {
      labels.push(monthNames[i - 1]);
      data.push(0);
    }

    // Fill in the data we have
    monthlyData.forEach((item) => {
      const monthIndex = item._id - 1; // Convert to 0-based index
      if (monthIndex >= 0 && monthIndex < 12) {
        data[monthIndex] = item.totalAmount;
      }
    });

    console.log("Chart labels:", labels);
    console.log("Chart data:", data);

    try {
      // Destroy existing chart instance if it exists
      if (this.monthlyChartInstance) {
        this.monthlyChartInstance.destroy();
      }

      this.monthlyChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Amount Paid (₱)",
              data: data,
              backgroundColor: "rgba(45, 90, 39, 0.7)",
              borderColor: "rgba(45, 90, 39, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Amount (₱)",
              },
              ticks: {
                callback: function (value) {
                  return "₱" + value.toLocaleString("en-PH");
                },
              },
            },
            x: {
              title: {
                display: true,
                text: "Month",
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `₱${context.raw.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                },
              },
            },
          },
        },
      });
      console.log("Monthly chart created successfully");
    } catch (error) {
      console.error("Error creating monthly chart:", error);
    }
  }

  // Function to setup dropdown functionality
  setupDropdown() {
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
  setupLogout() {
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
    newLogoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      console.log("Logout button clicked");
      await this.logout();
    });
    console.log("Logout functionality setup complete");
  }
  // Logout function
  async logout() {
    try {
      // Notify server that user is going offline
      if (this.socket && this.socket.connected) {
        const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
        if (userData.id) {
          this.socket.emit("user-offline", {
            id: userData.id,
            firstname: userData.firstname,
            lastname: userData.lastname,
            email: userData.email,
          });
        }
      }
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
  // Check if token is expired (simplified version for browser)
  isTokenExpired(token) {
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
  // Get user from token (simplified version for browser)
  getUserFromToken(token) {
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
    // Check if popup already exists
    if (document.getElementById("inactivityWarning")) {
      return;
    }
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
  // Load business data (fallback method)
  loadBusinessData() {
    console.log("Loading business data as fallback");
    // This is a placeholder - implement as needed
  }
  // Update user avatar - FIXED VERSION
  async updateUserAvatar(user, imageElement, fallbackElement) {
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
          this.showFallbackAvatar(user, fallbackElement);
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
          this.showFallbackAvatar(user, fallbackElement);
        }
      } catch (error) {
        console.error("Error loading profile picture:", error);
        this.showFallbackAvatar(user, fallbackElement);
      }
    } else {
      // User doesn't have a profile picture, show fallback
      console.log("User has no profile picture, showing fallback");
      this.showFallbackAvatar(user, fallbackElement);
    }
  }
  // Show fallback avatar with initials
  showFallbackAvatar(user, fallbackElement) {
    const initials = this.getUserInitials(user);
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
  // Add updateCurrentPage method to DashboardManager class
  updateCurrentPage(page) {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.error("No authentication token found");
      return;
    }
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
// Wait for DOM to be fully loaded
window.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded, initializing dashboard");
  // Create dashboard manager instance
  window.dashboardManager = new DashboardManager();
  // Update current page for user tracking
  window.dashboardManager.updateCurrentPage("Dashboard");
  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
});
// Handle page visibility change
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Page hidden - pausing session check");
    if (window.dashboardManager) {
      window.dashboardManager.stopSessionCheck();
    }
  } else {
    console.log("Page visible - resuming session check");
    if (window.dashboardManager) {
      window.dashboardManager.startSessionCheck();
      // Reset inactivity timer when page becomes visible again
      window.dashboardManager.resetInactivityTimer();
    }
  }
});
