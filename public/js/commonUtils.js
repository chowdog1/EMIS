// EMIS/public/js/commonUtils.js

// UI Message Functions
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

// User Interface Functions
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getUserInitials(user) {
  if (user.firstname && user.lastname) {
    return `${user.firstname.charAt(0)}${user.lastname.charAt(
      0
    )}`.toUpperCase();
  }
  if (user.firstname) return user.firstname.charAt(0).toUpperCase();
  if (user.lastname) return user.lastname.charAt(0).toUpperCase();
  return user.email.charAt(0).toUpperCase();
}

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

// Make functions available globally
window.showSuccessMessage = showSuccessMessage;
window.showErrorMessage = showErrorMessage;
window.getTimeBasedGreeting = getTimeBasedGreeting;
window.getUserInitials = getUserInitials;
window.updateDateTime = updateDateTime;
