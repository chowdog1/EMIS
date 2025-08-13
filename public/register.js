/**
 * CENRO San Juan City EMIS Registration System
 * Environmental Management Information System
 * Registration page functionality with form validation
 */
class RegistrationSystem {
    constructor() {
        this.form = document.getElementById('registrationForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.registerBtn = document.getElementById('registerBtn');
        this.passwordToggles = document.querySelectorAll('.password-toggle');
        this.init();
        this.emailExists = false;
        this.emailCheckInProgress = false;
    }

    debounce(func, wait)
    {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };

    }

    init() {
        console.log('CENRO San Juan City EMIS Registration System initialized');
        
        // Check if all required elements exist
        if (!this.form) {
            console.error('Registration form not found!');
            this.showCriticalError('Form element not found. Please check your HTML structure.');
            return;
        }
        if (!this.emailInput) console.error('Email input not found');
        if (!this.passwordInput) console.error('Password input not found');
        if (!this.confirmPasswordInput) console.error('Confirm password input not found');
        if (!this.registerBtn) console.error('Register button not found');
        
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        this.setupEventListeners();
        this.setupPasswordToggles();
        this.initializeFloatingElements();
    }
    
    // Show a critical error that prevents the form from working
    showCriticalError(message) {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; padding: 20px; text-align: center;">
                <div style="max-width: 500px; padding: 30px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <h2 style="color: #d32f2f; margin-top: 0;">Critical Error</h2>
                    <p>${message}</p>
                    <p>Please check the browser console for more details and contact support if the problem persists.</p>
                    <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">Reload Page</button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners');
        this.form.addEventListener('submit', (e) => {
            console.log('Form submit event triggered');
            this.handleSubmit(e);
        });
        const debouncedCheckEmail = this.debounce(this.checkEmailExists.bind(this), 500);
        this.emailInput.addEventListener('input', () => {
            this.validateEmail();
            debouncedCheckEmail();
        });
        this.emailInput.addEventListener('input', () => this.validateEmail());
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('input', () => {
            this.validatePassword();
            this.checkPasswordStrength();
            this.validateConfirmPassword();
        });
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.confirmPasswordInput.addEventListener('input', () => this.validateConfirmPassword());
        this.confirmPasswordInput.addEventListener('blur', () => this.validateConfirmPassword());
        this.form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                this.focusNextInput(e.target);
            }
        });
    }
    
    setupPasswordToggles() {
        this.passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const input = toggle.parentElement.querySelector('input');
                const icon = toggle.querySelector('.toggle-icon');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.setAttribute('data-feather', 'eye-off');
                    toggle.setAttribute('aria-label', 'Hide password');
                } else {
                    input.type = 'password';
                    icon.setAttribute('data-feather', 'eye');
                    toggle.setAttribute('aria-label', 'Show password');
                }
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            });
        });
    }
    
    validateEmail() {
    const email = this.emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const formGroup = this.emailInput.closest('.form-group');
    const errorElement = document.getElementById('email-error');
    this.clearValidation(formGroup);
    
    if (!email) {
        this.showError(formGroup, errorElement, 'Email address is required');
        return false;
    }
    if (!emailRegex.test(email)) {
        this.showError(formGroup, errorElement, 'Please enter a valid email address');
        return false;
    }
    if (this.emailExists) {
        this.showError(formGroup, errorElement, 'This email is already registered');
        return false;
    }
    if (!email.includes('.gov.ph')) {
        this.showWarning(formGroup, errorElement, 'Consider using your official government email');
    } else {
        this.showSuccess(formGroup);
    }
    return true;
}
    
    validatePassword() {
        const password = this.passwordInput.value;
        const formGroup = this.passwordInput.closest('.form-group');
        const errorElement = document.getElementById('password-error');
        this.clearValidation(formGroup);
        if (!password) {
            this.showError(formGroup, errorElement, 'Password is required');
            return false;
        }
        if (password.length < 6) {
            this.showError(formGroup, errorElement, 'Password must be at least 6 characters long');
            return false;
        }
        this.showSuccess(formGroup);
        return true;
    }
    
    validateConfirmPassword() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        const formGroup = this.confirmPasswordInput.closest('.form-group');
        const errorElement = document.getElementById('confirmPassword-error');
        this.clearValidation(formGroup);
        if (!confirmPassword) {
            this.showError(formGroup, errorElement, 'Please confirm your password');
            return false;
        }
        if (password !== confirmPassword) {
            this.showError(formGroup, errorElement, 'Passwords do not match');
            return false;
        }
        this.showSuccess(formGroup);
        return true;
    }
    
    checkPasswordStrength() {
        const password = this.passwordInput.value;
        const strengthElement = document.getElementById('password-strength');
        if (!password) {
            strengthElement.textContent = '';
            strengthElement.className = 'password-strength';
            return;
        }
        let strength = 0;
        let feedback = [];
        if (password.length >= 8) strength++;
        else feedback.push('at least 8 characters');
        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('uppercase letter');
        if (/[a-z]/.test(password)) strength++;
        else feedback.push('lowercase letter');
        if (/\d/.test(password)) strength++;
        else feedback.push('number');
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
        else feedback.push('special character');
        strengthElement.className = 'password-strength';
        if (strength < 2) {
            strengthElement.className += ' weak';
            strengthElement.textContent = `Weak password. Consider adding: ${feedback.slice(0, 2).join(', ')}`;
        } else if (strength < 4) {
            strengthElement.className += ' medium';
            strengthElement.textContent = `Medium strength. Consider adding: ${feedback.slice(0, 1).join(', ')}`;
        } else {
            strengthElement.className += ' strong';
            strengthElement.textContent = 'Strong password!';
        }
    }
    
    async handleSubmit(e) {
        console.log('handleSubmit called');
        e.preventDefault();
        e.stopPropagation();
        
        if (this.emailCheckInProgress) {
            console.log('Waiting for email check to complete');
            
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if(!this.emailCheckInProgress) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100)
            })
        }

        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        const isConfirmPasswordValid = this.validateConfirmPassword();
        
        console.log('Validation results:', {
            email: isEmailValid,
            password: isPasswordValid,
            confirmPassword: isConfirmPasswordValid
        });
        
        if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
            console.log('Validation failed');
            this.shakeForm();
            return;
        }
        
        this.setLoading(true);
        console.log('Loading state set to true');
        
        try {
            const result = await this.registerUser();
            console.log('Registration successful:', result);
            this.showRegistrationSuccess();
        } catch (error) {
            console.error('Registration error:', error);
            this.showRegistrationError(error.message || 'An unexpected error occurred during registration');
        } finally {
            this.setLoading(false);
            console.log('Loading state set to false');
        }
    }
    
    async registerUser() {
    console.log('registerUser called');
    const formData = {
        email: this.emailInput.value.trim(),
        password: this.passwordInput.value
    };
    console.log('Sending registration data:', formData);
    
    try {
        // Make sure to use /api/auth/register
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        console.log('Response status:', response.status);
        
        // Check if response is ok before parsing JSON
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Response data:', result);
        return result;
    } catch (error) {
        console.error('Error in registerUser:', error);
        
        // If it's a network error or the API doesn't exist, show a more helpful message
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') || 
            error.message.includes('ECONNREFUSED')) {
            throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
        }
        
        throw error;
    }
}
    async checkEmailExists() {
    const email = this.emailInput.value.trim();
    
    // Don't check if email is empty or invalid
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return;
    }
    
    this.emailCheckInProgress = true;
    
    // Find the loading spinner element
    const parentElement = this.emailInput.parentElement;
    let loadingElement = parentElement.querySelector('.email-check-loading');
    
    // If the loading element doesn't exist, create it
    if (!loadingElement) {
        loadingElement = document.createElement('div');
        loadingElement.className = 'email-check-loading';
        loadingElement.innerHTML = '<i data-feather="loader" class="spinner"></i>';
        parentElement.appendChild(loadingElement);
        
        // Initialize the feather icon
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    loadingElement.style.display = 'flex';
    
    try {
        const response = await fetch('/api/check-email', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email})
        });
        
        const result = await response.json();
        
        if (response.ok && result.exists) {
            this.emailExists = true;
            const formGroup = this.emailInput.closest('.form-group');
            const errorElement = document.getElementById('email-error');
            this.showError(formGroup, errorElement, 'This email is already registered');
        } else {
            this.emailExists = false;
            const formGroup = this.emailInput.closest('.form-group');
            const errorElement = document.getElementById('email-error');
            
            // Only clear the email exists error, not other validation errors
            if (formGroup.classList.contains('error') && 
                errorElement.textContent === 'This email is already registered') {
                this.clearValidation(formGroup);
                // Re-run normal validation to show other errors if needed
                this.validateEmail();
            }
        }
    } catch (error) {
        console.error('Error checking email existence', error);
    } finally {
        this.emailCheckInProgress = false;
        loadingElement.style.display = 'none';
    }
}

    showRegistrationSuccess() {
        console.log('showRegistrationSuccess called');
        
        // Create a visible overlay to ensure the message is seen
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        
        const successBox = document.createElement('div');
        successBox.style.backgroundColor = 'white';
        successBox.style.padding = '30px';
        successBox.style.borderRadius = '8px';
        successBox.style.maxWidth = '500px';
        successBox.style.width = '90%';
        successBox.style.textAlign = 'center';
        successBox.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        successBox.style.animation = 'scaleIn 0.5s ease-out';
        
        successBox.innerHTML = `
            <div class="success-icon" style="margin-bottom: 20px;">
                <i data-feather="check-circle" style="color: #4CAF50; width: 64px; height: 64px;"></i>
            </div>
            <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Registration Successful!</h3>
            <p style="color: #666; margin-bottom: 25px;">Your account has been created successfully. You can now sign in with your credentials.</p>
            <a href="index.html" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500;">
                Go to Sign In
            </a>
        `;
        
        overlay.appendChild(successBox);
        document.body.appendChild(overlay);
        
        // Initialize feather icons in the new content
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Also update the form content for when the overlay is closed
        this.form.innerHTML = `
            <div class="success-message">
                <div class="success-icon">
                    <i data-feather="check-circle"></i>
                </div>
                <h3>Registration Successful!</h3>
                <p>Your account has been created successfully. You can now sign in with your credentials.</p>
                <a href="index.html" class="login-button" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-sm);">
                    <i data-feather="log-in" class="button-icon"></i>
                    Go to Sign In
                </a>
            </div>
        `;
        
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    showRegistrationError(message) {
        console.log('showRegistrationError called with message:', message);
        
        // Create a visible overlay to ensure the error is seen
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        
        const errorBox = document.createElement('div');
        errorBox.style.backgroundColor = 'white';
        errorBox.style.padding = '30px';
        errorBox.style.borderRadius = '8px';
        errorBox.style.maxWidth = '500px';
        errorBox.style.width = '90%';
        errorBox.style.textAlign = 'center';
        errorBox.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        errorBox.style.animation = 'scaleIn 0.5s ease-out';
        
        errorBox.innerHTML = `
            <div style="margin-bottom: 20px;">
                <i data-feather="alert-circle" style="color: #f44336; width: 64px; height: 64px;"></i>
            </div>
            <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Registration Error</h3>
            <p style="color: #666; margin-bottom: 25px;">${message}</p>
            <button onclick="this.closest('.error-overlay').remove()" style="background: #f44336; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 500;">
                Try Again
            </button>
        `;
        
        overlay.classList.add('error-overlay');
        overlay.appendChild(errorBox);
        document.body.appendChild(overlay);
        
        // Initialize feather icons in the new content
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Also show the error in the form
        const existingError = this.form.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.innerHTML = `
            <i data-feather="alert-circle"></i>
            <span>${message}</span>
        `;
        
        this.form.insertBefore(errorDiv, this.form.firstChild);
        
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    setLoading(loading) {
        console.log('setLoading called with:', loading);
        if (!this.registerBtn) {
            console.error('Register button not found in setLoading');
            return;
        }
        
        this.registerBtn.disabled = loading;
        if (loading) {
            this.registerBtn.classList.add('loading');
            this.registerBtn.setAttribute('aria-label', 'Creating account, please wait');
        } else {
            this.registerBtn.classList.remove('loading');
            this.registerBtn.setAttribute('aria-label', 'Create account');
        }
    }
    
    showError(formGroup, errorElement, message) {
        formGroup.classList.remove('success', 'warning');
        formGroup.classList.add('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    showWarning(formGroup, errorElement, message) {
        formGroup.classList.remove('success', 'error');
        formGroup.classList.add('warning');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    showSuccess(formGroup) {
        const errorElement = formGroup.querySelector('.error-message');
        formGroup.classList.remove('error', 'warning');
        formGroup.classList.add('success');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    clearValidation(formGroup) {
        const errorElement = formGroup.querySelector('.error-message');
        formGroup.classList.remove('error', 'success', 'warning');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    shakeForm() {
        this.form.classList.add('shake');
        setTimeout(() => {
            this.form.classList.remove('shake');
        }, 500);
    }
    
    focusNextInput(currentInput) {
        const inputs = Array.from(this.form.querySelectorAll('input[type="email"], input[type="password"]'));
        const currentIndex = inputs.indexOf(currentInput);
        if (currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
        } else {
            this.registerBtn.focus();
        }
    }
    
    initializeFloatingElements() {
        const floatingElements = document.querySelectorAll('[data-float="true"]');
        floatingElements.forEach((element, index) => {
            const delay = index * 0.5;
            const duration = 3 + Math.random() * 2;
            element.style.animation = `float ${duration}s ease-in-out ${delay}s infinite alternate`;
        });
        this.setupParallax();
    }
    
    setupParallax() {
        let ticking = false;
        const updateParallax = () => {
            const scrollY = window.pageYOffset;
            const elements = document.querySelectorAll('.wave, .leaf');
            elements.forEach((element, index) => {
                const speed = 0.5 + (index * 0.1);
                const yPos = -(scrollY * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
            ticking = false;
        };
        const requestParallax = () => {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        };
        window.addEventListener('scroll', requestParallax);
    }
}

// Initialize the registration system
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing registration system');
    new RegistrationSystem();
});