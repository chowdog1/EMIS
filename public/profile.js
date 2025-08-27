// profile.js
window.addEventListener("load", function () {
  console.log("Profile page loaded, initializing");
  // Update current page for user tracking
  updateCurrentPage("Profile");
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
  // Setup inactivity detection
  setupInactivityDetection();
  // Create inactivity warning popup
  createInactivityWarning();
  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Function to update current page for user tracking
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

// Global variables for inactivity tracking
let inactivityTimer = null;
let warningTimer = null;
const inactivityTimeout = 180 * 1000; // 3 minutes in milliseconds
const warningTimeout = 160 * 1000; // Show warning 20 seconds before logout

// Function to setup inactivity detection
function setupInactivityDetection() {
  console.log("Setting up inactivity detection");
  function resetInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    if (warningTimer) {
      clearTimeout(warningTimer);
    }
    hideInactivityWarning();
    warningTimer = setTimeout(() => {
      console.log("Showing inactivity warning");
      showInactivityWarning();
    }, warningTimeout);
    inactivityTimer = setTimeout(() => {
      console.log("User inactive for 3 minutes, logging out");
      logout();
    }, inactivityTimeout);
    console.log(
      `Inactivity timer reset (will logout after ${
        inactivityTimeout / 1000
      } seconds of inactivity)`
    );
  }
  let lastResetTime = 0;
  const throttleDelay = 1000;
  function throttledReset() {
    const now = Date.now();
    if (now - lastResetTime > throttleDelay) {
      lastResetTime = now;
      resetInactivityTimer();
    }
  }
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
    document.addEventListener(event, throttledReset, true);
  });
  resetInactivityTimer();
  console.log("Inactivity detection setup complete");
}

// Function to create inactivity warning popup
function createInactivityWarning() {
  if (document.getElementById("inactivityWarning")) {
    return;
  }
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
  const icon = document.createElement("div");
  icon.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  `;
  icon.style.marginBottom = "16px";
  const message = document.createElement("h3");
  message.textContent = "Session Timeout Warning";
  message.style.cssText = `
    margin: 0 0 12px 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
  `;
  const text = document.createElement("p");
  text.textContent =
    "You have been inactive for a while. You will be automatically logged out in 20 seconds.";
  text.style.cssText = `
    margin: 0 0 24px 0;
    color: #666;
    font-size: 14px;
    line-height: 1.5;
  `;
  const countdown = document.createElement("div");
  countdown.id = "inactivityCountdown";
  countdown.textContent = "20";
  countdown.style.cssText = `
    font-size: 24px;
    font-weight: bold;
    color: #ff9800;
    margin-bottom: 20px;
  `;
  const buttons = document.createElement("div");
  buttons.style.cssText = "display: flex; gap: 12px; justify-content: center;";
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
    resetInactivityTimer();
  });
  stayButton.addEventListener("mouseenter", () => {
    stayButton.style.background = "#45a049";
  });
  stayButton.addEventListener("mouseleave", () => {
    stayButton.style.background = "#4caf50";
  });
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
  buttons.appendChild(stayButton);
  buttons.appendChild(logoutButton);
  popup.appendChild(icon);
  popup.appendChild(message);
  popup.appendChild(text);
  popup.appendChild(countdown);
  popup.appendChild(buttons);
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
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  console.log("Inactivity warning popup created");
}

// Function to show inactivity warning popup
function showInactivityWarning() {
  const popup = document.getElementById("inactivityWarning");
  const overlay = document.getElementById("inactivityOverlay");
  const countdown = document.getElementById("inactivityCountdown");
  if (popup && overlay && countdown) {
    popup.style.display = "block";
    overlay.style.display = "block";
    let timeLeft = 20;
    countdown.textContent = timeLeft;
    const countdownInterval = setInterval(() => {
      timeLeft--;
      countdown.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);
    popup.countdownInterval = countdownInterval;
  }
}

// Function to hide inactivity warning popup
function hideInactivityWarning() {
  const popup = document.getElementById("inactivityWarning");
  const overlay = document.getElementById("inactivityOverlay");
  if (popup && overlay) {
    popup.style.display = "none";
    overlay.style.display = "none";
    if (popup.countdownInterval) {
      clearInterval(popup.countdownInterval);
    }
  }
}

// Function to handle logout
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
    if (!window.isValidTokenFormat(token)) {
      console.log("Invalid token format, clearing data and redirecting");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
      return;
    }
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
    const tokenUser = window.getUserFromToken(token);
    if (!tokenUser || tokenUser.userId !== user.id) {
      console.log("Token user ID doesn't match stored user ID, clearing data");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      window.location.href = "/";
      return;
    }
    updateUserInterface(user);
    loadProfileData(user);
    verifyTokenWithServer(token)
      .then((success) => {
        console.log("Server token verification successful");
      })
      .catch((error) => {
        console.error("Token verification failed:", error);
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
  const greeting = getTimeBasedGreeting();
  const displayName = user.firstname || user.email;
  if (userEmailElement) {
    userEmailElement.textContent = `${greeting}, ${displayName}!`;
    console.log("Updated user greeting to:", userEmailElement.textContent);
  } else {
    console.error("User email element not found");
  }
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
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  if (profileName) {
    profileName.textContent = `${user.firstname} ${user.lastname}`;
  }
  if (profileEmail) {
    profileEmail.textContent = user.email;
  }
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const emailInput = document.getElementById("email");
  if (firstNameInput) firstNameInput.value = user.firstname || "";
  if (lastNameInput) lastNameInput.value = user.lastname || "";
  if (emailInput) emailInput.value = user.email || "";
  const profilePicture = document.getElementById("profilePicture");
  if (profilePicture) {
    if (user.hasProfilePicture) {
      try {
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
        const imageUrl = await fetchProfilePicture(user.id);
        loadingIndicator.style.display = "none";
        profilePicture.src = imageUrl;
        profilePicture.style.display = "block";
        window.addEventListener("beforeunload", () => {
          URL.revokeObjectURL(imageUrl);
        });
      } catch (error) {
        console.error("Failed to load profile picture:", error);
        const loadingIndicator = profilePicture.nextElementSibling;
        if (
          loadingIndicator &&
          loadingIndicator.classList.contains("loading-indicator")
        ) {
          loadingIndicator.style.display = "none";
        }
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
    if (!firstName || !lastName || !email) {
      showErrorMessage("Please fill in all required fields");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showErrorMessage("Please enter a valid email address");
      return;
    }
    try {
      const saveBtn = document.getElementById("saveProfileBtn");
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      saveBtn.disabled = true;
      const userData = JSON.parse(localStorage.getItem("user_data"));
      const token = localStorage.getItem("auth_token");
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
      const updatedUserData = {
        ...userData,
        firstname: firstName,
        lastname: lastName,
        email: email,
      };
      localStorage.setItem("user_data", JSON.stringify(updatedUserData));
      updateUserInterface(updatedUserData);
      loadProfileData(updatedUserData);
      showSuccessMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      showErrorMessage(error.message || "Failed to update profile");
    } finally {
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
    if (!file.type.startsWith("image/")) {
      showErrorMessage("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorMessage("Image size must be less than 5MB");
      return;
    }
    try {
      const profilePicture = document.getElementById("profilePicture");
      const originalSrc = profilePicture.src;
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
      const formData = new FormData();
      formData.append("profilePicture", file);
      const token = localStorage.getItem("auth_token");
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
      const userData = JSON.parse(localStorage.getItem("user_data"));
      userData.hasProfilePicture = true;
      localStorage.setItem("user_data", JSON.stringify(userData));
      loadingIndicator.style.display = "none";
      const imageUrl = await fetchProfilePicture(userData.id);
      profilePicture.src = imageUrl;
      profilePicture.style.display = "block";
      const userAvatarImage = document.getElementById("userAvatarImage");
      userAvatarImage.src = imageUrl;
      userAvatarImage.style.display = "block";
      document.getElementById("userAvatarFallback").style.display = "none";
      window.addEventListener("beforeunload", () => {
        URL.revokeObjectURL(imageUrl);
      });
      showSuccessMessage("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      showErrorMessage(error.message || "Failed to upload profile picture");
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
  changePasswordBtn.addEventListener("click", function () {
    changePasswordModal.style.display = "block";
    document.getElementById("changePasswordForm").reset();
    document.getElementById("passwordStrength").textContent = "";
  });
  modalCloseBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      changePasswordModal.style.display = "none";
    });
  });
  window.addEventListener("click", function (e) {
    if (e.target === changePasswordModal) {
      changePasswordModal.style.display = "none";
    }
  });
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
  const newPasswordInput = document.getElementById("newPassword");
  newPasswordInput.addEventListener("input", checkPasswordStrength);
  updatePasswordBtn.addEventListener("click", async function () {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
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
      const originalText = updatePasswordBtn.innerHTML;
      updatePasswordBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Updating...';
      updatePasswordBtn.disabled = true;
      const token = localStorage.getItem("auth_token");
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
      changePasswordModal.style.display = "none";
      showSuccessMessage("Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error);
      showErrorMessage(error.message || "Failed to update password");
    } finally {
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
  const newUserDropdown = userDropdown.cloneNode(true);
  userDropdown.parentNode.replaceChild(newUserDropdown, userDropdown);
  newUserDropdown.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Dropdown clicked");
    userDropdownMenu.classList.toggle("show");
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
      if (data.user && data.valid) {
        localStorage.setItem("user_data", JSON.stringify(data.user));
        console.log("Updated localStorage with fresh user data");
      }
      return true;
    } else {
      console.log("Token verification failed, status:", response.status);
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

// Function to clear all session data
function clearAllSessionData() {
  console.log("Clearing all session data");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  localStorage.removeItem("cenro_sanjuan_emis_login_data");
  document.cookie.split(";").forEach(function (c) {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  sessionStorage.clear();
  console.log("All session data cleared");
}

// Function to setup logout functionality
function setupLogout() {
  console.log("Setting up logout functionality");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) {
    console.error("Logout button not found");
    return;
  }
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
  newLogoutBtn.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("Logout button clicked");
    logout();
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

// Handle page visibility change
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Page hidden - pausing inactivity timer");
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    if (warningTimer) {
      clearTimeout(warningTimer);
    }
  } else {
    console.log("Page visible - resuming inactivity timer");
    if (typeof resetInactivityTimer === "function") {
      resetInactivityTimer();
    }
  }
});

// Handle beforeunload event
window.addEventListener("beforeunload", () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  if (warningTimer) {
    clearTimeout(warningTimer);
  }
});

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
