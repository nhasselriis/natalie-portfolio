'use strict';

(() => {
    const form = document.querySelector('#secret-password-form');
    const passwordInput = document.querySelector('#secret-password');
    const errorMessage = document.querySelector('#secret-password-error');

    if (!form || !passwordInput || !errorMessage) return;

    // Decorative client-side gate for the static GitHub Pages site.
    const GARDEN_PASSWORD = 'guest';
    const ACCESS_KEY = 'jasmineDragonAccess';

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const enteredPassword = passwordInput.value.trim().toLowerCase();

        if (!enteredPassword) {
            showError('Enter the garden password first.');
            return;
        }

        if (enteredPassword !== GARDEN_PASSWORD) {
            showError('That password did not open the gate. Try again.');
            return;
        }

        sessionStorage.setItem(ACCESS_KEY, 'unlocked');
        passwordInput.removeAttribute('aria-invalid');
        errorMessage.textContent = '';
        window.location.href = 'tea-garden-snake.html';
    });

    passwordInput.addEventListener('input', () => {
        if (passwordInput.getAttribute('aria-invalid') === 'true') {
            passwordInput.removeAttribute('aria-invalid');
            errorMessage.textContent = '';
        }
    });

    function showError(message) {
        passwordInput.setAttribute('aria-invalid', 'true');
        errorMessage.textContent = message;
        passwordInput.focus();
    }
})();
