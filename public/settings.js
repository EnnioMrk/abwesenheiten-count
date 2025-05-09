// Initialize settings object
let settings = {
  excludeReasons: ["mail", "tel", "abgem"],
  absenceReasons: ["K", "K+E"],
};

const absenceReasonsMap = [
  { id: 152, name: "X" },
  { id: 138, name: "D" },
  { id: 136, name: "A" },
  { id: 126, name: "B" },
  { id: 133, name: "S" },
  { id: 147, name: "DAZ" },
  { id: 144, name: "Nachmittag" },
  { id: 116, name: "K" },
  { id: 149, name: "K+E" },
  { id: 128, name: "V" },
  { id: 0, name: "undefined" },
];

let select;

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

  select = document.createElement("select");
  select.multiple = true;
  select.className = "w-full p-2 border rounded";

  console.log(absenceReasonsMap);
  absenceReasonsMap.forEach((reason) => {
    const option = document.createElement("option");
    option.value = reason.name;
    option.text = `${reason.name} (${reason.id})`;
    option.selected = settings.absenceReasons.includes(reason.name);
    select.appendChild(option);
  });

  container.appendChild(select);
}

// Settings Modal Functions
function openSettings() {
  const modal = document.getElementById("settingsModal");
  const excludeReasonsInput = document.getElementById("excludeReasons");
  const absenceReasonsInput = document.getElementById("absenceReasons");

  excludeReasonsInput.value = settings.excludeReasons.join(", ");
  absenceReasonsInput.value = settings.absenceReasons.join(", ");

  modal.classList.remove("hidden");
}

function closeSettings() {
  const modal = document.getElementById("settingsModal");
  modal.classList.add("hidden");
}

function saveSettingsChanges() {
  const excludeReasonsInput = document.getElementById("excludeReasons");
  const absenceReasons = Array.from(select.selectedOptions).map(
    (option) => option.value
  );

  const excludeReasons = excludeReasonsInput.value
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r);

  updateExcludeReasons(excludeReasons);
  updateAbsenceReasons(absenceReasons);

  closeSettings();
  loadDashboard(); // Reload dashboard with new settings
}

// Initialize settings when the page loads
window.addEventListener("DOMContentLoaded", loadSettings);

// Export settings for other modules
window.settings = settings;
