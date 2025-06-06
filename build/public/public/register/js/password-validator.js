// Built with Bun at 2025-06-05T10:39:13.543Z
// public/register/js/password-validator.js
var isPasswordStrong = false;
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password");
  const strengthMeter = document.getElementById("password-strength-meter");
  const strengthText = document.getElementById("password-strength-text");
  const feedbackElement = document.getElementById("password-feedback");
  if (!passwordInput)
    return;
  passwordInput.addEventListener("input", function() {
    const password = this.value;
    if (password) {
      const result = zxcvbn(password);
      const score = result.score;
      isPasswordStrong = score >= 3;
      const percentage = score * 25;
      strengthMeter.style.width = percentage + "%";
      switch (score) {
        case 0:
          strengthMeter.className = "h-2 rounded-full bg-red-600";
          strengthText.textContent = "Very Weak";
          break;
        case 1:
          strengthMeter.className = "h-2 rounded-full bg-red-500";
          strengthText.textContent = "Weak";
          break;
        case 2:
          strengthMeter.className = "h-2 rounded-full bg-yellow-500";
          strengthText.textContent = "Fair";
          break;
        case 3:
          strengthMeter.className = "h-2 rounded-full bg-green-400";
          strengthText.textContent = "Good";
          break;
        case 4:
          strengthMeter.className = "h-2 rounded-full bg-green-600";
          strengthText.textContent = "Strong";
          break;
      }
      let feedbackText = "";
      if (result.feedback.warning) {
        feedbackText += `<p class="text-amber-700 font-medium">${result.feedback.warning}</p>`;
      }
      if (result.feedback.suggestions.length > 0) {
        feedbackText += '<ul class="list-disc pl-5 mt-1 space-y-1">';
        result.feedback.suggestions.forEach((suggestion) => {
          feedbackText += `<li>${suggestion}</li>`;
        });
        feedbackText += "</ul>";
      }
      feedbackElement.innerHTML = feedbackText;
    } else {
      isPasswordStrong = false;
      strengthMeter.style.width = "0%";
      strengthMeter.className = "h-2 rounded-full bg-gray-300";
      strengthText.textContent = "None";
      feedbackElement.innerHTML = "";
    }
  });
});
window.passwordValidation = {
  isPasswordStrong: () => isPasswordStrong
};
