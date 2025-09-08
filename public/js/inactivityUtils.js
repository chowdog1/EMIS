// public/js/inactivityUtils.js

class InactivityManager {
  constructor() {
    this.sessionCheckInterval = null;
    this.inactivityTimer = null;
    this.warningTimer = null;
    this.inactivityTimeout = 180 * 1000; // 3 minutes in milliseconds
    this.warningTimeout = 160 * 1000; // Show warning 20 seconds before logout
    this.init();
  }

  init() {
    console.log("Initializing inactivity manager");
    this.startSessionCheck();
    this.setupInactivityDetection();
    this.createInactivityWarning();
    this.setupVisibilityChange();
  }

  // Session Management
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
        clearAllSessionData();
        window.location.href = "/";
      }
    }, 1 * 60 * 1000); // 1 minute
    console.log("Session check started (1 minute interval)");
  }

  stopSessionCheck() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
      console.log("Session check stopped");
    }
  }

  // Inactivity Detection
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

    // Set warning timer (20 seconds before logout)
    this.warningTimer = setTimeout(() => {
      console.log("Showing inactivity warning");
      this.showInactivityWarning();
    }, this.warningTimeout);

    // Set logout timer (3 minutes total)
    this.inactivityTimer = setTimeout(() => {
      console.log("User inactive for 3 minutes, logging out");
      logout();
    }, this.inactivityTimeout);

    console.log(
      `Inactivity timer reset (will logout after ${
        this.inactivityTimeout / 1000
      } seconds of inactivity)`
    );
  }

  // Warning Popup Management
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
      logout();
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

  // Session Validation
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

  // Page Visibility Management
  setupVisibilityChange() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("Page hidden - pausing session check");
        this.stopSessionCheck();
      } else {
        console.log("Page visible - resuming session check");
        this.startSessionCheck();
        // Reset inactivity timer when page becomes visible again
        this.resetInactivityTimer();
      }
    });

    // In any page that needs visibility handling
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("Page hidden - pausing inactivity timer");
        if (window.inactivityManager) {
          window.inactivityManager.stopSessionCheck();
        }
      } else {
        console.log("Page visible - resuming inactivity timer");
        if (window.inactivityManager) {
          window.inactivityManager.startSessionCheck();
          window.inactivityManager.resetInactivityTimer();
        }
      }
    });
  }
}

// Make the class available globally
window.InactivityManager = InactivityManager;
