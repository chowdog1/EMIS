// businesses.js

// Pagination variables - Global scope
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let allBusinesses = []; // Store all businesses for client-side pagination

// Wait for DOM to be fully loaded
window.addEventListener('load', function() {
    console.log('Businesses page loaded, initializing');
    
    // Check if user is logged in
    checkAuthentication();
    
    // Setup dropdown functionality
    setupDropdown();
    
    // Setup logout functionality
    setupLogout();
    
    // Initialize business table
    initializeBusinessTable();
    
    // Setup search functionality
    setupSearch();
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

// Function to initialize business table
function initializeBusinessTable() {
    console.log('Initializing business table');
    
    // Setup pagination controls first to set the initial page size
    setupPaginationControls();
    
    // Setup refresh button
    setupRefreshButton();
    
    // Load initial data
    loadBusinessData();
}

// Function to load business data
async function loadBusinessData() {
    try {
        console.log('Loading business data...');
        console.log('Current page size:', pageSize);
        
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
        
        // Store all businesses for client-side pagination
        allBusinesses = businesses;
        totalRecords = businesses.length;
        
        // Reset to first page
        currentPage = 1;
        
        // Update table with paginated data
        updateBusinessTable(getPaginatedData());
        
        // Update pagination controls
        updatePaginationControls();
        
    } catch (error) {
        console.error('Error loading business data:', error);
        // Show error message in table
        showTableError(`Failed to load business data: ${error.message}`);
    }
}

// Function to get paginated data
function getPaginatedData() {
    if (!allBusinesses || allBusinesses.length === 0) {
        return [];
    }
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allBusinesses.slice(startIndex, endIndex);
}

// Function to update business table using React
function updateBusinessTable(businesses) {
    const tableRoot = document.getElementById('businessTable');
    
    if (!tableRoot) {
        console.error('Business table root element not found');
        return;
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
        
        // Table component with updated columns (removed OR No and Amount Paid)
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
                        businesses.map((business, index) => {
                            // Try both normalized and original field names
                            const accountNo = business['accountNo'] || business['ACCOUNT NO'] || 'N/A';
                            const businessName = business['businessName'] || business['NAME OF BUSINESS'] || 'N/A';
                            const ownerName = business['ownerName'] || business['NAME OF OWNER'] || 'N/A';
                            const barangay = business['barangay'] || business['BARANGAY'] || 'N/A';
                            const natureOfBusiness = business['natureOfBusiness'] || business['NATURE OF BUSINESS'] || 'N/A';
                            const status = business['status'] || business['STATUS'] || '';
                            const applicationStatus = business['applicationStatus'] || business['APPLICATION STATUS'] || 'N/A';
                            
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
        
        console.log('Business table rendered successfully');
    } catch (error) {
        console.error('Error rendering business table:', error);
        console.error('Error details:', error.message, error.stack);
        renderSimpleTable(businesses);
    }
}

// Also update the renderSimpleTable function to include the new columns
function renderSimpleTable(businesses) {
    const tableRoot = document.getElementById('businessTable');
    
    if (!tableRoot) {
        console.error('Business table root element not found');
        return;
    }
    
    // Create table element
    const table = document.createElement('table');
    table.className = 'business-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Updated headers without OR No and Amount Paid
    const headers = ['Account No', 'Business Name', 'Owner', 'Barangay', 'Nature of Business', 'Status', 'Application Status'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.padding = '12px 15px';
        th.style.textAlign = 'left';
        th.style.backgroundColor = '#f8f9fa';
        th.style.fontWeight = '600';
        th.style.borderBottom = '1px solid #e9ecef';
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Use the businesses passed to this function (already paginated)
    businesses.forEach(business => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #e9ecef';
        
        // Account No
        const accountCell = document.createElement('td');
        accountCell.textContent = business['accountNo'] || business['ACCOUNT NO'] || 'N/A';
        accountCell.style.padding = '12px 15px';
        row.appendChild(accountCell);
        
        // Business Name
        const nameCell = document.createElement('td');
        nameCell.textContent = business['businessName'] || business['NAME OF BUSINESS'] || 'N/A';
        nameCell.style.padding = '12px 15px';
        row.appendChild(nameCell);
        
        // Owner
        const ownerCell = document.createElement('td');
        ownerCell.textContent = business['ownerName'] || business['NAME OF OWNER'] || 'N/A';
        ownerCell.style.padding = '12px 15px';
        row.appendChild(ownerCell);
        
        // Barangay
        const barangayCell = document.createElement('td');
        barangayCell.textContent = business['barangay'] || business['BARANGAY'] || 'N/A';
        barangayCell.style.padding = '12px 15px';
        row.appendChild(barangayCell);
        
        // Nature of Business
        const natureCell = document.createElement('td');
        natureCell.textContent = business['natureOfBusiness'] || business['NATURE OF BUSINESS'] || 'N/A';
        natureCell.style.padding = '12px 15px';
        row.appendChild(natureCell);
        
        // Status
        const statusCell = document.createElement('td');
        statusCell.style.padding = '12px 15px';
        const status = business['status'] || business['STATUS'] || '';
        let statusBadge = document.createElement('span');
        statusBadge.textContent = status === 'HIGHRISK' ? 'High Risk' : status === 'LOWRISK' ? 'Low Risk' : status;
        statusBadge.style.display = 'inline-block';
        statusBadge.style.padding = '0.25rem 0.5rem';
        statusBadge.style.borderRadius = '0.25rem';
        statusBadge.style.color = 'white';
        statusBadge.style.fontSize = '0.75rem';
        statusBadge.style.fontWeight = '500';
        
        if (status === 'HIGHRISK') {
            statusBadge.style.backgroundColor = '#dc3545';
        } else if (status === 'LOWRISK') {
            statusBadge.style.backgroundColor = '#28a745';
        } else {
            statusBadge.style.backgroundColor = '#6c757d';
        }
        
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);
        
        // Application Status
        const appStatusCell = document.createElement('td');
        appStatusCell.textContent = business['applicationStatus'] || business['APPLICATION STATUS'] || 'N/A';
        appStatusCell.style.padding = '12px 15px';
        row.appendChild(appStatusCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    // Clear the tableRoot and append the new table
    tableRoot.innerHTML = '';
    tableRoot.appendChild(table);
    
    console.log('Simple table rendered successfully');
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

// Function to update pagination controls
function updatePaginationControls() {
    if (totalRecords === 0) {
        // Handle case when there are no records
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = 'Showing 0 of 0 records';
        }
        
        // Disable all pagination buttons
        const buttons = ['firstPageBtn', 'prevPageBtn', 'nextPageBtn', 'lastPageBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
        
        return;
    }
    
    const totalPages = Math.ceil(totalRecords / pageSize);
    
    // Update pagination info
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        const startRecord = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
        const endRecord = Math.min(currentPage * pageSize, totalRecords);
        paginationInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
    }
    
    // Update button states
    const firstPageBtn = document.getElementById('firstPageBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const lastPageBtn = document.getElementById('lastPageBtn');
    
    if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Function to setup pagination controls
function setupPaginationControls() {
    // Set initial page size from the select element
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
        pageSize = parseInt(pageSizeSelect.value);
        console.log('Initial page size set to:', pageSize);
    }
    
    // First page button
    const firstPageBtn = document.getElementById('firstPageBtn');
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage = 1;
                updateBusinessTable(getPaginatedData());
                updatePaginationControls();
            }
        });
    }
    
    // Previous page button
    const prevPageBtn = document.getElementById('prevPageBtn');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                updateBusinessTable(getPaginatedData());
                updatePaginationControls();
            }
        });
    }
    
    // Next page button
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(totalRecords / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                updateBusinessTable(getPaginatedData());
                updatePaginationControls();
            }
        });
    }
    
    // Last page button
    const lastPageBtn = document.getElementById('lastPageBtn');
    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(totalRecords / pageSize);
            if (currentPage < totalPages) {
                currentPage = totalPages;
                updateBusinessTable(getPaginatedData());
                updatePaginationControls();
            }
        });
    }
    
    // Page size selector
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            pageSize = parseInt(this.value);
            currentPage = 1; // Reset to first page
            updateBusinessTable(getPaginatedData());
            updatePaginationControls();
        });
    }
}

// Function to setup refresh button
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // Add spinning animation to the icon
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('refreshing');
            }
            
            // Reload the data
            loadBusinessData().finally(() => {
                // Remove spinning animation
                if (icon) {
                    icon.classList.remove('refreshing');
                }
            });
        });
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
        console.log('Searching for account number:', query);
        
        const response = await fetch(`/api/business/search?query=${encodeURIComponent(query)}&field=accountNo`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const businesses = await response.json();
        console.log('Search results:', businesses);
        
        // Store search results for pagination
        allBusinesses = businesses;
        totalRecords = businesses.length;
        currentPage = 1; // Reset to first page
        
        // Update table with paginated data
        updateBusinessTable(getPaginatedData());
        
        // Update pagination controls
        updatePaginationControls();
        
    } catch (error) {
        console.error('Error searching businesses:', error);
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