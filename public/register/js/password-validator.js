/**
 * Password validator module for registration form
 * Uses zxcvbn library to evaluate password strength
 */

// Password validation state
let isPasswordStrong = false;

// Initialize password validator once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const strengthMeter = document.getElementById('password-strength-meter');
    const strengthText = document.getElementById('password-strength-text');
    const feedbackElement = document.getElementById('password-feedback');

    if (!passwordInput) return;

    passwordInput.addEventListener('input', function () {
        const password = this.value;

        // Use zxcvbn to evaluate password strength
        if (password) {
            const result = zxcvbn(password);
            const score = result.score; // 0-4 (0 = very weak, 4 = very strong)

            // Set password validation state - only score 3+ is considered strong enough
            isPasswordStrong = score >= 3;

            // Convert score to percentage (0-4 to 0-100%)
            const percentage = score * 25;

            // Update strength meter
            strengthMeter.style.width = percentage + '%';

            // Update color and text based on score
            switch (score) {
                case 0:
                    strengthMeter.className = 'h-2 rounded-full bg-red-600';
                    strengthText.textContent = 'Very Weak';
                    break;
                case 1:
                    strengthMeter.className = 'h-2 rounded-full bg-red-500';
                    strengthText.textContent = 'Weak';
                    break;
                case 2:
                    strengthMeter.className = 'h-2 rounded-full bg-yellow-500';
                    strengthText.textContent = 'Fair';
                    break;
                case 3:
                    strengthMeter.className = 'h-2 rounded-full bg-green-400';
                    strengthText.textContent = 'Good';
                    break;
                case 4:
                    strengthMeter.className = 'h-2 rounded-full bg-green-600';
                    strengthText.textContent = 'Strong';
                    break;
            }

            // Display feedback from zxcvbn
            let feedbackText = '';

            // Add warning if present
            if (result.feedback.warning) {
                feedbackText += `<p class="text-amber-700 font-medium">${result.feedback.warning}</p>`;
            }

            // Add suggestions if present
            if (result.feedback.suggestions.length > 0) {
                feedbackText += '<ul class="list-disc pl-5 mt-1 space-y-1">';
                result.feedback.suggestions.forEach((suggestion) => {
                    feedbackText += `<li>${suggestion}</li>`;
                });
                feedbackText += '</ul>';
            }

            feedbackElement.innerHTML = feedbackText;
        } else {
            // Reset for empty password
            isPasswordStrong = false;
            strengthMeter.style.width = '0%';
            strengthMeter.className = 'h-2 rounded-full bg-gray-300';
            strengthText.textContent = 'None';
            feedbackElement.innerHTML = '';
        }
    });
});

// Export password validation state for other modules
window.passwordValidation = {
    isPasswordStrong: () => isPasswordStrong,
};
