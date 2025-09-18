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

  // Initialize inactivity manager
  window.inactivityManager = new InactivityManager();

  // Start updating the datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Initialize account lock notifier
if (typeof initAccountLockNotifier === "function") {
  console.log("Initializing account lock notifier");
  initAccountLockNotifier();
} else {
  console.error("Account lock notifier function not found");
}
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
