// dashboard.js

// Global variables to store user data
let currentUser = null;

// Function to update user info in the UI
function updateUserInfo(user) {
    console.log('Updating user info with:', user);
    
    const userEmailElement = document.getElementById('userEmail');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userEmailElement && user && user.email) {
        userEmailElement.textContent = user.email;
        console.log('Updated user email to:', user.email);
    } else {
        console.error('User email element not found or user data invalid');
    }
    
    if (userAvatarElement && user && user.email) {
        userAvatarElement.textContent = user.email.charAt(0).toUpperCase();
        console.log('Updated user avatar to:', user.email.charAt(0).toUpperCase());
    } else {
        console.error('User avatar element not found or user data invalid');
    }
}

// Function to check authentication and get user data
function checkAuth() {
    console.log('Checking authentication...');
    
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    console.log('Token found:', !!token);
    console.log('User data found:', !!userData);
    console.log('User data string:', userData);
    
    if (!token || !userData) {
        console.log('No token or user data found, redirecting to login');
        window.location.href = '/';
        return null;
    }
    
    try {
        const user = JSON.parse(userData);
        console.log('User data parsed successfully:', user);
        
        // Update the UI immediately
        updateUserInfo(user);
        
        return user;
    } catch (e) {
        console.error('Error parsing user data:', e);
        window.location.href = '/';
        return null;
    }
}

// Function to verify token with server
async function verifyToken() {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        console.log('No token found');
        return false;
    }
    
    try {
        const response = await fetch('/api/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            console.log('Token is valid');
            return true;
        } else {
            console.log('Token is invalid, status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        return false;
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
    
    // Remove existing event listeners to avoid duplicates
    userDropdown.replaceWith(userDropdown.cloneNode(true));
    
    // Get fresh references
    const freshUserDropdown = document.getElementById('userDropdown');
    const freshUserDropdownMenu = document.getElementById('userDropdownMenu');
    
    // Add click event to dropdown button
    freshUserDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Dropdown clicked, toggling menu');
        freshUserDropdownMenu.classList.toggle('show');
    });
    
    // Add click event to document to close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-dropdown')) {
            console.log('Clicked outside dropdown, closing menu');
            freshUserDropdownMenu.classList.remove('show');
        }
    });
    
    // Prevent dropdown from closing when clicking inside it
    freshUserDropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation();
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
    
    // Remove existing event listeners to avoid duplicates
    logoutBtn.replaceWith(logoutBtn.cloneNode(true));
    
    // Get fresh reference
    const freshLogoutBtn = document.getElementById('logoutBtn');
    
    freshLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Logout clicked, clearing auth data');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/';
    });
    
    console.log('Logout functionality setup complete');
}

// Function to initialize the data table
function initializeDataTable() {
    console.log('Initializing data table');
    
    // Sample data for the table
    const tableData = [
        { id: 1, title: 'Water Quality Assessment', location: 'San Juan River', date: '2023-10-15', status: 'Completed', priority: 'High' },
        { id: 2, title: 'Air Pollution Monitoring', location: 'City Center', date: '2023-10-14', status: 'In Progress', priority: 'Medium' },
        { id: 3, title: 'Waste Management Audit', location: 'Barangay Addition Hills', date: '2023-10-12', status: 'Pending', priority: 'Low' },
        { id: 4, title: 'Tree Planting Evaluation', location: 'Pinaglabanan Street', date: '2023-10-10', status: 'Completed', priority: 'Medium' },
        { id: 5, title: 'Noise Level Measurement', location: 'N. Domingo Street', date: '2023-10-08', status: 'Completed', priority: 'Low' },
        { id: 6, title: 'Soil Contamination Test', location: 'Greenhills', date: '2023-10-05', status: 'In Progress', priority: 'High' },
        { id: 7, title: 'Biodiversity Survey', location: 'Wack Wack Road', date: '2023-10-03', status: 'Pending', priority: 'Medium' },
    ];
    
    // Status badge component
    const StatusBadge = ({ status }) => {
        let color = '';
        switch (status) {
            case 'Completed':
                color = '#28a745'; // Green
                break;
            case 'In Progress':
                color = '#ffc107'; // Yellow
                break;
            case 'Pending':
                color = '#dc3545'; // Red
                break;
            default:
                color = '#6c757d'; // Gray
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
        }, status);
    };
    
    // Priority badge component
    const PriorityBadge = ({ priority }) => {
        let color = '';
        switch (priority) {
            case 'High':
                color = '#dc3545'; // Red
                break;
            case 'Medium':
                color = '#ffc107'; // Yellow
                break;
            case 'Low':
                color = '#28a745'; // Green
                break;
            default:
                color = '#6c757d'; // Gray
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
        }, priority);
    };
    
    // Table columns
    const columns = [
        {
            name: 'ID',
            selector: row => row.id,
            sortable: true,
            width: '80px'
        },
        {
            name: 'Title',
            selector: row => row.title,
            sortable: true,
            grow: 2
        },
        {
            name: 'Location',
            selector: row => row.location,
            sortable: true,
            grow: 1
        },
        {
            name: 'Date',
            selector: row => row.date,
            sortable: true,
            width: '120px'
        },
        {
            name: 'Status',
            selector: row => row.status,
            sortable: true,
            cell: row => React.createElement(StatusBadge, { status: row.status }),
            width: '130px'
        },
        {
            name: 'Priority',
            selector: row => row.priority,
            sortable: true,
            cell: row => React.createElement(PriorityBadge, { priority: row.priority }),
            width: '100px'
        }
    ];
    
    // Custom styles for the table
    const customStyles = {
        headCells: {
            style: {
                backgroundColor: '#f8f9fa',
                fontWeight: '600',
                fontSize: '0.875rem'
            },
        },
        rows: {
            style: {
                '&:not(:last-of-type)': {
                    borderBottom: '1px solid #e9ecef',
                },
            },
        },
    };
    
    // Table component
    const DataTable = ReactDataTable.default;
    
    const App = () => {
        return React.createElement(DataTable, {
            title: '',
            columns: columns,
            data: tableData,
            customStyles: customStyles,
            pagination: true,
            paginationPerPage: 5,
            paginationRowsPerPageOptions: [5, 10, 15, 20],
            paginationComponentOptions: {
                rowsPerPageText: 'Rows per page:',
                rangeSeparatorText: 'of',
                noRowsPerPage: false,
                selectAllRowsItem: false,
                selectAllRowsItemText: 'All'
            },
            persistTableHead: true,
            highlightOnHover: true,
            pointerOnHover: true
        });
    };
    
    // Render the table
    const tableRoot = document.getElementById('data-table-root');
    if (tableRoot) {
        ReactDOM.render(React.createElement(App), tableRoot);
        console.log('Data table rendered successfully');
    } else {
        console.error('Data table root element not found');
    }
}

// Main initialization function
async function initializeDashboard() {
    console.log('Initializing dashboard');
    
    // Check authentication first
    currentUser = checkAuth();
    
    if (!currentUser) {
        console.log('Authentication failed, stopping initialization');
        return;
    }
    
    // Verify token in the background
    const isValid = await verifyToken();
    
    if (!isValid) {
        console.log('Token verification failed, redirecting to login');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/';
        return;
    }
    
    console.log('Authentication successful, setting up dashboard');
    
    // Setup dropdown and logout
    setupDropdown();
    setupLogout();
    
    // Initialize the data table
    initializeDataTable();
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing dashboard');
    initializeDashboard();
});