// js/imageUtils.js
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
// Function to update user avatar with authentication
async function updateUserAvatar(user, userAvatarImage, userAvatarFallback) {
  if (!userAvatarImage || !userAvatarFallback) {
    console.error("User avatar elements not found");
    return;
  }
  if (user.hasProfilePicture) {
    try {
      // Show loading state
      userAvatarImage.style.display = "none";
      userAvatarFallback.style.display = "flex";
      userAvatarFallback.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      // Fetch the profile picture with authentication
      const imageUrl = await fetchProfilePicture(user.id);
      // Set the image source to the blob URL
      userAvatarImage.src = imageUrl;
      userAvatarImage.alt = `${user.firstname} ${user.lastname}`;
      userAvatarImage.style.display = "block";
      userAvatarFallback.style.display = "none";
      // Clean up the blob URL when the page unloads
      window.addEventListener("beforeunload", () => {
        URL.revokeObjectURL(imageUrl);
      });
    } catch (error) {
      console.error("Failed to load avatar image:", error);
      userAvatarImage.style.display = "none";
      const initials = getUserInitials(user);
      userAvatarFallback.textContent = initials;
      userAvatarFallback.style.display = "flex";
    }
  } else {
    // Clear the image source to show fallback
    userAvatarImage.style.display = "none";
    // Update fallback with user's initials
    const initials = getUserInitials(user);
    userAvatarFallback.textContent = initials;
    userAvatarFallback.style.display = "flex";
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
