// dashboard.js

// Wait for DOM to be fully loaded
    window.addEventListener('load', function() {
    console.log('Window fully loaded, initializing dashboard');

    // Check if user is logged in
    checkAuthentication();
    
    // Setup dropdown functionality
    setupDropdown();
    
    // Setup logout functionality
    setupLogout();
    
    // Fetch dashboard data
    fetchDashboardData();
});

// Function to check authentication
function checkAuthentication() {
    console.log('Checking authentication...');
    
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    console.log('Token found:', !!token);
    console.log('User data found:', !!userData);
    
    if (!token || !userData) {
        console.log('No token or user data found, redirecting to login');
        window.location.href = '/';
        return;
    }
    
    try {
        const user = JSON.parse(userData);
        console.log('User data parsed successfully:', user);
        
        // Update user info in the UI
        updateUserInterface(user);
        
        // Verify token with server
        verifyTokenWithServer(token);
        
    } catch (e) {
        console.error('Error parsing user data:', e);
        window.location.href = '/';
    }
}

// Function to update user interface
function updateUserInterface(user) {
    console.log('Updating user interface with user:', user);
    
    const userEmailElement = document.getElementById('userEmail');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userEmailElement && user.email) {
        userEmailElement.textContent = user.email;
        console.log('Updated user email to:', user.email);
    } else {
        console.error('User email element not found or user email missing');
    }
    
    if (userAvatarElement && user.email) {
        userAvatarElement.textContent = user.email.charAt(0).toUpperCase();
        console.log('Updated user avatar to:', user.email.charAt(0).toUpperCase());
    } else {
        console.error('User avatar element not found or user email missing');
    }
}

// Function to verify token with server
async function verifyTokenWithServer(token) {
    try {
        const response = await fetch('/api/auth/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            console.log('Token verification successful');
        } else {
            console.log('Token verification failed, status:', response.status);
            // Try to get more information about the failure
            try {
                const errorData = await response.json();
                console.log('Error data:', errorData);
            } catch (e) {
                console.log('Could not parse error response');
            }
            
            // Only redirect if the token is actually invalid (not for network errors)
            if (response.status === 401) {
                console.log('Token is invalid, redirecting to login');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                window.location.href = '/';
            }
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        // If server is unavailable, continue with session but log the error
        console.log('Continuing with session despite token verification error');
    }
}

// Function to fetch dashboard data
async function fetchDashboardData() {
    try {
        console.log('Fetching dashboard data...');
        
        const response = await fetch('/api/business/stats');
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        console.log('Dashboard data:', data);
        
        // Update dashboard cards
        updateDashboardCards(data);
        
        // Create barangay chart
        createBarangayChart(data.barangayStats);
        
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Try to load businesses directly if stats fail
        loadBusinessData();
    }
}

// Function to update dashboard cards
function updateDashboardCards(data) {
    console.log('Updating dashboard cards with data:', data);
    
    // Update total businesses
    const totalBusinessesElement = document.getElementById('totalBusinesses');
    if (totalBusinessesElement) {
        totalBusinessesElement.textContent = data.totalBusinesses || 0;
        console.log('Set total businesses to:', data.totalBusinesses || 0);
    } else {
        console.error('Total businesses element not found');
    }
    
    // Update high risk count
    const highRiskElement = document.getElementById('highRiskCount');
    if (highRiskElement) {
        highRiskElement.textContent = data.statusCounts.HIGHRISK || 0;
        console.log('Set high risk count to:', data.statusCounts.HIGHRISK || 0);
    } else {
        console.error('High risk element not found');
    }
    
    // Update low risk count
    const lowRiskElement = document.getElementById('lowRiskCount');
    if (lowRiskElement) {
        lowRiskElement.textContent = data.statusCounts.LOWRISK || 0;
        console.log('Set low risk count to:', data.statusCounts.LOWRISK || 0);
    } else {
        console.error('Low risk element not found');
    }
    
    // Update renewal count
    const renewalElement = document.getElementById('renewalCount');
    if (renewalElement) {
        // Calculate renewal count based on APPLICATION STATUS
        const renewalCount = data.totalBusinesses - (data.statusCounts.HIGHRISK || 0) - (data.statusCounts.LOWRISK || 0);
        renewalElement.textContent = renewalCount;
        console.log('Set renewal count to:', renewalCount);
    } else {
        console.error('Renewal element not found');
    }
}

// Function to create barangay chart
function createBarangayChart(barangayStats) {
    console.log('Creating barangay chart with data:', barangayStats);
    
    const ctx = document.getElementById('barangayChart');
    
    if (!ctx) {
        console.error('Barangay chart canvas not found');
        return;
    }
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    // Prepare data for the chart
    const labels = barangayStats.map(item => item._id);
    const data = barangayStats.map(item => item.count);
    
    console.log('Chart labels:', labels);
    console.log('Chart data:', data);
    
    // Generate colors for each barangay
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
        '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
    ];
    
    try {
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        console.log('Chart created successfully');
    } catch (error) {
        console.error('Error creating chart:', error);
    }
}   

// Function to setup dropdown functionality
function setupDropdown() {
    console.log('Setting up dropdown functionality');
    
    const userDropdown = document.getElementById('userDropdown');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userDropdown || !userDropdownMenu) {
        console.error('Dropdown elements not found');
        return;
    }
    
    // Remove any existing event listeners
    const newUserDropdown = userDropdown.cloneNode(true);
    userDropdown.parentNode.replaceChild(newUserDropdown, userDropdown);
    
    // Add click event listener
    newUserDropdown.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Dropdown clicked');
        
        // Toggle dropdown menu
        userDropdownMenu.classList.toggle('show');
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function closeDropdown(e) {
            if (!e.target.closest('.user-dropdown')) {
                userDropdownMenu.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        });
    });
    
    console.log('Dropdown functionality setup complete');
}

// Function to setup logout functionality
function setupLogout() {
    console.log('Setting up logout functionality');
    
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!logoutBtn) {
        console.error('Logout button not found');
        return;
    }
    
    // Remove any existing event listeners
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    
    // Add click event listener
    newLogoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Logout button clicked');
        
        // Clear authentication data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        // Redirect to login page
        window.location.href = '/';
    });
    
    console.log('Logout functionality setup complete');
}