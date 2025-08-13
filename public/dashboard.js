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
    
    // Setup search functionality
    setupSearch();
    
    // Initialize business table
    initializeBusinessTable();
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

// Function to setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (!searchInput || !searchBtn) {
        console.error('Search elements not found');
        return;
    }
    
    // Search on button click
    searchBtn.addEventListener('click', performSearch);
    
    // Search on Enter key press
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Function to perform search
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        // If query is empty, load all businesses
        loadBusinessData();
        return;
    }
    
    try {
        console.log('Searching for:', query);
        
        const response = await fetch(`/api/business/search?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const businesses = await response.json();
        console.log('Search results:', businesses);
        
        // Update table with search results
        updateBusinessTable(businesses);
        
    } catch (error) {
        console.error('Error searching businesses:', error);
    }
}

// Function to initialize business table
function initializeBusinessTable() {
    console.log('Initializing business table');
    
    // Load initial data
    loadBusinessData();
}

// Function to load business data
async function loadBusinessData() {
    try {
        console.log('Loading business data...');
        
        // Show loading state
        const tableRoot = document.getElementById('businessTable');
        if (tableRoot) {
            tableRoot.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #6c757d;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>Loading business data...</p>
                </div>
            `;
        }
        
        const response = await fetch('/api/business');
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to load business data: ${response.status} ${response.statusText}`);
        }
        
        const businesses = await response.json();
        console.log('Business data loaded:', businesses);
        console.log('Number of businesses:', businesses.length);
        
        // Update table with business data
        updateBusinessTable(businesses);
        
    } catch (error) {
        console.error('Error loading business data:', error);
        // Show error message in table
        showTableError(`Failed to load business data: ${error.message}`);
    }
}


// Function to show error in table
function showTableError(message) {
    const tableRoot = document.getElementById('businessTable');
    
    if (!tableRoot) {
        console.error('Business table root element not found');
        return;
    }
    
    tableRoot.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>${message}</p>
            <button onclick="loadBusinessData()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Retry
            </button>
        </div>
    `;
}   

// Function to update business table using React
function updateBusinessTable(businesses) {
    const tableRoot = document.getElementById('businessTable');
    
    if (!tableRoot) {
        console.error('Business table root element not found');
        return;
    }
    
    // DEBUG: Log the first business object to see its structure
    if (businesses.length > 0) {
        console.log('Sample business data structure:', businesses[0]);
        console.log('Keys in business object:', Object.keys(businesses[0]));
        
        // Test accessing each property with normalized names
        console.log('accountNo:', businesses[0]['accountNo']);
        console.log('businessName:', businesses[0]['businessName']);
        console.log('ownerName:', businesses[0]['ownerName']);
        console.log('barangay:', businesses[0]['barangay']);
        console.log('natureOfBusiness:', businesses[0]['natureOfBusiness']);
        console.log('status:', businesses[0]['status']);
        console.log('applicationStatus:', businesses[0]['applicationStatus']);
        
        // Test accessing each property with original MongoDB names
        console.log('ACCOUNT NO:', businesses[0]['ACCOUNT NO']);
        console.log('Name of Business:', businesses[0]['Name of Business']);
        console.log('Name of owner:', businesses[0]['Name of owner']);
        console.log('Barangay:', businesses[0]['Barangay']);
        console.log('Nature of Business:', businesses[0]['Nature of Business']);
        console.log('STATUS:', businesses[0]['STATUS']);
        console.log('APPLICATION STATUS:', businesses[0]['APPLICATION STATUS']);
    }
    
    // Check if React and ReactDOM are loaded
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
        console.error('React or ReactDOM not loaded');
        renderSimpleTable(businesses);
        return;
    }
    
    try {
        // Status badge component
        const StatusBadge = ({ status }) => {
            let color = '';
            let text = status;
            
            switch (status) {
                case 'HIGHRISK':
                    color = '#dc3545';
                    text = 'High Risk';
                    break;
                case 'LOWRISK':
                    color = '#28a745';
                    text = 'Low Risk';
                    break;
                default:
                    color = '#6c757d';
            }
            
            return React.createElement('span', {
                style: {
                    display: 'inline-block',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    backgroundColor: color,
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                }
            }, text);
        };
        
        // Table component with flexible data access
        const App = () => {
            return React.createElement(
                'div',
                { style: { overflowX: 'auto' } },
                React.createElement(
                    'table',
                    { 
                        style: { 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            border: '1px solid #e9ecef'
                        } 
                    },
                    React.createElement(
                        'thead',
                        null,
                        React.createElement(
                            'tr',
                            { style: { backgroundColor: '#f8f9fa' } },
                            React.createElement('th', { style: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e9ecef' } }, 'Account No'),
                            React.createElement('th', { style: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e9ecef' } }, 'Business Name'),
                            React.createElement('th', { style: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e9ecef' } }, 'Owner'),
                            React.createElement('th', { style: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e9ecef' } }, 'Barangay'),
                            React.createElement('th', { style: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e9ecef' } }, 'Nature of Business'),
                            React.createElement('th', { style: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e9ecef' } }, 'Status'),
                            React.createElement('th', { style: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e9ecef' } }, 'Application Status')
                        )
                    ),
                    React.createElement(
                        'tbody',
                        null,
                        businesses.slice(0, 100).map((business, index) => {
                            // Try both normalized and original field names
                            const accountNo = business['accountNo'] || business['ACCOUNT NO'] || 'N/A';
                            const businessName = business['businessName'] || business['Name of Business'] || 'N/A';
                            const ownerName = business['ownerName'] || business['Name of owner'] || 'N/A';
                            const barangay = business['barangay'] || business['Barangay'] || 'N/A';
                            const natureOfBusiness = business['natureOfBusiness'] || business['Nature of Business'] || 'N/A';
                            const status = business['status'] || business['STATUS'] || '';
                            const applicationStatus = business['applicationStatus'] || business['APPLICATION STATUS'] || 'N/A';
                            
                            // DEBUG: Log each business object
                            if (index < 3) { // Only log first 3 to avoid console spam
                                console.log(`Business ${index}:`, business);
                                console.log(`Account No ${index}:`, accountNo);
                            }
                            
                            return React.createElement(
                                'tr',
                                { 
                                    key: index,
                                    style: { borderBottom: '1px solid #e9ecef' }
                                },
                                React.createElement('td', { style: { padding: '12px 15px' } }, accountNo),
                                React.createElement('td', { style: { padding: '12px 15px' } }, businessName),
                                React.createElement('td', { style: { padding: '12px 15px' } }, ownerName),
                                React.createElement('td', { style: { padding: '12px 15px' } }, barangay),
                                React.createElement('td', { style: { padding: '12px 15px' } }, natureOfBusiness),
                                React.createElement('td', { style: { padding: '12px 15px' } }, React.createElement(StatusBadge, { status: status })),
                                React.createElement('td', { style: { padding: '12px 15px' } }, applicationStatus)
                            );
                        })
                    )
                )
            );
        };
        
        // Clear the existing content
        tableRoot.innerHTML = '';
        
        // Create a root for React 18
        const root = ReactDOM.createRoot(tableRoot);
        
        // Render the component
        root.render(React.createElement(App));
        
        // Add a message if we're showing limited records
        if (businesses.length > 100) {
            const message = document.createElement('div');
            message.style.padding = '10px';
            message.style.textAlign = 'center';
            message.style.color = '#6c757d';
            message.textContent = `Showing first 100 of ${businesses.length} records. Use search to find specific businesses.`;
            tableRoot.appendChild(message);
        }
        
        console.log('React table rendered successfully');
    } catch (error) {
        console.error('Error rendering React table:', error);
        console.error('Error details:', error.message, error.stack);
        renderSimpleTable(businesses);
    }
}

function debugComponentLoading() {
    console.log('=== Component Loading Debug ===');
    console.log('React:', typeof React);
    console.log('ReactDOM:', typeof ReactDOM);
    console.log('ReactDataTable:', typeof window.ReactDataTable);
    console.log('window["react-data-table-component"]:', typeof window['react-data-table-component']);
    console.log('Chart:', typeof Chart);
    
    // List all React-related global variables
    const reactVars = Object.keys(window).filter(key => 
        key.toLowerCase().includes('react') || 
        key.toLowerCase().includes('table') ||
        key.toLowerCase().includes('data')
    );
    console.log('React-related global variables:', reactVars);
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