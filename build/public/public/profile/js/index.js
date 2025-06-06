// Built with Bun at 2025-06-05T10:39:13.543Z
// public/profile/js/index.js
async function loadProfileInfo() {
  try {
    const response = await fetch("/api/user/info");
    const data = await response.json();
    if (data.success) {
      const user = data.user;
      document.getElementById("user-name").textContent = `${user.firstName} ${user.lastName}`;
      document.getElementById("user-email").textContent = user.email;
      document.getElementById("user-plan").textContent = user.plan.charAt(0).toUpperCase() + user.plan.slice(1);
      document.getElementById("user-subscription").textContent = user.subscriptionStatus.charAt(0).toUpperCase() + user.subscriptionStatus.slice(1);
    } else {
      throw new Error(data.error || "Failed to load user information");
    }
  } catch (error) {
    console.error("Error loading user information:", error);
    document.getElementById("user-name").textContent = "Error loading data";
    document.getElementById("user-email").textContent = "Error loading data";
    document.getElementById("user-plan").textContent = "Error loading data";
    document.getElementById("user-subscription").textContent = "Error loading data";
  }
}
document.addEventListener("DOMContentLoaded", loadProfileInfo);
document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/user/logout", {
      method: "POST"
    });
    if (response.ok) {
      window.location.href = "/login";
    } else {
      console.error("Logout failed");
    }
  } catch (error) {
    console.error("Error during logout:", error);
  }
});
