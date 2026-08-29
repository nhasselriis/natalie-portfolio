'use strict';

const form = document.querySelector('#contact-form');

if (form) {
    const status = document.querySelector('#form-status');
    const requiredFields = Array.from(form.querySelectorAll('[required]'));

    const getErrorElement = (field) => {
        const errorId = field.getAttribute('aria-describedby')
            ?.split(/\s+/)
            .find((id) => id.endsWith('-error'));

        return errorId ? document.getElementById(errorId) : null;
    };

    const getMessage = (field) => {
        if (field.validity.valueMissing) {
            return 'Please complete this field.';
        }

        if (field.validity.typeMismatch && field.type === 'email') {
            return 'Please enter a valid email address, such as name@example.com.';
        }

        if (field.validity.tooShort) {
            return `Please enter at least ${field.minLength} characters.`;
        }

        return 'Please check this field and try again.';
    };

    const showError = (field) => {
        const error = getErrorElement(field);
        field.setAttribute('aria-invalid', 'true');
        field.closest('.form-field')?.classList.add('has-error');

        if (error) {
            error.textContent = getMessage(field);
        }
    };

    const clearError = (field) => {
        const error = getErrorElement(field);
        field.removeAttribute('aria-invalid');
        field.closest('.form-field')?.classList.remove('has-error');

        if (error) {
            error.textContent = '';
        }
    };

    requiredFields.forEach((field) => {
        field.addEventListener('blur', () => {
            if (field.validity.valid) {
                clearError(field);
            } else {
                showError(field);
            }
        });

        field.addEventListener('input', () => {
            if (field.validity.valid) {
                clearError(field);
            }
        });
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        let firstInvalidField = null;

        requiredFields.forEach((field) => {
            if (!field.validity.valid) {
                showError(field);
                firstInvalidField ??= field;
            } else {
                clearError(field);
            }
        });

        if (firstInvalidField) {
            status.textContent = 'Please correct the highlighted fields before sending your message.';
            status.className = 'form-status form-status-error';
            firstInvalidField.focus();
            return;
        }

        status.textContent = 'Thanks! This demonstration form is complete and ready to connect to a form service later.';
        status.className = 'form-status form-status-success';
        form.reset();
    });
}
