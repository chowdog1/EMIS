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
    }

    init() {
        console.log('CENRO San Juan City EMIS Registration System initialized');

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        this.setupEventListeners();
        this.setupPasswordToggles();
        this.initializeFloatingElements();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
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
        e.preventDefault();

        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        const isConfirmPasswordValid = this.validateConfirmPassword();

        if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
            this.shakeForm();
            return;
        }

        this.setLoading(true);

        try {
            await this.registerUser();
            this.showRegistrationSuccess();
        } catch (error) {
            console.error('Registration error:', error);
            this.showRegistrationError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    async registerUser() {
        const formData = {
            email: this.emailInput.value.trim(),
            password: this.passwordInput.value
        };

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Registration failed');
        }

        console.log('✅ Registered:', result.message);
    }

    showRegistrationSuccess() {
        // Replace form with success message
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
    new RegistrationSystem();
});
