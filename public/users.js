// users.js
// Debug logging
console.log("Users.js loaded");
console.log("Current URL:", window.location.href);
console.log("Auth token exists:", !!localStorage.getItem("auth_token"));
console.log("User data exists:", !!localStorage.getItem("user_data"));

document.addEventListener("DOMContentLoaded", () => {
  console.log("Users page loaded, initializing");
  // Update current page for user tracking
  updateCurrentPage("Users");
  // Check if user is logged in
  checkAuthentication();
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
});

// Function to check authentication
function checkAuthentication() {
  console.log("=== Checking Authentication ===");
  const token = localStorage.getItem("auth_token");
  const userData = localStorage.getItem("user_data");
  if (!token || !userData) {
    console.log("No token or user data found, redirecting to login");
    window.location.href = "/";
    return;
  }
  try {
    // Check if token is expired locally first
    if (isTokenExpired(token)) {
      console.log("Token is expired, clearing data and redirecting");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
      return;
    }
    const user = JSON.parse(userData);
    console.log("User data parsed successfully:", user);
    // Update user info in the UI
    updateUserInterface(user);
    // Verify token with server in the background
    verifyTokenWithServer(token).catch((error) => {
      console.error("Token verification failed:", error);
    });
  } catch (e) {
    console.error("Error parsing user data:", e);
    window.location.href = "/";
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
    logout();
  });
  console.log("Logout functionality setup complete");
}

function logout() {
  console.log("Logging out...");
  const token = localStorage.getItem("auth_token");
  if (token) {
    fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          console.log("Server logout successful");
        } else {
          console.error("Server logout failed");
        }
      })
      .catch((error) => {
        console.error("Logout error:", error);
      })
      .finally(() => {
        // Always clear local storage and redirect
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        window.location.href = "/";
      });
  } else {
    console.log("No token found, redirecting to login");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    window.location.href = "/";
  }
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

// Function to verify token with server
async function verifyTokenWithServer(token) {
  try {
    const response = await fetch("/api/auth/verify-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }), // Add this line
    });

    if (response.ok) {
      console.log("Token verification successful");
      return true;
    } else {
      console.log("Token verification failed, status:", response.status);
      // Only redirect if the token is actually invalid
      if (response.status === 401) {
        console.log("Token is invalid, redirecting to login");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        window.location.href = "/";
        return false;
      }
      return false;
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    // If server is unavailable, continue with session but log the error
    console.log("Continuing with session despite token verification error");
    return false;
  }
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

function startChat(userId, userName) {
  if (window.chatbox) {
    window.chatbox.openChatWithUser(userId, userName);
  }
}

// Example of how to add a chat button to each user in your user list
function renderUserList(users) {
  const userListContainer = document.getElementById("user-list");
  userListContainer.innerHTML = "";

  users.forEach((user) => {
    const userEl = document.createElement("div");
    userEl.className = "user-item";

    // Add user details...

    const chatBtn = document.createElement("button");
    chatBtn.textContent = "Chat";
    chatBtn.className = "btn btn-primary";
    chatBtn.addEventListener("click", () =>
      startChat(user.id, `${user.firstname} ${user.lastname}`)
    );

    userEl.appendChild(chatBtn);
    userListContainer.appendChild(userEl);
  });
}
