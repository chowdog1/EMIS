// EMIS/public/js/uiUtils.js

// Dropdown Management
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

// Logout Management
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
  newLogoutBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    console.log("Logout button clicked");
    await logout();
  });

  console.log("Logout functionality setup complete");
}

async function logout() {
  try {
    const token = localStorage.getItem("auth_token");
    if (token) {
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
    clearAllSessionData();
    window.location.href = "/";
  }
}

// Authentication Check
async function checkAuthentication() {
  console.log("=== Checking Authentication ===");
  const token = localStorage.getItem("auth_token");
  const userData = localStorage.getItem("user_data");

  if (!token || !userData) {
    console.log("No token or user data found, redirecting to login");
    window.location.href = "/";
    return;
  }

  try {
    if (!isValidTokenFormat(token)) {
      console.log("Invalid token format, clearing data and redirecting");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
      return;
    }

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

async function updateUserInterface(user) {
  console.log("Updating user interface with user:", user);
  const userEmailElement = document.getElementById("userEmail");
  const userAvatarImage = document.getElementById("userAvatarImage");
  const userAvatarFallback = document.getElementById("userAvatarFallback");
  const greeting = getTimeBasedGreeting();
  const displayName = user.firstname || user.email;
  if (userEmailElement) {
    userEmailElement.textContent = `${greeting}, ${displayName}!`;
    console.log("Updated user greeting to:", userEmailElement.textContent);
  } else {
    console.error("User email element not found");
  }
  updateUserAvatar(user, userAvatarImage, userAvatarFallback);

  // Add this line to load the profile data in the main content area
  if (typeof loadProfileData === "function") {
    loadProfileData(user);
  }
}

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
      // Only reject if it's a 401 error
      if (response.status === 401) {
        throw new Error("Invalid token");
      }
      return true;
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    return true;
  }
}

// Make functions available globally
window.setupDropdown = setupDropdown;
window.setupLogout = setupLogout;
window.logout = logout;
window.checkAuthentication = checkAuthentication;
window.updateUserInterface = updateUserInterface;
window.verifyTokenWithServer = verifyTokenWithServer;
