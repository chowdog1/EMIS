// EMIS/public/js/apiUtils.js

// Token Management
function getAuthToken() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }
  return token;
}

function handleUnauthorizedError() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  window.location.href = "/";
}

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
}

// User Avatar Management
async function updateUserAvatar(user, imageElement, fallbackElement) {
  if (!imageElement || !fallbackElement) {
    console.error("Avatar elements not found");
    return;
  }

  if (user.hasProfilePicture) {
    try {
      const token = getAuthToken();
      if (!token) {
        showFallbackAvatar(user, fallbackElement);
        return;
      }

      const response = await fetch(`/api/auth/profile-picture/${user.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
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
    console.log("User has no profile picture, showing fallback");
    showFallbackAvatar(user, fallbackElement);
  }
}

function showFallbackAvatar(user, fallbackElement) {
  const initials = getUserInitials(user);
  fallbackElement.textContent = initials;
  fallbackElement.style.display = "flex";
  fallbackElement.style.alignItems = "center";
  fallbackElement.style.justifyContent = "center";

  const imageElement = document.getElementById("userAvatarImage");
  if (imageElement) {
    imageElement.style.display = "none";
  }
}

// Make functions available globally
window.getAuthToken = getAuthToken;
window.handleUnauthorizedError = handleUnauthorizedError;
window.clearAllSessionData = clearAllSessionData;
window.updateUserAvatar = updateUserAvatar;
window.showFallbackAvatar = showFallbackAvatar;
