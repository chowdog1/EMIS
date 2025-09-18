// public/js/accountLockNotifier.js

let socket;

// Initialize socket connection and listeners
function initAccountLockNotifier() {
  console.log("Initializing account lock notifier");

  // Only initialize if user is logged in
  if (!localStorage.getItem("auth_token")) {
    console.log("No auth token found, skipping initialization");
    return;
  }

  // Check if io is available
  if (typeof io === "undefined") {
    console.error("Socket.IO not loaded");
    return;
  }

  // Connect to socket.io server
  socket = io();
  console.log("Socket.IO connection established");

  // Get user data
  const userData = JSON.parse(localStorage.getItem("user_data"));
  if (!userData || !userData.id) {
    console.error("User data not found");
    return;
  }

  // Join user-specific room
  socket.on("connect", () => {
    console.log(`Socket connected with ID: ${socket.id}`);
    socket.emit("joinRoom", userData.id.toString());
    console.log(`Joined room for user ${userData.id}`);
  });

  // Listen for account lock event
  socket.on("accountLocked", (data) => {
    console.log("Account locked event received:", data);
    showAccountLockedModal(data.message);
  });

  // Handle connection errors
  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
  });
}

// Show modal that blocks all interaction
function showAccountLockedModal(message) {
  console.log("Showing account locked modal");

  // Create overlay that covers entire viewport
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  overlay.style.zIndex = "999999";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";

  // Create modal container
  const modal = document.createElement("div");
  modal.style.backgroundColor = "white";
  modal.style.padding = "30px";
  modal.style.borderRadius = "8px";
  modal.style.maxWidth = "500px";
  modal.style.width = "80%";
  modal.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";
  modal.style.textAlign = "center";

  // Create message element
  const messageElement = document.createElement("p");
  messageElement.textContent = message;
  messageElement.style.marginBottom = "20px";
  messageElement.style.fontSize = "18px";

  // Create confirm button
  const confirmButton = document.createElement("button");
  confirmButton.textContent = "Confirm";
  confirmButton.style.padding = "10px 20px";
  confirmButton.style.backgroundColor = "#dc3545";
  confirmButton.style.color = "white";
  confirmButton.style.border = "none";
  confirmButton.style.borderRadius = "4px";
  confirmButton.style.cursor = "pointer";
  confirmButton.style.fontSize = "16px";

  // Add click handler to confirm button
  confirmButton.addEventListener("click", () => {
    console.log("Confirm button clicked, logging out");
    // Remove modal from DOM
    document.body.removeChild(overlay);

    // Logout user
    logout();
  });

  // Assemble modal
  modal.appendChild(messageElement);
  modal.appendChild(confirmButton);
  overlay.appendChild(modal);

  // Add to DOM
  document.body.appendChild(overlay);

  // Prevent clicking outside modal from closing it
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

// Logout function
function logout() {
  console.log("Logging out user");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  window.location.href = "/";
}

// Make initialization function available globally
window.initAccountLockNotifier = initAccountLockNotifier;
