// profile.js
window.addEventListener("load", function () {
  console.log("Profile page loaded, initializing");
  // Check if user is logged in
  checkAuthentication();
  // Setup dropdown functionality
  setupDropdown();
  // Setup logout functionality
  setupLogout();
  // Setup profile form
  setupProfileForm();
  // Setup profile picture upload
  setupProfilePictureUpload();
  // Setup change password modal
  setupChangePasswordModal();
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

    // Load profile data
    loadProfileData(user);

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

// Update the updateUserInterface function in profile.js
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

// In loadProfileData function
async function loadProfileData(user) {
  console.log("Loading profile data for user:", user);
  // Update profile name and email
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  if (profileName) {
    profileName.textContent = `${user.firstname} ${user.lastname}`;
  }
  if (profileEmail) {
    profileEmail.textContent = user.email;
  }

  // Update form fields
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const emailInput = document.getElementById("email");
  if (firstNameInput) firstNameInput.value = user.firstname || "";
  if (lastNameInput) lastNameInput.value = user.lastname || "";
  if (emailInput) emailInput.value = user.email || "";

  // Load profile picture if available
  const profilePicture = document.getElementById("profilePicture");
  if (profilePicture) {
    if (user.hasProfilePicture) {
      try {
        // Show loading state
        profilePicture.style.display = "none";
        let loadingIndicator = profilePicture.nextElementSibling;
        if (
          !loadingIndicator ||
          !loadingIndicator.classList.contains("loading-indicator")
        ) {
          loadingIndicator = document.createElement("div");
          loadingIndicator.className = "loading-indicator";
          loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
          profilePicture.parentNode.insertBefore(
            loadingIndicator,
            profilePicture.nextSibling
          );
        }
        loadingIndicator.style.display = "flex";

        // Fetch the profile picture with authentication
        const imageUrl = await fetchProfilePicture(user.id);

        // Hide loading indicator
        loadingIndicator.style.display = "none";

        // Set the image source to the blob URL
        profilePicture.src = imageUrl;
        profilePicture.style.display = "block";

        // Clean up the blob URL when the page unloads
        window.addEventListener("beforeunload", () => {
          URL.revokeObjectURL(imageUrl);
        });
      } catch (error) {
        console.error("Failed to load profile picture:", error);

        // Hide loading indicator
        const loadingIndicator = profilePicture.nextElementSibling;
        if (
          loadingIndicator &&
          loadingIndicator.classList.contains("loading-indicator")
        ) {
          loadingIndicator.style.display = "none";
        }

        // Show fallback
        profilePicture.style.display = "none";
        let fallback = profilePicture.nextElementSibling;
        if (
          !fallback ||
          !fallback.classList.contains("profile-picture-fallback")
        ) {
          fallback = document.createElement("div");
          fallback.className = "profile-picture-fallback";
          profilePicture.parentNode.insertBefore(
            fallback,
            profilePicture.nextSibling
          );
        }
        const initials = getUserInitials(user);
        fallback.textContent = initials;
        fallback.style.display = "flex";
      }
    } else {
      // No profile picture, show initials
      profilePicture.style.display = "none";
      let fallback = profilePicture.nextElementSibling;
      if (
        !fallback ||
        !fallback.classList.contains("profile-picture-fallback")
      ) {
        fallback = document.createElement("div");
        fallback.className = "profile-picture-fallback";
        profilePicture.parentNode.insertBefore(
          fallback,
          profilePicture.nextSibling
        );
      }
      const initials = getUserInitials(user);
      fallback.textContent = initials;
      fallback.style.display = "flex";
    }
  }
}

// Function to setup profile form
function setupProfileForm() {
  const profileForm = document.getElementById("profileForm");

  if (!profileForm) {
    console.error("Profile form not found");
    return;
  }

  profileForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();

    // Validate form
    if (!firstName || !lastName || !email) {
      showErrorMessage("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showErrorMessage("Please enter a valid email address");
      return;
    }

    try {
      // Show loading state
      const saveBtn = document.getElementById("saveProfileBtn");
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      saveBtn.disabled = true;

      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem("user_data"));
      const token = localStorage.getItem("auth_token");

      // Send update request
      const response = await fetch("/api/auth/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstname: firstName,
          lastname: lastName,
          email: email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update profile");
      }

      // Update localStorage with new user data
      const updatedUserData = {
        ...userData,
        firstname: firstName,
        lastname: lastName,
        email: email,
      };
      localStorage.setItem("user_data", JSON.stringify(updatedUserData));

      // Update UI
      updateUserInterface(updatedUserData);
      loadProfileData(updatedUserData);

      // Show success message
      showSuccessMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      showErrorMessage(error.message || "Failed to update profile");
    } finally {
      // Restore button state
      const saveBtn = document.getElementById("saveProfileBtn");
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      saveBtn.disabled = false;
    }
  });
}

// Function to setup profile picture upload
function setupProfilePictureUpload() {
  const profilePictureContainer = document.getElementById(
    "profilePictureContainer"
  );
  const profilePictureInput = document.getElementById("profilePictureInput");

  if (!profilePictureContainer || !profilePictureInput) {
    console.error("Profile picture elements not found");
    return;
  }

  profilePictureContainer.addEventListener("click", function () {
    profilePictureInput.click();
  });

  profilePictureInput.addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showErrorMessage("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorMessage("Image size must be less than 5MB");
      return;
    }

    try {
      // Show loading state
      const profilePicture = document.getElementById("profilePicture");
      const originalSrc = profilePicture.src;

      // Instead of using a placeholder, show a loading indicator
      profilePicture.style.display = "none";
      let loadingIndicator = profilePicture.nextElementSibling;
      if (
        !loadingIndicator ||
        !loadingIndicator.classList.contains("loading-indicator")
      ) {
        loadingIndicator = document.createElement("div");
        loadingIndicator.className = "loading-indicator";
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        profilePicture.parentNode.insertBefore(
          loadingIndicator,
          profilePicture.nextSibling
        );
      }
      loadingIndicator.style.display = "flex";

      // Create FormData
      const formData = new FormData();
      formData.append("profilePicture", file);

      // Get token
      const token = localStorage.getItem("auth_token");

      // Send upload request
      const response = await fetch("/api/auth/upload-profile-picture", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to upload profile picture");
      }

      console.log("Profile picture upload successful");

      // Update user data
      const userData = JSON.parse(localStorage.getItem("user_data"));
      userData.hasProfilePicture = true;
      localStorage.setItem("user_data", JSON.stringify(userData));

      // Hide loading indicator
      loadingIndicator.style.display = "none";

      // Fetch the newly uploaded profile picture with authentication
      const imageUrl = await fetchProfilePicture(userData.id);

      // Update profile picture
      profilePicture.src = imageUrl;
      profilePicture.style.display = "block";

      // Update the avatar in the header
      const userAvatarImage = document.getElementById("userAvatarImage");
      userAvatarImage.src = imageUrl;
      userAvatarImage.style.display = "block";
      document.getElementById("userAvatarFallback").style.display = "none";

      // Clean up the blob URL when the page unloads
      window.addEventListener("beforeunload", () => {
        URL.revokeObjectURL(imageUrl);
      });

      // Show success message
      showSuccessMessage("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      showErrorMessage(error.message || "Failed to upload profile picture");

      // Hide loading indicator and restore original image
      const loadingIndicator = profilePicture.nextElementSibling;
      if (
        loadingIndicator &&
        loadingIndicator.classList.contains("loading-indicator")
      ) {
        loadingIndicator.style.display = "none";
      }
      profilePicture.style.display = "block";
      profilePicture.src = originalSrc;
    }
  });
}

// Function to update the avatar in the header
function updateHeaderAvatar(profilePictureUrl) {
  const userAvatarImage = document.getElementById("userAvatarImage");
  const userAvatarFallback = document.getElementById("userAvatarFallback");

  if (userAvatarImage) {
    userAvatarImage.src = profilePictureUrl;
    // Hide fallback when image is set
    if (userAvatarFallback) {
      userAvatarFallback.style.display = "none";
    }
  }
}

// Function to setup change password modal
function setupChangePasswordModal() {
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const changePasswordModal = document.getElementById("changePasswordModal");
  const modalCloseBtns = changePasswordModal.querySelectorAll(
    ".modal-close, .modal-close-btn"
  );
  const updatePasswordBtn = document.getElementById("updatePasswordBtn");

  // Open modal
  changePasswordBtn.addEventListener("click", function () {
    changePasswordModal.style.display = "block";
    document.getElementById("changePasswordForm").reset();
    document.getElementById("passwordStrength").textContent = "";
  });

  // Close modal
  modalCloseBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      changePasswordModal.style.display = "none";
    });
  });

  // Close modal when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target === changePasswordModal) {
      changePasswordModal.style.display = "none";
    }
  });

  // Setup password toggles
  const passwordToggles = document.querySelectorAll(".password-toggle");
  passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const input = document.getElementById(targetId);
      const icon = this.querySelector("i");

      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    });
  });

  // Setup password strength checker
  const newPasswordInput = document.getElementById("newPassword");
  newPasswordInput.addEventListener("input", checkPasswordStrength);

  // Handle password update
  updatePasswordBtn.addEventListener("click", async function () {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validate passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
      showErrorMessage("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      showErrorMessage("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorMessage("New passwords do not match");
      return;
    }

    try {
      // Show loading state
      const originalText = updatePasswordBtn.innerHTML;
      updatePasswordBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Updating...';
      updatePasswordBtn.disabled = true;

      // Get token
      const token = localStorage.getItem("auth_token");

      // Send update request
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update password");
      }

      // Close modal
      changePasswordModal.style.display = "none";

      // Show success message
      showSuccessMessage("Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error);
      showErrorMessage(error.message || "Failed to update password");
    } finally {
      // Restore button state
      updatePasswordBtn.innerHTML = originalText;
      updatePasswordBtn.disabled = false;
    }
  });
}

// Function to check password strength
function checkPasswordStrength() {
  const password = document.getElementById("newPassword").value;
  const strengthElement = document.getElementById("passwordStrength");

  if (!password) {
    strengthElement.textContent = "";
    strengthElement.className = "password-strength";
    return;
  }

  let strength = 0;
  let feedback = [];

  if (password.length >= 8) strength++;
  else feedback.push("at least 8 characters");

  if (/[A-Z]/.test(password)) strength++;
  else feedback.push("uppercase letter");

  if (/[a-z]/.test(password)) strength++;
  else feedback.push("lowercase letter");

  if (/\d/.test(password)) strength++;
  else feedback.push("number");

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  else feedback.push("special character");

  strengthElement.className = "password-strength";

  if (strength < 2) {
    strengthElement.className += " weak";
    strengthElement.textContent = `Weak password. Consider adding: ${feedback
      .slice(0, 2)
      .join(", ")}`;
  } else if (strength < 4) {
    strengthElement.className += " medium";
    strengthElement.textContent = `Medium strength. Consider adding: ${feedback
      .slice(0, 1)
      .join(", ")}`;
  } else {
    strengthElement.className += " strong";
    strengthElement.textContent = "Strong password!";
  }
}

// Function to show success message
function showSuccessMessage(message) {
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

  document.body.appendChild(alertDiv);

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

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.opacity = "0";
    alertDiv.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(alertDiv);
    }, 500);
  }, 5000);
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

// Function to verify token with server - made non-blocking
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

// profile.js
function clearAllSessionData() {
  console.log("Clearing all session data");

  // Clear localStorage
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  localStorage.removeItem("cenro_sanjuan_emis_login_data");

  // Clear all cookies
  document.cookie.split(";").forEach(function (c) {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  // Clear sessionStorage
  sessionStorage.clear();

  console.log("All session data cleared");
}

// Update the logout function to use this
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

    // Clear all session data
    clearAllSessionData();

    console.log("Redirecting to login page");
    window.location.href = "/";
  });

  console.log("Logout functionality setup complete");
}

// Function to refresh token
async function refreshToken() {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.log("No token found to refresh");
      return false;
    }

    console.log("Refreshing token...");
    const response = await fetch("/api/auth/verify-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.valid && data.user) {
        localStorage.setItem("user_data", JSON.stringify(data.user));
        console.log("Token refreshed successfully");
        return true;
      }
    }

    console.log("Token refresh failed");
    return false;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
}

// Function to fetch profile picture with authentication
async function fetchProfilePicture(userId) {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  try {
    const response = await fetch(`/api/auth/profile-picture/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profile picture: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    throw error;
  }
}
