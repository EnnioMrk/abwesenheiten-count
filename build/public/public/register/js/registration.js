// Built with Bun at 2025-06-05T10:39:13.543Z
// public/register/js/registration.js
var userData = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  plan: "",
  planPrice: 0
};
var disposableEmailDomains = [
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "fakeinbox.com",
  "trashmail.com",
  "yopmail.com",
  "tempinbox.com",
  "10minutemail.com",
  "mailnesia.com",
  "dispostable.com",
  "maildrop.cc",
  "getairmail.com",
  "getnada.com",
  "sharklasers.com",
  "mailinator.net",
  "tempmail.net"
];
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("email").addEventListener("blur", validateEmail);
  document.getElementById("step1-continue").addEventListener("click", function() {
    const email = document.getElementById("email").value;
    const firstName = document.getElementById("first-name").value;
    const lastName = document.getElementById("last-name").value;
    const password = document.getElementById("password").value;
    if (!email || !firstName || !lastName || !password) {
      showError("Please fill in all fields to continue");
      return;
    }
    if (!validateEmail()) {
      return;
    }
    if (!window.passwordValidation.isPasswordStrong()) {
      showError("Please choose a stronger password (Good or Strong rating)");
      return;
    }
    userData.email = email;
    userData.firstName = firstName;
    userData.lastName = lastName;
    userData.password = password;
    goToStep(2);
  });
  document.getElementById("step2-back").addEventListener("click", function() {
    goToStep(1);
  });
  document.getElementById("step2-continue").addEventListener("click", function() {
    if (!userData.plan) {
      showError("Please select a plan to continue");
      return;
    }
    document.getElementById("selected-plan-name").textContent = userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1);
    document.getElementById("selected-plan-price").textContent = userData.planPrice + "€/month";
    goToStep(3);
    initBraintreeUI();
  });
  document.getElementById("step3-back").addEventListener("click", function() {
    goToStep(2);
  });
});
function validateEmail() {
  const emailInput = document.getElementById("email");
  const emailValue = emailInput.value.trim();
  const emailMessage = document.getElementById("email-validation-message");
  if (!emailValue) {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailValue)) {
    emailMessage.textContent = "Please enter a valid email address";
    emailMessage.classList.remove("hidden");
    emailInput.classList.add("border-red-500");
    return false;
  }
  const domain = emailValue.split("@")[1].toLowerCase();
  if (disposableEmailDomains.includes(domain)) {
    emailMessage.textContent = "Please use a permanent email address, not a temporary one";
    emailMessage.classList.remove("hidden");
    emailInput.classList.add("border-red-500");
    return false;
  }
  emailMessage.classList.add("hidden");
  emailInput.classList.remove("border-red-500");
  return true;
}
function selectPlan(planName, price) {
  document.getElementById("plan-" + planName).checked = true;
  userData.plan = planName;
  userData.planPrice = price;
  document.getElementById("step2-continue").disabled = false;
}
function goToStep(step) {
  document.getElementById("registration-step-1").classList.add("hidden");
  document.getElementById("registration-step-2").classList.add("hidden");
  document.getElementById("registration-step-3").classList.add("hidden");
  for (let i = 1;i <= 3; i++) {
    const indicator = document.getElementById("step-indicator-" + i);
    if (i === step) {
      indicator.classList.remove("text-gray-500");
      indicator.classList.add("text-blue-600");
      indicator.querySelector("span").classList.remove("bg-gray-100", "border-gray-500");
      indicator.querySelector("span").classList.add("bg-blue-100", "border-2", "border-blue-600");
    } else if (i < step) {
      indicator.classList.remove("text-gray-500");
      indicator.classList.add("text-green-600");
      indicator.querySelector("span").classList.remove("bg-gray-100", "border-gray-500");
      indicator.querySelector("span").classList.add("bg-green-100", "border-2", "border-green-600");
    } else {
      indicator.classList.remove("text-blue-600", "text-green-600");
      indicator.classList.add("text-gray-500");
      indicator.querySelector("span").classList.remove("bg-blue-100", "bg-green-100", "border-2", "border-blue-600", "border-green-600");
      indicator.querySelector("span").classList.add("bg-gray-100", "border", "border-gray-500");
    }
  }
  document.getElementById("registration-step-" + step).classList.remove("hidden");
  hideError();
}
function showError(message) {
  const errorElement = document.getElementById("error-message");
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");
}
function hideError() {
  document.getElementById("error-message").classList.add("hidden");
}
async function initBraintreeUI() {
  try {
    document.getElementById("payment-loading").classList.remove("hidden");
    document.getElementById("paypal-button-container").classList.add("hidden");
    const tokenResponse = await fetch("/api/paypal/client-token");
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get client token: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    const tokenData = await tokenResponse.json();
    if (!tokenData.success) {
      throw new Error(tokenData.error || "Failed to get client token");
    }
    const clientToken = tokenData.clientToken;
    if (!clientToken) {
      console.error("Token data:", tokenData);
      throw new Error("Invalid client token received");
    }
    const client = await braintree.client.create({
      authorization: clientToken
    });
    const paypalCheckout = await braintree.paypalCheckout.create({
      client
    });
    await paypalCheckout.loadPayPalSDK({
      vault: true,
      intent: "tokenize"
    });
    if (!window.paypal) {
      throw new Error("PayPal SDK failed to load");
    }
    const today = new Date;
    const startDate = today.toISOString().split("T")[0];
    window.paypal.Buttons({
      fundingSource: window.paypal.FUNDING.PAYPAL,
      style: {
        color: "black",
        shape: "rect",
        label: "subscribe"
      },
      createBillingAgreement: () => {
        console.log(`${userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1)} Plan`);
        return paypalCheckout.createPayment({
          flow: "vault",
          planType: "SUBSCRIPTION",
          planMetadata: {
            name: `${userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1)} Plan`,
            billingCycles: [
              {
                sequence: "1",
                pricingScheme: {
                  pricingModel: "FIXED",
                  price: userData.planPrice.toFixed(2)
                },
                billingFrequency: "1",
                billingFrequencyUnit: "MONTH",
                startDate,
                trial: false
              }
            ],
            currencyIsoCode: "EUR",
            totalAmount: userData.planPrice.toFixed(2)
          },
          currency: "EUR",
          enableShippingAddress: false
        });
      },
      onApprove: (data, actions) => {
        return paypalCheckout.tokenizePayment(data).then((payload) => {
          console.log("Payment method tokenized:", payload);
          return completeSubscription(payload.nonce);
        });
      },
      onError: (err) => {
        console.error("PayPal error:", err);
        showError("PayPal checkout error: " + (err.message || "Unknown error"));
        document.getElementById("payment-loading").classList.add("hidden");
        document.getElementById("paypal-button-container").classList.remove("hidden");
      },
      onCancel: () => {
        console.log("Payment canceled");
        document.getElementById("payment-loading").classList.add("hidden");
        document.getElementById("paypal-button-container").classList.remove("hidden");
      }
    }).render("#paypal-button-container");
    document.getElementById("payment-loading").classList.add("hidden");
    document.getElementById("paypal-button-container").classList.remove("hidden");
  } catch (error) {
    console.error("Braintree initialization error:", error);
    showError("Payment system initialization failed: " + error.message);
    document.getElementById("payment-loading").classList.add("hidden");
  }
}
async function completeSubscription(paymentMethodNonce) {
  try {
    showProcessingMessage();
    const response = await fetch("/api/paypal/create-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        planId: getPlanIdFromSelection(),
        paymentMethodNonce,
        userData: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: userData.password,
          plan: userData.plan
        }
      })
    });
    const result = await response.json();
    if (result.success) {
      window.location.href = "/untis-login";
    } else {
      hideProcessingMessage();
      showError(result.error || "Subscription creation failed");
    }
  } catch (error) {
    hideProcessingMessage();
    console.error("Subscription error:", error);
    showError("An error occurred while processing your subscription");
  }
}
function getPlanIdFromSelection() {
  return userData.plan;
}
function showProcessingMessage() {
  document.getElementById("payment-processing").classList.remove("hidden");
  document.getElementById("paypal-button-container").classList.add("hidden");
}
function hideProcessingMessage() {
  document.getElementById("payment-processing").classList.add("hidden");
  document.getElementById("paypal-button-container").classList.remove("hidden");
}
window.selectPlan = selectPlan;
