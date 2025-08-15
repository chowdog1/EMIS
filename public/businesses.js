// businesses.js

const logoUrls = [
    '/bagongpilipinas.png',
    '/makabagong%20san%20juan%20Logo.png',
    '/cenro%20logo.png'
];

// Pagination variables - Global scope
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let allBusinesses = []; // Store all businesses for client-side pagination

// Wait for DOM to be fully loaded
window.addEventListener('load', function() {
    console.log('Businesses page loaded, initializing');

    //Preload logos
    preloadLogos();
    
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

    // Setup modal event listeners
    setupModalEventListeners();
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

    // Setup add business button
    setupAddBusinessButton();
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
        
        // Clickable Account Number component
        const ClickableAccountNo = ({ accountNo, onClick }) => {
            return React.createElement('a', {
                href: '#',
                style: {
                    color: 'var(--primary-green)',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    transition: 'color 0.2s'
                },
                onClick: (e) => {
                    e.preventDefault();
                    onClick(accountNo);
                }
            }, accountNo);
        };
        
        // Table component with clickable account numbers
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
                                React.createElement('td', { style: { padding: '12px 15px' } }, 
                                    React.createElement(ClickableAccountNo, {
                                        accountNo: accountNo,
                                        onClick: showBusinessDetails
                                    })
                                ),
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
        
        // Account No (clickable)
        const accountCell = document.createElement('td');
        accountCell.style.padding = '12px 15px';
        const accountNo = business['accountNo'] || business['ACCOUNT NO'] || 'N/A';
        const accountLink = document.createElement('a');
        accountLink.href = '#';
        accountLink.textContent = accountNo;
        accountLink.className = 'clickable-account';
        accountLink.onclick = (e) => {
            e.preventDefault();
            showBusinessDetails(accountNo);
        };
        accountCell.appendChild(accountLink);
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

// Function to show business details modal
async function showBusinessDetails(accountNo) {
    try {
        console.log(`Fetching details for account number: ${accountNo}`);
        
        const response = await fetch(`/api/business/account/${encodeURIComponent(accountNo)}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch business details');
        }
        
        const business = await response.json();
        console.log('Business details:', business);
        
        // Populate modal with business details
        document.getElementById('modalAccountNo').textContent = business.accountNo || 'N/A';
        document.getElementById('modalBusinessName').textContent = business.businessName || 'N/A';
        document.getElementById('modalOwnerName').textContent = business.ownerName || 'N/A';
        document.getElementById('modalAddress').textContent = business.address || 'N/A';
        document.getElementById('modalBarangay').textContent = business.barangay || 'N/A';
        document.getElementById('modalNatureOfBusiness').textContent = business.natureOfBusiness || 'N/A';
        document.getElementById('modalStatus').textContent = business.status || 'N/A';
        document.getElementById('modalApplicationStatus').textContent = business.applicationStatus || 'N/A';
        
        // Format dates if they exist
        const dateOfApplication = business.dateOfApplication;
        document.getElementById('modalDateOfApplication').textContent = dateOfApplication 
            ? new Date(dateOfApplication).toLocaleDateString() 
            : 'N/A';
            
        document.getElementById('modalOrNo').textContent = business.orNo || 'N/A';
        document.getElementById('modalAmountPaid').textContent = business.amountPaid || 'N/A';
        
        const dateOfPayment = business.dateOfPayment;
        document.getElementById('modalDateOfPayment').textContent = dateOfPayment 
            ? new Date(dateOfPayment).toLocaleDateString() 
            : 'N/A';
        
        // Show the modal
        document.getElementById('businessDetailsModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error fetching business details:', error);
        alert('Failed to fetch business details. Please try again.');
    }
}

// Function to setup modal event listeners
function setupModalEventListeners() {
    // Get business details modal elements
    const detailsModal = document.getElementById('businessDetailsModal');
    const detailsCloseBtns = detailsModal.querySelectorAll('.modal-close, .modal-close-btn');
    
    // Add click event to close buttons for details modal
    detailsCloseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            detailsModal.style.display = 'none';
        });
    });
    
    // Get business edit modal elements
    const editModal = document.getElementById('businessEditModal');
    const editCloseBtns = editModal.querySelectorAll('.modal-close, .modal-close-btn');
    
    // Add click event to close buttons for edit modal
    editCloseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            editModal.style.display = 'none';
        });
    });
    
    // Get business add modal elements
    const addModal = document.getElementById('businessAddModal');
    const addCloseBtns = addModal.querySelectorAll('.modal-close, .modal-close-btn');

    // Add click event to Delete button
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
    deleteBtn.addEventListener('click', handleDelete);
    }    
    
    // Add click event to close buttons for add modal
    addCloseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            addModal.style.display = 'none';
        });
    });
    
    // Close modals when clicking outside of them
    window.addEventListener('click', function(event) {
        if (event.target === detailsModal) {
            detailsModal.style.display = 'none';
        }
        if (event.target === editModal) {
            editModal.style.display = 'none';
        }
        if (event.target === addModal) {
            addModal.style.display = 'none';
        }
    });
    
    // Add click event to Print AEC button
    const printAecBtn = document.getElementById('printAecBtn');
    if (printAecBtn) {
        printAecBtn.addEventListener('click', printAEC);
    }
    
    // Add click event to Modify button
    const modifyBtn = document.getElementById('modifyBtn');
    if (modifyBtn) {
        modifyBtn.addEventListener('click', handleModify);
    }
    
    // Add click event to Save Changes button
    const saveBusinessBtn = document.getElementById('saveBusinessBtn');
    if (saveBusinessBtn) {
        saveBusinessBtn.addEventListener('click', saveBusinessChanges);
    }
    
    // Add click event to Add Business button in the modal
    const modalAddBusinessBtn = document.querySelector('#businessAddModal #addBusinessBtn');
    if (modalAddBusinessBtn) {
        modalAddBusinessBtn.addEventListener('click', addNewBusiness);
    }
    
    console.log('Modal event listeners setup complete');
}

// Preload logos when the page loads
function preloadLogos() {
    logoUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

// Function to print AEC
function printAEC() {
    // Get the business details from the modal
    const accountNo = document.getElementById('modalAccountNo').textContent;
    const businessName = document.getElementById('modalBusinessName').textContent;
    const address = document.getElementById('modalAddress').textContent;
    const status = document.getElementById('modalStatus').textContent;
    const orNo = document.getElementById('modalOrNo').textContent;
    const amountPaid = document.getElementById('modalAmountPaid').textContent;
    const dateOfPayment = document.getElementById('modalDateOfPayment').textContent;
    
    // Get current year and date
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Get generated date and time
    const generatedDateTime = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

    // Show instruction alert before printing
    alert('Please select "Page 1" only in the the avoid printing a blank second page.');
    
    // Create a hidden div for printing
    const printContent = document.createElement('div');
    printContent.className = 'print-area';
    
    // Create the print content positioned at top-left corner
    printContent.innerHTML = `
        <style>
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Verdana, sans-serif;
                }
                .print-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 10cm;
                    height: 12cm;
                    padding: 0.4cm;
                    box-sizing: border-box;
                    font-family: Verdana, sans-serif;
                    border: 1px solid green;
                    display: flex;
                    flex-direction: column;
                }
                .logos {
                    display: flex;
                    justify-content: center;
                    gap: 0.3cm;
                    margin-bottom: 0.3cm;
                }
                .logos img {
                    height: 1.2cm;
                    width: 1.2cm;
                    object-fit: contain;
                }
                .header-text {
                    text-align: center;
                    font-size: 6pt;
                    margin-bottom: 0.1cm;
                    line-height: 1.1;
                    font-family: Verdana, sans-serif;
                }
                .certificate-title {
                    background-color: black;
                    color: white;
                    text-align: center;
                    font-weight: bold;
                    padding: 0.15cm;
                    margin-bottom: 0.3cm;
                    font-size: 10pt;
                    font-family: Verdana, sans-serif;
                }
                .details-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.3cm;
                }
                .details-column {
                    width: 48%;
                }
                .detail-label {
                    font-size: 6pt;
                    margin-bottom: 0.1cm;
                    font-family: Verdana, sans-serif;
                }
                .certify-section {
                    margin-bottom: 0.2cm;
                }
                .certify-text {
                    text-align: center;
                    font-size: 6pt;
                    margin-bottom: 0.05cm;
                    font-family: Verdana, sans-serif;
                }
                .business-name {
                    text-align: center;
                    font-weight: bold;
                    font-size: 9pt;
                    margin-bottom: 0.05cm;
                    font-family: Verdana, sans-serif;
                    line-height: 1.1;
                    max-height: 1.2cm; /* Limit height to prevent excessive space usage */
                    overflow: hidden;
                }
                .business-info {
                    text-align: left;
                    font-size: 6pt;
                    margin-top: 0.5cm;
                    margin-bottom: 0.2cm;
                    font-family: Verdana, sans-serif;
                    line-height: 1.2;
                }
                .info-box {
                    border: 1px solid #000;
                    padding: 0.15cm;
                    margin-bottom: 0.4cm; /* Reduced margin */
                    font-size: 6pt;
                    font-family: Verdana, sans-serif;
                    line-height: 1.2;
                }
                .signature-section {
                    margin-bottom: 0.3cm; /* Reduced margin */
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: 1.2cm; /* Reduced margin */
                }
                .signature-line {
                    width: 5cm;
                    border-bottom: 1px solid #000;
                    margin-bottom: 0.1cm; /* Reduced margin */
                    font-family: Verdana, sans-serif;
                }
                .secretariat-text {
                    text-align: center;
                    font-size: 6pt;
                    margin-top: 0.05cm; /* Reduced margin */
                    font-family: Verdana, sans-serif;
                }
                .footer {
                    margin-top: auto;
                    padding-top: 0.2cm; /* Reduced padding */
                }
                .footer-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 6pt;
                    font-family: Verdana, sans-serif;
                }
                .footer-item {
                    width: 30%;
                }
                .generated-datetime {
                    font-size: 4pt;
                    font-family: Verdana, sans-serif;
                    margin-top: 0.05cm; /* Reduced margin */
                }
            }
        </style>
        
        <div class="print-container">
            <!-- Logos -->
            <div class="logos">
                <img src="${logoUrls[0]}" alt="Bagong Pilipinas">
                <img src="${logoUrls[1]}" alt="San Juan Logo">
                <img src="${logoUrls[2]}" alt="CENRO Logo">
            </div>
            
            <!-- Header Text -->
            <div class="header-text">CITY GOVERNMENT OF SAN JUAN</div>
            <div class="header-text">CITY ENVIRONMENT AND NATURAL RESOURCES OFFICE</div>
            
            <!-- Certificate Title -->
            <div class="certificate-title">ASSESSMENT CERTIFICATE</div>
            
            <!-- Details Row -->
            <div class="details-row">
                <div class="details-column">
                    <div class="detail-label">Account No.: ${accountNo}</div>
                    <div class="detail-label">Status: 
                        <span style="color: ${status === 'HIGHRISK' ? 'red' : 'green'}; font-weight: bold;">
                            ${status === 'HIGHRISK' ? 'HIGH RISK' : 'LOW RISK'}
                        </span>
                    </div>
                </div>
                <div class="details-column" style="text-align: right;">
                    <div class="detail-label">Date of Application: ${currentDate}</div>
                </div>
            </div>
            
            <!-- Certification Section - Grouped together -->
            <div class="certify-section">
                <div class="certify-text">This is to certify that</div>
                <div class="business-name">${businessName}</div>
                <div class="business-info">located at ${address}, has paid environmental protection and preservation fee of ${currentYear}</div>
            </div>
            
            <!-- Info Box -->
            <div class="info-box">
                Valid for 1 year<br>
                Subject for inspection in ${currentYear}<br>
                Subject to annual renewal and payment of environmental compliance fee
            </div>
            
            <!-- Signature Section -->
            <div class="signature-section">
                <div class="signature-line"></div>
                <div class="secretariat-text">Secretariat</div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="footer-row">
                    <div class="footer-item">
                        OR No.: ${orNo}
                        <div class="generated-datetime">Generated: ${generatedDateTime}</div>
                    </div>
                    <div class="footer-item" style="text-align: center;">Amount Paid: ${amountPaid}</div>
                    <div class="footer-item" style="text-align: right;">Date: ${dateOfPayment}</div>
                </div>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(printContent);
    
    // Wait for images to load before printing
    const images = printContent.querySelectorAll('img');
    let loadedImages = 0;
    
    const onImageLoad = () => {
        loadedImages++;
        if (loadedImages === images.length) {
            // All images loaded, now print
            window.print();
            // Remove the print content after printing
            setTimeout(() => {
                document.body.removeChild(printContent);
            }, 100);
        }
    };
    
    // If images are already cached, they might not trigger load event
    const checkIfLoaded = () => {
        let allLoaded = true;
        images.forEach(img => {
            if (!img.complete) {
                allLoaded = false;
            }
        });
        
        if (allLoaded) {
            onImageLoad();
        }
    };
    
    // Add load event listeners to images
    images.forEach(img => {
        if (img.complete) {
            onImageLoad();
        } else {
            img.addEventListener('load', onImageLoad);
            img.addEventListener('error', onImageLoad); // Continue even if an image fails to load
        }
    });
    
    // Check if images are already loaded (cached)
    checkIfLoaded();
}

// Function to setup add business button
function setupAddBusinessButton() {
    const addBusinessBtn = document.getElementById('headerAddBusinessBtn');
    if (addBusinessBtn) {
        addBusinessBtn.addEventListener('click', handleAddBusiness);
        console.log('Add Business button setup complete');
    } else {
        console.error('Add Business button not found');
    }
}

// Function to handle delete button click
async function handleDelete() {
    // Get the account number from the modal
    const accountNo = document.getElementById('modalAccountNo').textContent;
    
    // Show browser warning popup
    const isConfirmed = window.confirm("Are you sure you want to delete this data? This cannot be undone. Proceed with caution.");
    
    // If user clicked Cancel, return without deleting
    if (!isConfirmed) {
        return;
    }
    
    try {
        // Show loading state
        const deleteBtn = document.getElementById('deleteBtn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        deleteBtn.disabled = true;
        
        // Send delete request to server
        const response = await fetch(`/api/business/account/${encodeURIComponent(accountNo)}`, {
            method: 'DELETE'
        });
        
        // Restore button state
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
        
        if (!response.ok) {
            throw new Error('Failed to delete business');
        }
        
        // Close the modal
        document.getElementById('businessDetailsModal').style.display = 'none';
        
        // Show success message
        showSuccessMessage('Business deleted successfully!');
        
        // Refresh the business table
        loadBusinessData();
        
    } catch (error) {
        console.error('Error deleting business:', error);
        showErrorMessage(`Failed to delete business: ${error.message}`);
    }
}

// Function to handle add business button click
function handleAddBusiness() {
    console.log('Add Business button clicked');
    
    // Clear the form
    document.getElementById('businessAddForm').reset();
    
    // Set today's date as default for date of application
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('addDateOfApplication').value = today;
    
    // Show the add modal
    document.getElementById('businessAddModal').style.display = 'block';
}

// Function to add a new business (with browser warning popup)
async function addNewBusiness() {
    try {
        // Get form data
        const businessData = {
            accountNo: document.getElementById('addAccountNo').value.trim(),
            businessName: document.getElementById('addBusinessName').value.trim(),
            ownerName: document.getElementById('addOwnerName').value.trim(),
            address: document.getElementById('addAddress').value.trim(),
            barangay: document.getElementById('addBarangay').value.trim(),
            natureOfBusiness: document.getElementById('addNatureOfBusiness').value.trim(),
            status: document.getElementById('addStatus').value,
            applicationStatus: document.getElementById('addApplicationStatus').value,
            dateOfApplication: document.getElementById('addDateOfApplication').value,
            orNo: document.getElementById('addOrNo').value.trim() || null,
            amountPaid: parseFloat(document.getElementById('addAmountPaid').value) || 0,
            dateOfPayment: document.getElementById('addDateOfPayment').value || null
        };

        // Validate required fields
        const requiredFields = [
            { id: 'addAccountNo', name: 'Account No' },
            { id: 'addBusinessName', name: 'Business Name' },
            { id: 'addOwnerName', name: 'Owner Name' },
            { id: 'addAddress', name: 'Address' },
            { id: 'addBarangay', name: 'Barangay' },
            { id: 'addNatureOfBusiness', name: 'Nature of Business' },
            { id: 'addStatus', name: 'Status' },
            { id: 'addApplicationStatus', name: 'Application Status' },
            { id: 'addDateOfApplication', name: 'Date of Application' }
        ];

        // Check if all required fields are filled
        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            const value = element.value.trim();
            
            if (!value) {
                element.classList.add('is-invalid');
                
                // Add error message if it doesn't exist
                let errorElement = element.nextElementSibling;
                if (!errorElement || !errorElement.classList.contains('invalid-feedback')) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'invalid-feedback';
                    errorElement.textContent = `${field.name} is required`;
                    element.parentNode.insertBefore(errorElement, element.nextSibling);
                }
                
                // Focus on the first invalid field
                element.focus();
                return;
            } else {
                element.classList.remove('is-invalid');
                // Remove error message if it exists
                const errorElement = element.nextElementSibling;
                if (errorElement && errorElement.classList.contains('invalid-feedback')) {
                    errorElement.remove();
                }
            }
        }

        // Validate amount paid is a positive number if provided
        const amountPaid = document.getElementById('addAmountPaid').value;
        if (amountPaid && (isNaN(amountPaid) || parseFloat(amountPaid) < 0)) {
            const amountField = document.getElementById('addAmountPaid');
            amountField.classList.add('is-invalid');
            
            let errorElement = amountField.nextElementSibling;
            if (!errorElement || !errorElement.classList.contains('invalid-feedback')) {
                errorElement = document.createElement('div');
                errorElement.className = 'invalid-feedback';
                errorElement.textContent = 'Amount Paid must be a positive number';
                amountField.parentNode.insertBefore(errorElement, amountField.nextSibling);
            }
            
            amountField.focus();
            return;
        }

        // Check if account number already exists
        console.log('Checking if account number already exists:', businessData.accountNo);
        const accountCheckResponse = await fetch(`/api/business/account/${encodeURIComponent(businessData.accountNo)}`);
        if (accountCheckResponse.ok) {
            // Account number already exists
            const accountField = document.getElementById('addAccountNo');
            accountField.classList.add('is-invalid');
            
            let errorElement = accountField.nextElementSibling;
            if (!errorElement || !errorElement.classList.contains('invalid-feedback')) {
                errorElement = document.createElement('div');
                errorElement.className = 'invalid-feedback';
                errorElement.textContent = 'Account number already exists';
                accountField.parentNode.insertBefore(errorElement, accountField.nextSibling);
            }
            
            accountField.focus();
            return;
        }

        // Show browser warning popup
        const isConfirmed = window.confirm("Are you sure the data that are filled is correct?");
        
        // If user clicked Cancel, return without adding
        if (!isConfirmed) {
            return;
        }

        // Show loading state
        const addBtn = document.getElementById('addBusinessBtn');
        const originalText = addBtn.innerHTML;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        addBtn.disabled = true;

        // Send create request to server
        console.log('Sending request to server...');
        const response = await fetch('/api/business', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(businessData)
        });

        // Restore button state
        addBtn.innerHTML = originalText;
        addBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add business');
        }

        // Close the add modal
        document.getElementById('businessAddModal').style.display = 'none';

        // Show success message
        showSuccessMessage('Business added successfully!');

        // Refresh the business table
        loadBusinessData();

    } catch (error) {
        console.error('Error adding business:', error);
        showErrorMessage(`Failed to add business: ${error.message}`);
    }
}

// Function to show success message
function showSuccessMessage(message) {
    // Create success alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.padding = '15px 20px';
    alertDiv.style.backgroundColor = 'var(--success)';
    alertDiv.style.color = 'white';
    alertDiv.style.borderRadius = 'var(--border-radius-md)';
    alertDiv.style.boxShadow = 'var(--shadow-lg)';
    alertDiv.style.zIndex = '10001';
    alertDiv.style.display = 'flex';
    alertDiv.style.alignItems = 'center';
    alertDiv.style.gap = '10px';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(alertDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            document.body.removeChild(alertDiv);
        }, 500);
    }, 3000);
}

// Function to show error message
function showErrorMessage(message) {
    // Create error alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.padding = '15px 20px';
    alertDiv.style.backgroundColor = 'var(--danger)';
    alertDiv.style.color = 'white';
    alertDiv.style.borderRadius = 'var(--border-radius-md)';
    alertDiv.style.boxShadow = 'var(--shadow-lg)';
    alertDiv.style.zIndex = '10001';
    alertDiv.style.display = 'flex';
    alertDiv.style.alignItems = 'center';
    alertDiv.style.gap = '10px';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(alertDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            document.body.removeChild(alertDiv);
        }, 500);
    }, 5000);
}

// Function to handle modify button click
function handleModify() {
    // Get the business details from the modal
    const accountNo = document.getElementById('modalAccountNo').textContent;
    const businessName = document.getElementById('modalBusinessName').textContent;
    const ownerName = document.getElementById('modalOwnerName').textContent;
    const address = document.getElementById('modalAddress').textContent;
    const barangay = document.getElementById('modalBarangay').textContent;
    const natureOfBusiness = document.getElementById('modalNatureOfBusiness').textContent;
    const status = document.getElementById('modalStatus').textContent;
    const applicationStatus = document.getElementById('modalApplicationStatus').textContent;
    const dateOfApplication = document.getElementById('modalDateOfApplication').textContent;
    const orNo = document.getElementById('modalOrNo').textContent;
    const amountPaid = document.getElementById('modalAmountPaid').textContent;
    const dateOfPayment = document.getElementById('modalDateOfPayment').textContent;
    
    // Close the details modal
    document.getElementById('businessDetailsModal').style.display = 'none';
    
    // Populate the edit form with current data
    document.getElementById('editAccountNo').value = accountNo;
    document.getElementById('editBusinessName').value = businessName;
    document.getElementById('editOwnerName').value = ownerName;
    document.getElementById('editAddress').value = address;
    
    // Set the barangay dropdown value
    const barangaySelect = document.getElementById('editBarangay');
    for (let i = 0; i < barangaySelect.options.length; i++) {
        if (barangaySelect.options[i].value === barangay) {
            barangaySelect.selectedIndex = i;
            break;
        }
    }
    
    document.getElementById('editNatureOfBusiness').value = natureOfBusiness;
    document.getElementById('editStatus').value = status;
    document.getElementById('editApplicationStatus').value = applicationStatus;
    
    // Format dates for input fields
    if (dateOfApplication && dateOfApplication !== 'N/A') {
        const appDate = new Date(dateOfApplication);
        document.getElementById('editDateOfApplication').value = appDate.toISOString().split('T')[0];
    }
    
    document.getElementById('editOrNo').value = orNo;
    document.getElementById('editAmountPaid').value = amountPaid;
    
    if (dateOfPayment && dateOfPayment !== 'N/A') {
        const payDate = new Date(dateOfPayment);
        document.getElementById('editDateOfPayment').value = payDate.toISOString().split('T')[0];
    }
    
    // Show the edit modal
    document.getElementById('businessEditModal').style.display = 'block';
}

// Function to save business changes
async function saveBusinessChanges() {
    try {
        // Get form data
        const accountNo = document.getElementById('editAccountNo').value;
        const businessData = {
            businessName: document.getElementById('editBusinessName').value,
            ownerName: document.getElementById('editOwnerName').value,
            address: document.getElementById('editAddress').value,
            barangay: document.getElementById('editBarangay').value,
            natureOfBusiness: document.getElementById('editNatureOfBusiness').value,
            status: document.getElementById('editStatus').value,
            applicationStatus: document.getElementById('editApplicationStatus').value,
            dateOfApplication: document.getElementById('editDateOfApplication').value,
            orNo: document.getElementById('editOrNo').value,
            amountPaid: parseFloat(document.getElementById('editAmountPaid').value) || 0,
            dateOfPayment: document.getElementById('editDateOfPayment').value
        };
        
        // Send update request to server
        const response = await fetch(`/api/business/account/${encodeURIComponent(accountNo)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(businessData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update business details');
        }
        
        // Close the edit modal
        document.getElementById('businessEditModal').style.display = 'none';
        
        // Show success message
        alert('Business details updated successfully!');
        
        // Refresh the business table
        loadBusinessData();
        
    } catch (error) {
        console.error('Error saving business changes:', error);
        alert('Failed to save business changes. Please try again.');
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
            
            // Clear the search input field
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
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