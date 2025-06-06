// Built with Bun at 2025-06-05T10:39:13.543Z
// public/dashboard/js/index.js
var previousDeviceType;
var analyser = new annalyser;
var absencesData = [];
var timetableData = [];
async function fetchDashboardData(noCache = false) {
  try {
    const skeletonLoader = document.getElementById("skeletonLoader");
    if (skeletonLoader) {
      skeletonLoader.style.display = "grid";
    }
    const cacheParam = noCache ? "?noCache=true" : "";
    const absencesResponse = await fetch(`/api/untis/absences/all${cacheParam}`);
    const absencesJson = await absencesResponse.json();
    absencesData = analyser.processAbsencesData(absencesJson);
    const timetableResponse = await fetch(`/api/untis/timetable/year${cacheParam}`);
    const timetableJson = await timetableResponse.json();
    timetableData = timetableJson;
    loadDashboardConfig();
    return;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    alert("Failed to load absence data. Please try refreshing the page.");
    const skeletonLoader = document.getElementById("skeletonLoader");
    if (skeletonLoader) {
      skeletonLoader.style.display = "none";
    }
  }
}
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
document.addEventListener("DOMContentLoaded", async () => {
  applyTheme(currentTheme);
  await fetchDashboardData();
  initGrids();
  previousDeviceType = detectDeviceType();
  loadDashboardConfig();
  loadDefaultLayout(previousDeviceType);
  const editButton = document.getElementById("editToggle");
  if (editButton) {
    editButton.addEventListener("click", () => {
      const currentDeviceType = detectDeviceType();
      const grid = grids[currentDeviceType];
      if (grid) {
        const isStatic = grid.opts.staticGrid;
        grid.setStatic(!isStatic);
        editButton.firstElementChild.classList.toggle("hidden");
        editButton.lastElementChild.classList.toggle("hidden");
        const gridElement = document.getElementById(`grid-${currentDeviceType}`);
        if (gridElement) {
          gridElement.classList.toggle("editing-mode", isStatic);
        }
      }
    });
  }
  window.addEventListener("resize", () => {
    const currentDeviceType = detectDeviceType();
    if (currentDeviceType !== previousDeviceType) {
      console.log(`Device changed from ${previousDeviceType} to ${currentDeviceType}`);
      const previousGrid = document.getElementById(`grid-${previousDeviceType}`);
      const currentGrid = document.getElementById(`grid-${currentDeviceType}`);
      if (previousGrid) {
        previousGrid.classList.add("hidden");
      }
      if (currentGrid) {
        currentGrid.classList.remove("hidden");
        if (grids[currentDeviceType] && grids[currentDeviceType].engine.nodes.length === 0) {
          console.log(`Loading default layout for ${currentDeviceType} as it was empty.`);
          loadDefaultLayout(currentDeviceType);
        } else {
        }
      }
      previousDeviceType = currentDeviceType;
    }
  });
});
var style = document.createElement("style");
style.textContent = `
  .grid-container.editing-mode {
    border: 2px dashed var(--color-primary);
    padding: 1rem; /* Add padding to make the border visible */
  }
`;
document.head.appendChild(style);
var logoutButton = document.getElementById("logout-button");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/user/logout", {
        method: "POST"
      });
      if (response.ok) {
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
var reloadDataBtn = document.getElementById("reloadDataBtn");
if (reloadDataBtn) {
  reloadDataBtn.addEventListener("click", async () => {
    try {
      reloadDataBtn.disabled = true;
      const originalText2 = reloadDataBtn.innerHTML;
      reloadDataBtn.innerHTML = `
                <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Reloading...</span>
            `;
      console.log("\uD83D\uDD04 Reloading dashboard data (bypassing cache)...");
      await fetchDashboardData(true);
      if (window.grid) {
        const widgetElements = document.querySelectorAll(".grid-stack-item-content");
        widgetElements.forEach(async (element) => {
          const widgetId = element.getAttribute("data-widget-id");
          if (widgetId && window.widgets && window.widgets[widgetId]) {
            try {
              await window.widgets[widgetId].render(element, {
                absencesData,
                timetableData
              });
            } catch (error) {
              console.error(`Error refreshing widget ${widgetId}:`, error);
            }
          }
        });
      }
      console.log("✅ Dashboard data reloaded successfully");
      reloadDataBtn.classList.remove("bg-emerald-500", "hover:bg-emerald-600");
      reloadDataBtn.classList.add("bg-green-500");
      reloadDataBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Reloaded!</span>
            `;
      setTimeout(() => {
        reloadDataBtn.disabled = false;
        reloadDataBtn.classList.remove("bg-green-500");
        reloadDataBtn.classList.add("bg-emerald-500", "hover:bg-emerald-600");
        reloadDataBtn.innerHTML = originalText2;
      }, 2000);
    } catch (error) {
      console.error("Error reloading data:", error);
      reloadDataBtn.classList.remove("bg-emerald-500", "hover:bg-emerald-600");
      reloadDataBtn.classList.add("bg-red-500");
      reloadDataBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>Error</span>
            `;
      setTimeout(() => {
        reloadDataBtn.disabled = false;
        reloadDataBtn.classList.remove("bg-red-500");
        reloadDataBtn.classList.add("bg-emerald-500", "hover:bg-emerald-600");
        reloadDataBtn.innerHTML = originalText;
      }, 3000);
      alert("Failed to reload data. Please try again.");
    }
  });
}
