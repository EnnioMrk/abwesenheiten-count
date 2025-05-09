let grids = {};
let selectedWidgets = new Set();
let currentDevice = "desktop";
let dashboardConfig;
const deviceBreakpoints = {
  mobile: 768, // Small devices like phones
  desktop: 1024, // Medium devices like tablets
  //desktop: 1920, // Large devices like desktops and desktops
};
let gridSettings = {
  float: false,
};

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

// Get layout for current device
function getLayoutForCurrentDevice() {
  if (!dashboardConfig || !dashboardConfig.layouts) {
    return null;
  }

  // Detect device type
  currentDevice = detectDeviceType();

  // Return layout for current device
  return dashboardConfig.layouts[currentDevice];
}

// Detect current device type based on screen width
function detectDeviceType() {
  const width = window.innerWidth;
  if (width <= deviceBreakpoints.mobile) {
    return "mobile";
  } else {
    return "desktop";
  }
}

async function getDefaultLayout(deviceType) {
  const res = await fetch("/api/dashboard/layouts");
  const data = await res.json();
  return data.default[deviceType];
}

async function createWidget(widgetId) {
  console.log(`Fetching widget ${widgetId}`);
  const result = await fetch(`/widgets/${widgetId}`);
  if (!result.ok) {
    console.error(`Failed to fetch widget ${widgetId}`);
    return null;
  }
  const { html, js } = await result.json();

  widgetId = widgetId
    .split("-")
    .map((e) => e[0]?.toUpperCase() + e.slice(1))
    .join("");

  const script = document.createElement("script");
  script.textContent = `window.onLoad${widgetId} = async ()=>{\n${js}\n}`;
  document.body.appendChild(script);

  //eval(`window.onLoad${widgetId}()`);
  // Evaluate the JavaScript code

  return { html, widgetId };
}

async function loadDefaultLayout(deviceType) {
  const defaultLayout = await getDefaultLayout(deviceType);

  console.log(defaultLayout);

  if (!defaultLayout) {
    alert("No default layout found");
    return;
  }

  let widgetIds = [];

  //get content for each widget
  for (item of defaultLayout) {
    const widget = await createWidget(item.id);
    if (widget) {
      console.log(widget);
      item.content = widget.html;
      widgetIds.push(widget.widgetId);
    }
  }

  console.log(defaultLayout);

  grids[deviceType].load(defaultLayout);

  for (let widgetId of widgetIds) {
    eval(`window.onLoad${widgetId}()`);
  }
  // Create grid
}

async function updateDashboardLayout() {
  deviceType = detectDeviceType();
  const savedLayout = localStorage.getItem(`grid-${deviceType}`);
  if (savedLayout) {
    try {
      const layout = JSON.parse(savedLayout);

      console.log(layout);

      layout.forEach((item) => {
        item.content = "test";
      });

      grids[deviceType].load(layout);
    } catch (error) {
      console.error(`Error loading saved layout for ${deviceType}:`, error);
      // Load default layout if saved layout is invalid
      loadDefaultLayout(deviceType);
    }
  } else {
    // Load default layout if no saved layout exists
    loadDefaultLayout(deviceType);
  }
}

function initGrids() {
  const mainContainer = document.querySelector("main.container");
  mainContainer.innerHTML = "";

  for (let deviceType of ["mobile", "desktop"]) {
    const gridElement = document.createElement("div");
    gridElement.id = `grid-${deviceType}`;
    gridElement.className = "hidden grid-container relative grid gap-4";
    mainContainer.appendChild(gridElement);
    let currentDeviceCols = deviceType == "mobile" ? 1 : 2;

    let gridConfig = {
      column: currentDeviceCols,
      margin: "2rem",
      cellHeight: "400px",
      //sizeToContent: true,
      minWidth: 300,
      disableOneColumnMode: true,
      float: gridSettings.float,
      staticGrid: true, // Make grid static by default
      animate: true,
      draggable: {
        handle: ".grid-stack-item-content",
        scroll: true,
        scrollSensitivity: 20,
        scrollSpeed: 10,
      },
      resizable: {
        handles: "all",
        autoHide: true,
      },
      minRow: 1,
    };

    console.log(gridConfig);

    grids[deviceType] = GridStack.init(gridConfig, gridElement);
  }

  const deviceType = detectDeviceType();
  document.getElementById(`grid-${deviceType}`).classList.remove("hidden");
  return;
}
