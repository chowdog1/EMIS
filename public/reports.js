// Wait for DOM to be fully loaded
window.addEventListener("load", function () {
  console.log("Reports page loaded, initializing");

  // Check if user is logged in
  checkAuthentication();

  // Setup dropdown functionality
  setupDropdown();

  // Setup logout functionality
  setupLogout();

  // Setup report generation
  setupReportGeneration();
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

// Function to setup report generation
function setupReportGeneration() {
  const reportYearSelect = document.getElementById("reportYear");
  const selectedYearSpan = document.getElementById("selectedYear");
  const generateReportBtn = document.getElementById("generateReportBtn");
  const noPaymentsReportBtn = document.getElementById("noPaymentsReportBtn");

  // Update the displayed year when selection changes
  reportYearSelect.addEventListener("change", function () {
    selectedYearSpan.textContent = this.value;
  });

  // Setup main report generation
  generateReportBtn.addEventListener("click", function () {
    const year = reportYearSelect.value;
    const isConfirmed = confirm(
      `Are you sure you want to create a report for the year ${year}?`
    );

    if (isConfirmed) {
      // Show loading state
      generateReportBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Generating Report...';
      generateReportBtn.disabled = true;

      // Make request to generate CSV
      window.location.href = `/api/reports/csv/${year}`;

      // Reset button after a delay
      setTimeout(() => {
        generateReportBtn.innerHTML = `APPLICATION FOR ENVIRONMENTAL CLEARANCE - <span id="selectedYear">${year}</span>`;
        generateReportBtn.disabled = false;
      }, 2000);
    }
  });

  // Setup no payments report generation
  noPaymentsReportBtn.addEventListener("click", function () {
    const year = reportYearSelect.value;
    const isConfirmed = confirm(
      `Are you sure you want to create a no-payments report for the year ${year}?`
    );

    if (isConfirmed) {
      // Show loading state
      noPaymentsReportBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Generating Report...';
      noPaymentsReportBtn.disabled = true;

      // Make request to generate CSV
      window.location.href = `/api/reports/csv/${year}/no-payments`;

      // Reset button after a delay
      setTimeout(() => {
        noPaymentsReportBtn.innerHTML =
          '<i class="fas fa-file-excel"></i> Generate No Payments Report';
        noPaymentsReportBtn.disabled = false;
      }, 2000);
    }
  });
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

    // Logout the user
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    window.location.href = "/";
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

// Function to verify token with server
async function verifyTokenWithServer(token) {
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
    } else {
      console.log("Token verification failed, status:", response.status);

      // Only redirect if the token is actually invalid
      if (response.status === 401) {
        console.log("Token is invalid, redirecting to login");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        window.location.href = "/";
      }
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    // If server is unavailable, continue with session but log the error
    console.log("Continuing with session despite token verification error");
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
