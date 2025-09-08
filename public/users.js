// users.js
// Debug logging
console.log("Users.js loaded");
console.log("Current URL:", window.location.href);
console.log("Auth token exists:", !!localStorage.getItem("auth_token"));
console.log("User data exists:", !!localStorage.getItem("user_data"));

// Initialize chat sidebar first to ensure it's available
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing chat sidebar first");
  // Initialize chat sidebar if it exists
  if (typeof ChatSidebar !== "undefined") {
    try {
      window.chatSidebar = new ChatSidebar();
      console.log("Chat sidebar initialized successfully");
    } catch (error) {
      console.error("Error initializing chat sidebar:", error);
    }
  } else {
    console.warn(
      "ChatSidebar class not found, chat functionality may not work"
    );
  }
  // Then initialize page functionality
  initializePage();
});

// Separate function for page initialization
function initializePage() {
  console.log("Users page loaded, initializing");
  // Update current page for user tracking
  updateCurrentPage("Users");
  // Check if user is logged in (non-blocking)
  checkAuthentication().catch((error) => {
    console.error("Authentication check failed:", error);
  });
  // Setup dropdown functionality
  setupDropdown();
  // Setup logout functionality
  setupLogout();
  // Load users
  loadUsers();
  // Set up refresh button
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadUsers);
  }

  // Initialize inactivity manager
  window.inactivityManager = new InactivityManager();

  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
}

function updateCurrentPage(page) {
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

function loadUsers() {
  const token = localStorage.getItem("auth_token");
  const refreshBtn = document.getElementById("refreshBtn");
  // Check if token exists
  if (!token) {
    console.error("No authentication token found");
    window.location.href = "/";
    return;
  }
  // Show loading state
  if (refreshBtn) {
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    refreshBtn.disabled = true;
  }
  fetch("/api/auth/users", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      console.log("Response status:", response.status);
      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired
          console.error("Authentication failed, redirecting to login");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_data");
          window.location.href = "/";
          throw new Error("Authentication failed");
        }
        throw new Error(`Failed to load users: ${response.status}`);
      }
      return response.json();
    })
    .then((users) => {
      console.log("Users loaded:", users);
      displayUsers(users);
    })
    .catch((error) => {
      console.error("Error loading users:", error);
      // Only show error in table if not redirecting
      if (!error.message.includes("Authentication failed")) {
        const tbody = document.getElementById("usersTableBody");
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="6" style="text-align: center; padding: 20px; color: #dc3545;">
                Failed to load users. ${error.message}
              </td>
            </tr>
          `;
        }
      }
    })
    .finally(() => {
      // Reset button state
      if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.disabled = false;
      }
    });
}

function displayUsers(users) {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) {
    console.error("Users table body not found");
    return;
  }
  // Clear existing content
  tbody.innerHTML = "";
  // Check if users array is empty
  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 20px;">
          No users found.
        </td>
      </tr>
    `;
    return;
  }
  // Add each user to the table
  users.forEach((user) => {
    const row = document.createElement("tr");
    // Name cell
    const nameCell = document.createElement("td");
    nameCell.textContent =
      `${user.firstname || ""} ${user.lastname || ""}`.trim() || "N/A";
    // Email cell
    const emailCell = document.createElement("td");
    emailCell.textContent = user.email || "N/A";
    // Role cell
    const roleCell = document.createElement("td");
    roleCell.textContent = user.role || "N/A";
    // Status cell
    const statusCell = document.createElement("td");
    const statusContainer = document.createElement("div");
    statusContainer.style.display = "flex";
    statusContainer.style.alignItems = "center";
    const statusIndicator = document.createElement("span");
    statusIndicator.className = `status-indicator ${
      user.isOnline ? "status-online" : "status-offline"
    }`;
    const statusText = document.createElement("span");
    // Calculate relative time since last activity
    const getRelativeTime = (date) => {
      if (!date) return "Never active";
      const now = new Date();
      const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
      if (diffInSeconds < 30) {
        return "Active now";
      } else if (diffInSeconds < 60) {
        return "Active few seconds ago";
      } else if (diffInSeconds < 120) {
        return "Active 1 minute ago";
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Active ${minutes} minutes ago`;
      } else if (diffInSeconds < 7200) {
        return "Active 1 hour ago";
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Active ${hours} hours ago`;
      } else if (diffInSeconds < 172800) {
        return "Active yesterday";
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `Active ${days} days ago`;
      } else if (diffInSeconds < 2592000) {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `Active ${weeks} week${weeks > 1 ? "s" : ""} ago`;
      } else if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `Active ${months} month${months > 1 ? "s" : ""} ago`;
      } else {
        const years = Math.floor(diffInSeconds / 31536000);
        return `Active ${years} year${years > 1 ? "s" : ""} ago`;
      }
    };
    statusText.textContent = getRelativeTime(user.lastActivity);
    statusContainer.appendChild(statusIndicator);
    statusContainer.appendChild(statusText);
    statusCell.appendChild(statusContainer);
    // Current page cell
    const pageCell = document.createElement("td");
    pageCell.textContent = user.currentPage || "N/A";
    // Last activity cell
    const activityCell = document.createElement("td");
    if (user.lastActivity) {
      const date = new Date(user.lastActivity);
      activityCell.textContent = date.toLocaleString();
    } else {
      activityCell.textContent = "Never";
    }
    // Append all cells to the row
    row.appendChild(nameCell);
    row.appendChild(emailCell);
    row.appendChild(roleCell);
    row.appendChild(statusCell);
    row.appendChild(pageCell);
    row.appendChild(activityCell);
    // Append the row to the table body
    tbody.appendChild(row);
  });
  console.log("Users table populated with", users.length, "users");
}

// Fixed chat function with correct global variable reference
function startChat(userId, userName) {
  // Split the name into first and last name
  const nameParts = userName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  // Create user object
  const user = {
    id: userId,
    firstname: firstName,
    lastname: lastName,
    email: `${firstName.toLowerCase()}@example.com`, // Placeholder email
  };
  // Check if chatSidebar exists and open chat
  if (window.chatSidebar) {
    console.log("Opening chat with user:", user);
    window.chatSidebar.openChatWithUser(user);
  } else {
    console.error("Chat sidebar not initialized");
  }
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
