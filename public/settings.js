// Initialize settings object
let settings = {
  excludeReasons: ["mail", "tel", "abgem"],
  absenceReasons: ["K", "K+E"],
};

// Load settings from localStorage
function loadSettings() {
  const savedSettings = localStorage.getItem("absenceSettings");
  if (savedSettings) {
    settings = JSON.parse(savedSettings);
    updateExcludeReasons(settings.excludeReasons);
    updateAbsenceReasons(settings.absenceReasons);
  }
  renderAbsenceReasonsList();
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem("absenceSettings", JSON.stringify(settings));
}

// Update exclude reasons
function updateExcludeReasons(reasons) {
  settings.excludeReasons = reasons;
  window.excludeReasons = reasons;
  saveSettings();
}

// Update absence reasons
function updateAbsenceReasons(reasons) {
  settings.absenceReasons = reasons;
  window.absenceReasons = reasons;
  saveSettings();
}

// Render absence reasons list
function renderAbsenceReasonsList() {
  const container = document.getElementById("absenceReasons");
  if (!container) return; // Guard clause for when container is not found

  container.innerHTML = "";

  const select = document.createElement("select");
  select.multiple = true;
  select.className = "w-full p-2 border rounded";

  absenceReasonsMap.forEach((reason) => {
    const option = document.createElement("option");
    option.value = reason.name;
    option.text = `${reason.name} (${reason.id})`;
    option.selected = settings.absenceReasons.includes(reason.name);
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    const selectedReasons = Array.from(e.target.selectedOptions).map(
      (option) => option.value
    );
    updateAbsenceReasons(selectedReasons);
  });

  container.appendChild(select);
}

// Initialize settings when the page loads
window.addEventListener("DOMContentLoaded", loadSettings);

// Export settings for other modules
window.settings = settings;
