// Environmental Management Information System - Login Script
// Enhanced form validation and interactive features

class LoginManager {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.loginButton = document.getElementById('loginButton');
        this.rememberMeCheckbox = document.getElementById('rememberMe');

        // Error message elements
        this.emailError = document.getElementById('emailError');
        this.passwordError = document.getElementById('passwordError');
        this.globalError = document.getElementById('globalError');
        this.successMessage = document.getElementById('successMessage');

        // Button elements
        this.buttonText = this.loginButton.querySelector('.button-text');
        this.loadingSpinner = this.loginButton.querySelector('.loading-spinner');

        // Validation patterns
        this.emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        this.passwordMinLength = 6;

        // State management
        this.isSubmitting = false;
        this.validationTimeout = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadRememberedCredentials();
        this.setupAccessibility();

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        console.log('CENRO San Juan City EMIS Login System initialized');
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.passwordToggle.addEventListener('click', () => this.togglePasswordVisibility());
        this.emailInput.addEventListener('input', () => this.debounceValidation('email'));
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('input', () => this.debounceValidation('password'));
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.form.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
        this.emailInput.addEventListener('focus', () => this.clearFieldError('email'));
        this.passwordInput.addEventListener('focus', () => this.clearFieldError('password'));
        this.rememberMeCheckbox.addEventListener('change', () => this.handleRememberMeChange());

        this.loginButton.addEventListener('click', (e) => {
            if (this.isSubmitting) {
                e.preventDefault();
                return false;
            }
        });
    }

    debounceValidation(field) {
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
            if (field === 'email') this.validateEmail();
            else if (field === 'password') this.validatePassword();
        }, 300);
    }

    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailGroup = this.emailInput.closest('.form-group');
        this.clearFieldError('email');

        if (!email) {
            this.showFieldError('email', 'Email address is required');
            return false;
        }

        if (!this.emailPattern.test(email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            return false;
        }

        emailGroup.classList.remove('error');
        this.emailInput.classList.remove('error');
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;
        const passwordGroup = this.passwordInput.closest('.form-group');
        this.clearFieldError('password');

        if (!password) {
            this.showFieldError('password', 'Password is required');
            return false;
        }

        if (password.length < this.passwordMinLength) {
            this.showFieldError('password', `Password must be at least ${this.passwordMinLength} characters long`);
            return false;
        }

        passwordGroup.classList.remove('error');
        this.passwordInput.classList.remove('error');
        return true;
    }

    showFieldError(field, message) {
        const errorElement = field === 'email' ? this.emailError : this.passwordError;
        const inputElement = field === 'email' ? this.emailInput : this.passwordInput;
        const formGroup = inputElement.closest('.form-group');

        errorElement.textContent = message;
        errorElement.classList.add('show');
        inputElement.classList.add('error');
        formGroup.classList.add('error');

        inputElement.setAttribute('aria-describedby', errorElement.id);
        inputElement.setAttribute('aria-invalid', 'true');
    }

    clearFieldError(field) {
        const errorElement = field === 'email' ? this.emailError : this.passwordError;
        const inputElement = field === 'email' ? this.emailInput : this.passwordInput;
        const formGroup = inputElement.closest('.form-group');

        errorElement.textContent = '';
        errorElement.classList.remove('show');
        inputElement.classList.remove('error');
        formGroup.classList.remove('error');

        inputElement.removeAttribute('aria-describedby');
        inputElement.removeAttribute('aria-invalid');
    }

    showGlobalError(message) {
        this.globalError.textContent = message;
        this.globalError.classList.add('show');
        this.globalError.setAttribute('role', 'alert');
        this.globalError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearGlobalError() {
        this.globalError.textContent = '';
        this.globalError.classList.remove('show');
        this.globalError.removeAttribute('role');
    }

    showSuccessMessage(message) {
        this.successMessage.textContent = message;
        this.successMessage.classList.add('show');
        this.successMessage.setAttribute('role', 'alert');
    }

    clearSuccessMessage() {
        this.successMessage.textContent = '';
        this.successMessage.classList.remove('show');
        this.successMessage.removeAttribute('role');
    }

    togglePasswordVisibility() {
        const isPassword = this.passwordInput.type === 'password';
        const eyeOpen = this.passwordToggle.querySelector('.eye-open');
        const eyeClosed = this.passwordToggle.querySelector('.eye-closed');

        this.passwordInput.type = isPassword ? 'text' : 'password';

        if (isPassword) {
            eyeOpen.style.display = 'none';
            eyeClosed.style.display = 'block';
            this.passwordToggle.setAttribute('aria-label', 'Hide password');
        } else {
            eyeOpen.style.display = 'block';
            eyeClosed.style.display = 'none';
            this.passwordToggle.setAttribute('aria-label', 'Show password');
        }

        this.passwordInput.focus();
    }

    setLoadingState(isLoading) {
        this.isSubmitting = isLoading;

        this.loginButton.disabled = isLoading;
        this.buttonText.style.display = isLoading ? 'none' : 'block';
        this.loadingSpinner.style.display = isLoading ? 'flex' : 'none';
        this.form.style.pointerEvents = isLoading ? 'none' : 'auto';
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        this.clearGlobalError();
        this.clearSuccessMessage();

        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();

        if (!isEmailValid || !isPasswordValid) {
            this.showGlobalError('Please correct the errors above and try again.');
            if (!isEmailValid) this.emailInput.focus();
            else if (!isPasswordValid) this.passwordInput.focus();
            return;
        }

        this.setLoadingState(true);

        try {
            await this.performLoginRequest();  // ← CALLS REAL BACKEND
            this.handleLoginSuccess();
        } catch (error) {
            this.handleLoginError(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    async performLoginRequest() {
        const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    const response = await fetch('http://127.0.0.1:3000/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.message || 'Login failed');
    }

    this.lastLoginResult = result;

    return result;
}


handleLoginSuccess() {
    if (this.rememberMeCheckbox.checked) this.saveCredentials();
    else this.clearSavedCredentials();
    
    // Store the token in localStorage
    const result = this.lastLoginResult;
    console.log('Login result:', result);
    
    if (result && result.token) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user_data', JSON.stringify(result.user));
        console.log('Token and user data stored in localStorage');
        
        // Verify storage
        console.log('Stored token:', localStorage.getItem('auth_token'));
        console.log('Stored user data:', localStorage.getItem('user_data'));
    } else {
        console.error('No token in login result');
    }
    
    this.showSuccessMessage('Login successful! Redirecting to CENRO dashboard...');
    
    setTimeout(() => {
        console.log('Redirecting to dashboard...');
        // Change this to redirect to /dashboard instead of /dashboard.html
        window.location.href = '/dashboard';
    }, 1500);
    
    console.log('Login successful for user:', this.emailInput.value);
}


    handleLoginError(error) {
        console.error('Login error:', error.message);
        this.showGlobalError(error.message);
        this.passwordInput.value = '';
        this.emailInput.focus();

        this.form.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => this.form.style.animation = '', 500);
    }

    handleKeyboardNavigation(e) {
        if (e.key === 'Enter') {
            const active = document.activeElement;
            if (active === this.emailInput && this.validateEmail()) {
                this.passwordInput.focus();
                e.preventDefault();
            } else if (active === this.passwordInput && this.validatePassword()) {
                this.form.requestSubmit();
                e.preventDefault();
            }
        }

        if (e.key === 'Escape') {
            const active = document.activeElement;
            if (active === this.emailInput || active === this.passwordInput) {
                active.value = '';
                this.clearFieldError(active === this.emailInput ? 'email' : 'password');
            }
        }
    }

    saveCredentials() {
        if (typeof Storage !== 'undefined') {
            const credentials = {
                email: this.emailInput.value.trim(),
                rememberMe: true,
                savedAt: Date.now()
            };
            localStorage.setItem('cenro_sanjuan_emis_login_data', JSON.stringify(credentials));
        }
    }

    loadRememberedCredentials() {
        if (typeof Storage !== 'undefined') {
            try {
                const savedData = localStorage.getItem('cenro_sanjuan_emis_login_data');
                if (savedData) {
                    const credentials = JSON.parse(savedData);
                    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                    if (credentials.savedAt > thirtyDaysAgo) {
                        this.emailInput.value = credentials.email || '';
                        this.rememberMeCheckbox.checked = credentials.rememberMe || false;
                        if (credentials.email) this.passwordInput.focus();
                    } else {
                        this.clearSavedCredentials();
                    }
                }
            } catch {
                this.clearSavedCredentials();
            }
        }
    }

    clearSavedCredentials() {
        localStorage.removeItem('cenro_sanjuan_emis_login_data');
    }

    handleRememberMeChange() {
        if (!this.rememberMeCheckbox.checked) {
            this.clearSavedCredentials();
        }
    }

    setupAccessibility() {
        this.emailInput.setAttribute('aria-describedby', 'emailError');
        this.passwordInput.setAttribute('aria-describedby', 'passwordError');

        this.form.setAttribute('role', 'form');
        this.form.setAttribute('aria-label', 'EMIS Login Form');

        const formDescription = document.createElement('div');
        formDescription.id = 'form-description';
        formDescription.className = 'sr-only';
        formDescription.textContent = 'Environmental Management Information System login form. Enter your credentials to access the system.';
        this.form.insertBefore(formDescription, this.form.firstChild);
        this.form.setAttribute('aria-describedby', 'form-description');
    }
}

// Add shake animation keyframes
const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
`;

const style = document.createElement('style');
style.textContent = shakeKeyframes;
document.head.appendChild(style);

const srOnlyCSS = `
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
`;

const srStyle = document.createElement('style');
srStyle.textContent = srOnlyCSS;
document.head.appendChild(srStyle);

document.addEventListener('DOMContentLoaded', () => {
    window.loginManager = new LoginManager();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - pausing any ongoing operations');
    } else {
        console.log('Page visible - resuming operations');
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginManager;
}
