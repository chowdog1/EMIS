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
  // Check if user is admin and show/hide create user button
  checkIfAdmin().then((isAdmin) => {
    if (isAdmin) {
      document.getElementById("createUserBtn").style.display = "inline-block";
    }
  });
  // Setup modal for creating user
  setupCreateUserModal();
  // Load users
  loadUsers();
  // Set up refresh button
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadUsers);
  }

  // Initialize inactivity manager
  window.inactivityManager = new InactivityManager();

  // Initialize account lock notifier
  if (typeof initAccountLockNotifier === "function") {
    console.log("Initializing account lock notifier");
    initAccountLockNotifier();
  } else {
    console.error("Account lock notifier function not found");
  }

  // Initialize account lock notifier
  if (typeof initAccountLockNotifier === "function") {
    initAccountLockNotifier();
  }

  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
}

// Check if current user is admin
async function checkIfAdmin() {
  try {
    const userData = JSON.parse(localStorage.getItem("user_data"));
    return userData && userData.role === "admin";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Get current user ID
async function getCurrentUserId() {
  try {
    const userData = JSON.parse(localStorage.getItem("user_data"));
    return userData ? userData.id : null;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

// Setup modal for creating user
function setupCreateUserModal() {
  const modal = document.getElementById("createUserModal");
  const btn = document.getElementById("createUserBtn");
  const span = document.getElementsByClassName("close")[0];
  const form = document.getElementById("createUserForm");

  // Open modal when button is clicked
  btn.onclick = function () {
    modal.style.display = "block";
  };

  // Close modal when x is clicked
  span.onclick = function () {
    modal.style.display = "none";
  };

  // Close modal when clicking outside of it
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  // Handle form submission
  form.onsubmit = async function (e) {
    e.preventDefault();

    const firstname = document.getElementById("newFirstname").value;
    const lastname = document.getElementById("newLastname").value;
    const email = document.getElementById("newEmail").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstname, lastname, email, password, role }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("User created successfully!");
        modal.style.display = "none";
        form.reset();
        loadUsers(); // Refresh the user list
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Error creating user. Please try again.");
    }
  };
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
              <td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">
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

// Calculate relative time since last activity
function getRelativeTime(date) {
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
        <td colspan="7" style="text-align: center; padding: 20px;">
          No users found.
        </td>
      </tr>
    `;
    return;
  }

  // Check if current user is admin and get current user ID
  Promise.all([checkIfAdmin(), getCurrentUserId()]).then(
    ([isAdmin, currentUserId]) => {
      // Only show Actions column if user is admin
      const actionsColumnIndex = isAdmin ? 7 : 6;

      // Update table header to hide Actions column for non-admins
      const headerRow = document.querySelector(".users-table thead tr");
      if (headerRow) {
        const actionsHeader = headerRow.querySelector("th:last-child");
        if (actionsHeader) {
          actionsHeader.style.display = isAdmin ? "" : "none";
        }
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
        let statusText = "";

        if (user.isLocked) {
          statusIndicator.className = "status-indicator status-locked";
          statusText = "Locked";
        } else if (user.isOnline) {
          statusIndicator.className = "status-indicator status-online";
          statusText = getRelativeTime(user.lastActivity); // Use the relative time function
        } else {
          statusIndicator.className = "status-indicator status-offline";
          statusText = getRelativeTime(user.lastActivity); // Use the relative time function
        }

        const statusTextElement = document.createElement("span");
        statusTextElement.textContent = statusText;

        statusContainer.appendChild(statusIndicator);
        statusContainer.appendChild(statusTextElement);
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

        // Actions cell (only for admins and not for current user)
        const actionsCell = document.createElement("td");

        if (isAdmin && user.id !== currentUserId) {
          if (user.isLocked) {
            const unlockBtn = document.createElement("button");
            unlockBtn.className = "action-btn unlock-btn";
            unlockBtn.innerHTML = '<i class="fas fa-unlock"></i> Unlock';
            unlockBtn.onclick = () =>
              showUnlockConfirmation(
                user.id,
                `${user.firstname} ${user.lastname}`
              );
            actionsCell.appendChild(unlockBtn);
          } else {
            const lockBtn = document.createElement("button");
            lockBtn.className = "action-btn lock-btn";
            lockBtn.innerHTML = '<i class="fas fa-lock"></i> Lock';
            lockBtn.onclick = () =>
              showLockConfirmation(
                user.id,
                `${user.firstname} ${user.lastname}`
              );
            actionsCell.appendChild(lockBtn);
          }
        } else if (!isAdmin) {
          // Hide Actions column for non-admins
          actionsCell.style.display = "none";
        }

        // Append all cells to the row
        row.appendChild(nameCell);
        row.appendChild(emailCell);
        row.appendChild(roleCell);
        row.appendChild(statusCell);
        row.appendChild(pageCell);
        row.appendChild(activityCell);
        row.appendChild(actionsCell);

        // Append the row to the table body
        tbody.appendChild(row);
      });

      console.log("Users table populated with", users.length, "users");
    }
  );
}

// Show confirmation dialog before locking a user
function showLockConfirmation(userId, userName) {
  const confirmed = confirm(
    `Are you sure you want to lock the account for ${userName}?\n\nThis will prevent the user from logging in to the system.`
  );

  if (confirmed) {
    toggleUserLock(userId, true);
  }
}

// Show confirmation dialog before unlocking a user
function showUnlockConfirmation(userId, userName) {
  const confirmed = confirm(
    `Are you sure you want to unlock the account for ${userName}?\n\nThis will allow the user to log in to the system again.`
  );

  if (confirmed) {
    toggleUserLock(userId, false);
  }
}

// Function to lock/unlock user accounts
async function toggleUserLock(userId, lock) {
  try {
    const token = localStorage.getItem("auth_token");
    const endpoint = lock
      ? "/api/auth/lock-account"
      : "/api/auth/unlock-account";
    const action = lock ? "lock" : "unlock";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });

    const result = await response.json();

    if (response.ok) {
      alert(`User account ${action}ed successfully!`);
      loadUsers(); // Refresh the user list
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (error) {
    console.error(`Error ${action}ing user account:`, error);
    alert(
      `Error ${lock ? "locking" : "unlocking"} user account. Please try again.`
    );
  }
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
