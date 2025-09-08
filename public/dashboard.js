// dashboard.js - Refactored to use shared utilities
class DashboardManager {
  constructor() {
    this.currentYear = "2025"; // Default year
    this.barangayChartInstance = null;
    this.monthlyChartInstance = null;
    this.init();
  }
  init() {
    console.log("Initializing dashboard manager");
    // Check if user is logged in using shared utility
    checkAuthentication();
    // Setup dropdown functionality using shared utility
    setupDropdown();
    // Setup logout functionality using shared utility
    setupLogout();
    // Setup year selector
    this.setupYearSelector();
    // Fetch dashboard data
    this.fetchDashboardData();
    // Initialize inactivity manager
    window.inactivityManager = new InactivityManager();
    // Start updating the datetime using shared utility
    updateDateTime();
    setInterval(updateDateTime, 1000);
  }
  // Setup year selector
  setupYearSelector() {
    const yearSelect = document.getElementById("yearSelect");
    if (yearSelect) {
      // Set the initial value
      yearSelect.value = this.currentYear;
      // Add change event listener
      yearSelect.addEventListener("change", (e) => {
        this.currentYear = e.target.value;
        console.log(`Year changed to: ${this.currentYear}`);
        // Update the year display in the header
        const selectedYearElement = document.getElementById("selectedYear");
        const selectedYearInCardElement =
          document.getElementById("selectedYearInCard");
        if (selectedYearElement) {
          selectedYearElement.textContent = this.currentYear;
        }
        if (selectedYearInCardElement) {
          selectedYearInCardElement.textContent = this.currentYear;
        }
        // Fetch dashboard data for the selected year
        this.fetchDashboardData();
      });
    } else {
      console.error("Year selector element not found");
    }
  }
  // Setup map link functionality
  setupMapLink() {
    const mapLink = document.getElementById("viewBusinessesMapLink");
    if (mapLink) {
      mapLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.openBusinessMap();
      });
    }
    // Setup modal close
    const modal = document.getElementById("mapModal");
    if (!modal) return;
    const closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }
  // Open business map modal
  async openBusinessMap() {
    const modal = document.getElementById("mapModal");
    if (!modal) return;
    modal.style.display = "block";
    // Initialize map if not already done
    if (!window.businessMapInstance) {
      // Initialize map centered on San Juan City
      window.businessMapInstance = L.map("businessMap").setView(
        [14.6047, 121.0299],
        13
      );
      // Add tile layer (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(window.businessMapInstance);
    }
    // Fetch businesses by barangay and add markers
    await this.fetchBusinessesForMap();
  }
  // Fetch businesses by barangay and display on map
  async fetchBusinessesForMap() {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error("No auth token found");
        return;
      }
      let apiUrl;
      if (this.currentYear === "2026") {
        apiUrl = "/api/business2026/map";
      } else {
        apiUrl = "/api/business2025/map";
      }
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch businesses for map");
      }
      const barangayData = await response.json();
      // Clear existing markers
      if (window.barangayMarkers) {
        window.barangayMarkers.forEach((marker) => {
          window.businessMapInstance.removeLayer(marker);
        });
      }
      window.barangayMarkers = [];
      // Add markers for each barangay
      barangayData.forEach((barangay) => {
        // Create a custom icon with the count
        const customIcon = L.divIcon({
          html: `<div style="background-color: #2d5a27; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; font-size: 14px;">${barangay.count}</div>`,
          iconSize: [40, 40],
          className: "barangay-marker",
        });
        const marker = L.marker(
          [barangay.coordinates.lat, barangay.coordinates.lng],
          { icon: customIcon }
        ).addTo(window.businessMapInstance);
        // Create popup with barangay info and list of businesses
        const businessList = barangay.businesses
          .map(
            (business) =>
              `<li style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
            <strong>${business.name}</strong><br>
            <small style="color: #666;">${business.address}</small>
          </li>`
          )
          .join("");
        const popupContent = `
          <div style="max-height: 400px; overflow-y: auto; min-width: 300px;">
            <h3 style="margin: 0 0 10px 0; color: #2d5a27;">${barangay.barangay}</h3>
            <p style="margin: 0 0 15px 0;"><strong>${barangay.count} businesses</strong></p>
            <ul style="padding-left: 0; list-style: none; margin: 0;">
              ${businessList}
            </ul>
          </div>
        `;
        marker.bindPopup(popupContent);
        window.barangayMarkers.push(marker);
      });
      // If there are markers, adjust the map view to fit all markers
      if (window.barangayMarkers.length > 0) {
        const group = new L.featureGroup(window.barangayMarkers);
        window.businessMapInstance.fitBounds(group.getBounds().pad(0.1));
      } else {
        alert("No barangay data found");
      }
    } catch (error) {
      console.error("Error fetching businesses for map:", error);
      alert("Error loading businesses on the map");
    }
  }
  // Function to fetch dashboard data
  async fetchDashboardData() {
    try {
      console.log(`Fetching dashboard data for year: ${this.currentYear}`);
      const token = getAuthToken();
      // Determine the API endpoint based on the current year
      let apiUrl;
      if (this.currentYear === "2026") {
        apiUrl = "/api/business2026/stats";
      } else {
        apiUrl = "/api/business2025/stats";
      }
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const data = await response.json();
      console.log("Dashboard data:", data);
      // Update dashboard cards
      this.updateDashboardCards(data);
      // Create barangay chart
      this.createBarangayChart(data.barangayStats);
      // Create monthly chart
      this.createMonthlyChart(data.monthlyTotals || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Try to load businesses directly if stats fail
      this.loadBusinessData();
    }
  }
  // Function to update dashboard cards
  updateDashboardCards(data) {
    console.log("Updating dashboard cards with data:", data);
    // Update total businesses
    const totalBusinessesElement = document.getElementById("totalBusinesses");
    if (totalBusinessesElement) {
      totalBusinessesElement.textContent = data.totalBusinesses || 0;
      console.log("Set total businesses to:", data.totalBusinesses || 0);
    } else {
      console.error("Total businesses element not found");
    }
    // Update active businesses
    const activeBusinessesElement = document.getElementById(
      "activeBusinessesCount"
    );
    if (activeBusinessesElement) {
      activeBusinessesElement.textContent = data.activeBusinessesCount || 0;
      console.log("Set active businesses to:", data.activeBusinessesCount || 0);
    } else {
      console.error("Active businesses element not found");
    }
    // Update high risk count
    const highRiskElement = document.getElementById("highRiskCount");
    if (highRiskElement) {
      highRiskElement.textContent = data.statusCounts?.HIGHRISK || 0;
      console.log("Set high risk count to:", data.statusCounts?.HIGHRISK || 0);
    } else {
      console.error("High risk element not found");
    }
    // Update low risk count
    const lowRiskElement = document.getElementById("lowRiskCount");
    if (lowRiskElement) {
      lowRiskElement.textContent = data.statusCounts?.LOWRISK || 0;
      console.log("Set low risk count to:", data.statusCounts?.LOWRISK || 0);
    } else {
      console.error("Low risk element not found");
    }
    // Update renewal pending count
    const renewalElement = document.getElementById("renewalCount");
    if (renewalElement) {
      renewalElement.textContent = data.renewalPendingCount || 0;
      console.log(
        "Set renewal pending count to:",
        data.renewalPendingCount || 0
      );
    } else {
      console.error("Renewal element not found");
    }
    // Update total amount paid
    const totalAmountPaidElement = document.getElementById("totalAmountPaid");
    if (totalAmountPaidElement) {
      // Format as Philippine Peso
      totalAmountPaidElement.textContent = `₱${data.totalAmountPaid.toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;
      console.log("Set total amount paid to:", data.totalAmountPaid);
    } else {
      console.error("Total amount paid element not found");
    }
  }
  // Function to create barangay chart
  createBarangayChart(barangayStats) {
    console.log("Creating barangay chart with data:", barangayStats);
    const ctx = document.getElementById("barangayChart");
    if (!ctx) {
      console.error("Barangay chart canvas not found");
      return;
    }
    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not loaded");
      return;
    }
    // Sort barangayStats by count (descending) for better visualization
    barangayStats.sort((a, b) => b.count - a.count);
    // Prepare data for the chart
    const labels = barangayStats.map((item) => item._id);
    const data = barangayStats.map((item) => item.count);
    console.log("Chart labels:", labels);
    console.log("Chart data:", data);
    try {
      // Destroy existing chart instance if it exists
      if (this.barangayChartInstance) {
        this.barangayChartInstance.destroy();
      }
      this.barangayChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Number of Businesses",
              data: data,
              backgroundColor: "rgba(45, 90, 39, 0.7)",
              borderColor: "rgba(45, 90, 39, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Number of Businesses",
              },
            },
            x: {
              title: {
                display: true,
                text: "Barangay",
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `Businesses: ${context.raw}`;
                },
              },
            },
          },
        },
      });
      console.log("Bar chart created successfully");
    } catch (error) {
      console.error("Error creating chart:", error);
    }
  }
  // Function to create monthly payment chart
  createMonthlyChart(monthlyData) {
    console.log("Creating monthly chart with data:", monthlyData);
    const ctx = document.getElementById("monthlyChart");
    if (!ctx) {
      console.error("Monthly chart canvas not found");
      return;
    }
    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not loaded");
      return;
    }
    // Prepare data for the chart
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const labels = [];
    const data = [];
    // Initialize all months with 0
    for (let i = 1; i <= 12; i++) {
      labels.push(monthNames[i - 1]);
      data.push(0);
    }
    // Fill in the data we have
    monthlyData.forEach((item) => {
      const monthIndex = item._id - 1; // Convert to 0-based index
      if (monthIndex >= 0 && monthIndex < 12) {
        data[monthIndex] = item.totalAmount;
      }
    });
    console.log("Chart labels:", labels);
    console.log("Chart data:", data);
    try {
      // Destroy existing chart instance if it exists
      if (this.monthlyChartInstance) {
        this.monthlyChartInstance.destroy();
      }
      this.monthlyChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Amount Paid (₱)",
              data: data,
              backgroundColor: "rgba(45, 90, 39, 0.7)",
              borderColor: "rgba(45, 90, 39, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Amount (₱)",
              },
              ticks: {
                callback: function (value) {
                  return "₱" + value.toLocaleString("en-PH");
                },
              },
            },
            x: {
              title: {
                display: true,
                text: "Month",
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `₱${context.raw.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                },
              },
            },
          },
        },
      });
      console.log("Monthly chart created successfully");
    } catch (error) {
      console.error("Error creating monthly chart:", error);
    }
  }
  // Load business data (fallback method)
  loadBusinessData() {
    console.log("Loading business data as fallback");
    // This is a placeholder - implement as needed
  }
  // Update current page for user tracking
  updateCurrentPage(pageName) {
    console.log(`Current page updated to: ${pageName}`);
    // This method can be expanded to track user navigation if needed
  }
}

// Wait for DOM to be fully loaded
window.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded, initializing dashboard");
  // Create dashboard manager instance
  window.dashboardManager = new DashboardManager();
  // Update current page for user tracking
  window.dashboardManager.updateCurrentPage("Dashboard");
  // Setup map link
  window.dashboardManager.setupMapLink();
});

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
