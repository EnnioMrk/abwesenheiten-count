//let currentDevice = "desktop"; // Default to desktop view

let widgets = [];
let widgetsLoaded = false;
let previousDeviceType; // Variable to track the previous device type

const analyser = new annalyser();

// Initialize dashboard data
let absencesData = [];
let timetableData = [];

// Function to fetch all data needed for the dashboard
async function fetchDashboardData() {
  try {
    // Show skeleton loader
    document.getElementById("skeletonLoader").style.display = "grid";

    // Fetch absences data
    const absencesResponse = await fetch("/api/untis/absences/all");
    const absencesJson = await absencesResponse.json();
    absencesData = analyser.processAbsencesData(absencesJson);

    // Fetch timetable data for the year
    const timetableResponse = await fetch("/api/untis/timetable/year");
    const timetableJson = await timetableResponse.json();
    timetableData = timetableJson;

    // Load dashboard configuration
    loadDashboardConfig();

    // Update the dashboard based on config
    //await updateDashboardLayout();
    return;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    // Show error notification
    alert("Failed to load absence data. Please try refreshing the page.");
    document.getElementById("skeletonLoader").style.display = "none";
  }
}

// Load dashboard configuration from localStorage
function loadDashboardConfig() {
  const configJson = localStorage.getItem("dashboard-config");
  if (configJson) {
    try {
      dashboardConfig = JSON.parse(configJson);
      console.log("Dashboard configuration loaded:", dashboardConfig);
    } catch (error) {
      console.error("Error parsing dashboard config:", error);
      dashboardConfig = null;
    }
  }
}

// Initialize chart instances object to track all charts
const chartInstances = {};

// Function to safely destroy a chart if it exists
function destroyChartIfExists(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    chartInstances[canvasId] = null;
  }
}

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", async () => {
  // Apply saved theme or default
  applyTheme(currentTheme);

  await fetchDashboardData();

  initGrids(); // Initializes both grids, hides them, then shows the correct one

  // Store the initial device type
  previousDeviceType = detectDeviceType();

  loadDashboardConfig();

  loadDefaultLayout(previousDeviceType); // Load layout for the initial device

  //updateDashboardLayout();

  // Fetch dashboard data and update layout
  //fetchDashboardData();

  // Add event listener for the edit button
  const editButton = document.getElementById("editToggle");
  if (editButton) {
    editButton.addEventListener("click", () => {
      const currentDeviceType = detectDeviceType();
      const grid = grids[currentDeviceType];
      if (grid) {
        const isStatic = grid.opts.staticGrid; // Corrected property access
        grid.setStatic(!isStatic);
        editButton.firstElementChild.classList.toggle("hidden");
        editButton.lastElementChild.classList.toggle("hidden");
        // Optionally add visual cues for edit mode, e.g., changing button color or adding a border to the grid
        const gridElement = document.getElementById(
          `grid-${currentDeviceType}`
        );
        if (gridElement) {
          gridElement.classList.toggle("editing-mode", isStatic);
        }
      }
    });
  }

  // Add resize event listener
  window.addEventListener("resize", () => {
    const currentDeviceType = detectDeviceType();
    if (currentDeviceType !== previousDeviceType) {
      console.log(
        `Device changed from ${previousDeviceType} to ${currentDeviceType}`
      );
      const previousGrid = document.getElementById(
        `grid-${previousDeviceType}`
      );
      const currentGrid = document.getElementById(`grid-${currentDeviceType}`);

      if (previousGrid) {
        previousGrid.classList.add("hidden");
      }
      if (currentGrid) {
        currentGrid.classList.remove("hidden");
        // Check if the grid for the new device type is empty and load default layout if needed
        if (
          grids[currentDeviceType] &&
          grids[currentDeviceType].engine.nodes.length === 0
        ) {
          console.log(
            `Loading default layout for ${currentDeviceType} as it was empty.`
          );
          loadDefaultLayout(currentDeviceType);
        } else {
          // Potentially trigger layout adjustments or reloads if necessary for the new grid
          // Example: grids[currentDeviceType]?.engine.updateEngine();
        }
      }

      previousDeviceType = currentDeviceType;
    }
  });
});

// Add some basic styling for editing mode (optional)
const style = document.createElement("style");
style.textContent = `
  .grid-container.editing-mode {
    border: 2px dashed var(--color-primary);
    padding: 1rem; /* Add padding to make the border visible */
  }
`;
document.head.appendChild(style);

// Add event listener for the logout button
const logoutButton = document.getElementById("logout-button");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/user/logout", {
        method: "POST",
      });
      if (response.ok) {
        // Redirect to login page after successful logout
        window.location.href = "/login";
      } else {
        console.error("Logout failed:", await response.text());
        alert("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      alert("An error occurred during logout. Please try again.");
    }
  });
}
