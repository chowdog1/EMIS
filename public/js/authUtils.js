// public/js/authUtils.js
// Function to check if token is expired without making a server request
function isTokenExpired(token) {
  try {
    // Parse the token payload (second part)
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    if (!decoded || !decoded.exp) {
      return true; // Treat as expired if no expiration time
    }
    const now = Math.floor(Date.now() / 1000);
    // Add a 30-second buffer to account for clock differences
    return decoded.exp < now - 30;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // Treat as expired if there's an error
  }
}
// Function to get user data from token without server verification
function getUserFromToken(token) {
  try {
    // Parse the token payload (second part)
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
}
// Function to validate token format
function isValidTokenFormat(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }
    // Try to decode the header and payload
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    return !!(header && payload);
  } catch (error) {
    return false;
  }
}
// Make functions available globally
window.isTokenExpired = isTokenExpired;
window.getUserFromToken = getUserFromToken;
window.isValidTokenFormat = isValidTokenFormat;
