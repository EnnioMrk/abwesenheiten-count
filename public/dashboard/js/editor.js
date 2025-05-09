// Dashboard Editor JavaScript

// Global variables
let grids = {};
let selectedWidgets = new Set();
let currentDevice = "desktop";
let gridSettings = {
  float: false,
};

// Available widgets definition
let response = await fetch("/widgets/config");
const availableWidgets = await response.json();

let widgetCheckboxes = [];

// Populate widget list
populateWidgetList();

// Initialize GridStack for each device type
initGrids();

// Set up device tab switching
setupDeviceTabs();

// Set up action buttons
setupActionButtons();

// Load saved widget selections
loadWidgetSelections();

// Set up settings modal
function setupSettingsModal() {
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsBtn = document.getElementById("close-settings");
  const applySettingsBtn = document.getElementById("apply-settings");
  const floatToggle = document.getElementById("float-toggle");

  // Initialize toggle state based on current settings
  floatToggle.checked = gridSettings.float;

  // Close settings modal
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });

  // Apply settings
  applySettingsBtn.addEventListener("click", () => {
    // Update settings
    gridSettings.float = floatToggle.checked;

    // Apply settings to all grids
    for (const deviceType in grids) {
      grids[deviceType].setFloat(gridSettings.float);
    }

    // Save settings
    saveGridState();

    // Close modal
    settingsModal.classList.add("hidden");
  });
}

// Create widget list items
function populateWidgetList() {
  const widgetListContainer = document.getElementById("widget-list");

  availableWidgets.forEach((widget) => {
    const widgetItem = document.createElement("div");
    widgetItem.className = "widget-item p-3 border rounded-lg hover:bg-gray-50";

    widgetItem.innerHTML = `
            <div class="flex items-center">
                <input type="checkbox" id="widget-${widget.id}" class="mr-3 h-5 w-5 text-blue-600" data-widget-id="${widget.id}">
                <div>
                    <h3 class="font-medium">${widget.name}</h3>
                    <p class="text-sm text-gray-500">${widget.description}</p>
                </div>
            </div>
        `;

    widgetListContainer.appendChild(widgetItem);

    // Add event listener to checkbox
    const checkbox = widgetItem.querySelector(`#widget-${widget.id}`);

    if (!checkbox) return;

    widgetCheckboxes.push(checkbox);

    checkbox.addEventListener("change", (e) => {
      toggleWidgetSelection(widget.id, e.target.checked);
    });
  });
}

// Initialize GridStack instances for each device type
function initGrids() {
  const deviceTypes = ["desktop", "mobile"];
  const columnConfigs = {
    desktop: 2,
    mobile: 1,
  };

  // Load grid settings if they exist
  const savedSettings = localStorage.getItem("grid-settings");
  if (savedSettings) {
    try {
      gridSettings = JSON.parse(savedSettings);
    } catch (error) {
      console.error("Error loading saved grid settings:", error);
    }
  }

  deviceTypes.forEach((deviceType) => {
    const gridElement = document.getElementById(`${deviceType}-grid`);
    if (!gridElement) return;

    grids[deviceType] = GridStack.init(
      {
        column: columnConfigs[deviceType],
        margin: "auto",
        minWidth: 300,
        disableOneColumnMode: true,
        float: gridSettings.float,
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
      },
      gridElement
    );

    // Add resize event handler for validation
    grids[deviceType].on("resize", function (event, el) {
      const widgetId = el.getAttribute("gs-id");
      const widget = availableWidgets.find((w) => w.id === widgetId);

      if (widget && widget.minArea) {
        const newH = parseInt(el.getAttribute("gs-h")) || 1;
        const newW = parseInt(el.getAttribute("gs-w")) || 1;
        const newArea = newH * newW;

        if (newArea < widget.minArea) {
          // Prevent the resize by reverting to previous dimensions
          grids[deviceType].update(el, {
            h: parseInt(el.getAttribute("gs-h-prev")) || widget.defaults.size.h,
            w: parseInt(el.getAttribute("gs-w-prev")) || widget.defaults.size.w,
          });
          return false;
        }
      }
    });

    // Load saved layout if it exists
    const savedLayout = localStorage.getItem(`grid-${deviceType}`);
    if (savedLayout) {
      try {
        const layout = JSON.parse(savedLayout);

        if (deviceType === "desktop")
          widgetCheckboxes.forEach((checkbox) => {
            console.log(checkbox.id.slice(7));
            checkbox.checked = selectedWidgets.has(checkbox.id.slice(7));
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

    // Add change event listener
    grids[deviceType].on("change", () => {
      saveGridState();
    });

    // Force a resize after initialization
    setTimeout(() => {
      grids[deviceType].compact();
    }, 100);
  });
}

// Load default layout for a device type
function loadDefaultLayout(deviceType) {
  //remove all current widgets for the device
  grids[deviceType].removeAll();

  widgetCheckboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  availableWidgets.forEach((item) => {
    let checkbox = widgetCheckboxes.find((checkbox) => {
      return checkbox.id.slice(7) === item.id;
    });
    if (!checkbox) return;
    checkbox.checked = true;
  });

  const layout = availableWidgets.map((item) => ({
    w: item.defaults[deviceType].w,
    h: item.defaults[deviceType].h,
    x: item.defaults[deviceType].x || 0,
    y: item.defaults[deviceType].y || 0,
    id: item.id,
    content: createWidgetContent(
      availableWidgets.find((w) => w.id === item.id)
    ),
  }));

  grids[deviceType].load(layout);
}

// Set up device tab switching
function setupDeviceTabs() {
  const deviceTabs = {
    "desktop-tab": "desktop",
    "mobile-tab": "mobile",
  };

  for (const tabId in deviceTabs) {
    const tab = document.getElementById(tabId);
    const deviceType = deviceTabs[tabId];

    tab.addEventListener("click", () => {
      // Update active tab
      document
        .querySelectorAll(".device-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Show corresponding grid
      document
        .querySelectorAll(".grid-stack")
        .forEach((grid) => grid.classList.add("hidden"));
      document.getElementById(`${deviceType}-grid`).classList.remove("hidden");

      //update checkboxes
      widgetCheckboxes.forEach((checkbox) => {
        checkbox.checked = selectedWidgets.has(checkbox.id.slice(7));
      });

      // Update current device
      currentDevice = deviceType;
    });
  }
}

// Set up action buttons
function setupActionButtons() {
  // Reset layout button
  document.getElementById("reset-layout").addEventListener("click", () => {
    if (confirm("Are you sure you want to reset the layout to default?")) {
      loadDefaultLayout(currentDevice);
    }
  });

  // Save layout button
  document.getElementById("save-layout").addEventListener("click", () => {
    saveGridState();
    alert("Layout saved successfully!");
  });

  // Settings button
  document.getElementById("settings-btn").addEventListener("click", () => {
    document.getElementById("settings-modal").classList.remove("hidden");
  });
}

// Toggle widget selection
function toggleWidgetSelection(widgetId, isSelected) {
  const widget = availableWidgets.find((w) => w.id === widgetId);
  if (!widget) return;

  if (isSelected) {
    selectedWidgets.add(widgetId);

    // Add widget to each grid
    for (const deviceType in grids) {
      const grid = grids[deviceType];

      console.log(widget);

      // Find default position for this device or use widget default

      grid.addWidget({
        id: widgetId,
        x: 0,
        y: 0,
        w: widget.defaults.size.w,
        h: widget.defaults.size.h,
        content: createWidgetContent(widget),
      });
    }
  } else {
    selectedWidgets.delete(widgetId);

    // Remove widget from each grid
    for (const deviceType in grids) {
      const grid = grids[deviceType];
      const element = grid.el.querySelector(
        `.grid-stack-item[gs-id="${widgetId}"]`
      );
      if (element) {
        grid.removeWidget(element);
      }
    }
  }

  saveGridState();
}

// Create widget content HTML
function createWidgetContent(widget) {
  return `
        <div class="h-full flex flex-col">
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-medium">${widget.name}</h3>
                <div class="cursor-move">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </div>
            </div>
            <div class="flex-grow bg-gray-100 rounded-md p-2 flex items-center justify-center">
                <p class="text-gray-500 text-sm">Widget: ${widget.id}</p>
            </div>
        </div>
    `;
}

// Save grid state to localStorage
function saveGridState() {
  console.log("Saving grid state...");
  // Save layout for each device type
  for (const deviceType in grids) {
    const grid = grids[deviceType];
    let serializedData = grid.save();
    serializedData = serializedData.map(({ content, id, x, y, w, h }) => {
      return {
        id,
        content,
        x,
        y,
        w: w || 1,
        h: h || 1,
      };
    });
    console.log(serializedData);
    localStorage.setItem(`grid-${deviceType}`, JSON.stringify(serializedData));
  }

  // Save selected widgets
  localStorage.setItem(
    "selected-widgets",
    JSON.stringify(Array.from(selectedWidgets))
  );

  // Save grid settings
  localStorage.setItem("grid-settings", JSON.stringify(gridSettings));

  // Save dashboard configuration
  const dashboardConfig = {
    layouts: {
      desktop: JSON.parse(localStorage.getItem("grid-desktop") || "[]").map(
        ({ content, ...o }) => o
      ),
      mobile: JSON.parse(localStorage.getItem("grid-mobile") || "[]").map(
        ({ content, ...o }) => o
      ),
    },
    selectedWidgets: Array.from(selectedWidgets),
    settings: gridSettings,
  };

  localStorage.setItem("dashboard-config", JSON.stringify(dashboardConfig));
}

// Load widget selections from localStorage
function loadWidgetSelections() {
  const savedWidgets = localStorage.getItem("selected-widgets");

  if (savedWidgets) {
    try {
      const widgetIds = JSON.parse(savedWidgets);

      // Check each widget checkbox
      widgetIds.forEach((widgetId) => {
        const checkbox = document.querySelector(`#widget-${widgetId}`);
        if (checkbox) {
          checkbox.checked = true;
          selectedWidgets.add(widgetId);
        }
      });
    } catch (error) {
      console.error("Error loading saved widget selections:", error);
    }
  }
}
