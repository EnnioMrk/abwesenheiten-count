// Built with Bun at 2025-06-05T10:39:13.543Z
// public/dashboard/js/grid.js
var grids = {};
var selectedWidgets = new Set;
var currentDevice = "desktop";
var dashboardConfig;
var deviceBreakpoints = {
  mobile: 768,
  desktop: 1024
};
var gridSettings = {
  float: false
};
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
function getLayoutForCurrentDevice() {
  if (!dashboardConfig || !dashboardConfig.layouts) {
    return null;
  }
  currentDevice = detectDeviceType();
  return dashboardConfig.layouts[currentDevice];
}
function detectDeviceType() {
  const width = window.innerWidth;
  if (width <= deviceBreakpoints.mobile) {
    return "mobile";
  } else {
    return "desktop";
  }
}
async function getDefaultLayout(deviceType2) {
  const res = await fetch("/api/dashboard/layouts");
  const data = await res.json();
  return data.default[deviceType2];
}
async function createWidget(widgetId2) {
  console.log(`Fetching widget ${widgetId2}`);
  const result = await fetch(`/widgets/${widgetId2}`);
  if (!result.ok) {
    console.error(`Failed to fetch widget ${widgetId2}`);
    return null;
  }
  const { html, js } = await result.json();
  widgetId2 = widgetId2.split("-").map((e) => e[0]?.toUpperCase() + e.slice(1)).join("");
  const script = document.createElement("script");
  script.textContent = `window.onLoad${widgetId2} = async ()=>{
${js}
}`;
  document.body.appendChild(script);
  return { html, widgetId: widgetId2 };
}
async function loadDefaultLayout(deviceType) {
  const defaultLayout = await getDefaultLayout(deviceType);
  console.log(defaultLayout);
  if (!defaultLayout) {
    alert("No default layout found");
    return;
  }
  let widgetIds = [];
  for (item of defaultLayout) {
    const widget = await createWidget(item.id);
    if (widget) {
      item.content = widget.html;
      widgetIds.push(widget.widgetId);
    }
  }
  grids[deviceType].load(defaultLayout);
  for (let widgetId of widgetIds) {
    eval(`window.onLoad${widgetId}()`);
  }
}
async function updateDashboardLayout() {
  deviceType = detectDeviceType();
  const savedLayout = localStorage.getItem(`grid-${deviceType}`);
  if (savedLayout) {
    try {
      const layout = JSON.parse(savedLayout);
      console.log(layout);
      layout.forEach((item2) => {
        item2.content = "test";
      });
      grids[deviceType].load(layout);
    } catch (error) {
      console.error(`Error loading saved layout for ${deviceType}:`, error);
      loadDefaultLayout(deviceType);
    }
  } else {
    loadDefaultLayout(deviceType);
  }
}
function initGrids() {
  const mainContainer = document.querySelector("main.container");
  mainContainer.innerHTML = "";
  for (let deviceType3 of ["mobile", "desktop"]) {
    const gridElement = document.createElement("div");
    gridElement.id = `grid-${deviceType3}`;
    gridElement.className = "hidden grid-container relative grid gap-4";
    mainContainer.appendChild(gridElement);
    let currentDeviceCols = deviceType3 == "mobile" ? 1 : 2;
    let gridConfig = {
      column: currentDeviceCols,
      margin: "2rem",
      cellHeight: "400px",
      minWidth: 300,
      disableOneColumnMode: true,
      float: gridSettings.float,
      staticGrid: true,
      animate: true,
      draggable: {
        handle: ".grid-stack-item-content",
        scroll: true,
        scrollSensitivity: 20,
        scrollSpeed: 10
      },
      resizable: {
        handles: "all",
        autoHide: true
      },
      minRow: 1
    };
    console.log(gridConfig);
    grids[deviceType3] = GridStack.init(gridConfig, gridElement);
  }
  const deviceType2 = detectDeviceType();
  document.getElementById(`grid-${deviceType2}`).classList.remove("hidden");
  return;
}
