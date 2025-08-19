//let currentDevice = "desktop"; // Default to desktop view

// Create a DashboardGrid instance
const dashboardGrid = new DashboardGrid();

let widgets = [];
let widgetsLoaded = false;
let previousDeviceType; // Variable to track the previous device type
let availableWidgets = []; // Available widgets for selection
let isEditMode = false; // Track edit mode state

const analyser = new annalyser();

// Initialize dashboard data
let absencesData = [];
let timetableData = [];

// Function to fetch all data needed for the dashboard
async function fetchDashboardData(noCache = false) {
    try {
        // Show skeleton loader
        const skeletonLoader = document.getElementById('skeletonLoader');
        if (skeletonLoader) {
            skeletonLoader.style.display = 'grid';
        }

        // Add noCache parameter to API calls if requested
        const cacheParam = noCache ? '?noCache=true' : '';

        // Fetch absences data
        const absencesResponse = await fetch(
            `/api/untis/absences/all${cacheParam}`
        );
        const absencesJson = await absencesResponse.json();

        console.log(absencesJson);
        absencesData = analyser.processAbsencesData(absencesJson);

        // Fetch timetable data for the year
        const timetableResponse = await fetch(
            `/api/untis/timetable/year${cacheParam}`
        );
        const timetableJson = await timetableResponse.json();
        analyser.timetableData = timetableJson;
        timetableData = timetableJson;
        console.log(timetableData);

        // Load dashboard configuration
        dashboardGrid.loadDashboardConfig();

        // Update absence percentage bar only if data was successfully loaded
        if (absencesData && timetableData) {
            updateAbsencePercentageBar();
        }

        // Update the dashboard based on config
        //await dashboardGrid.updateDashboardLayout();
        return;
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Show error notification
        alert('Failed to load absence data. Please try refreshing the page.');
        const skeletonLoader = document.getElementById('skeletonLoader');
        if (skeletonLoader) {
            skeletonLoader.style.display = 'none';
        }
    }
}

// Function to update the absence percentage bar
function updateAbsencePercentageBar() {
    // Check if data is available
    if (
        !absencesData ||
        !timetableData ||
        absencesData.length === undefined ||
        timetableData.length === undefined
    ) {
        console.warn('Absence or timetable data not available yet');
        return;
    }

    const absencePercentage = analyser.getTotalAbsencePercentage();
    const severity = analyser.getAbsenceSeverity(absencePercentage);

    // Get DOM elements
    const barContainer = document.getElementById('absencePercentageBar');
    const percentageText = document.getElementById('absencePercentageText');
    const percentageFill = document.getElementById('absencePercentageFill');
    const absenceStats = document.getElementById('absenceStats');
    const severityText = document.getElementById('absenceSeverityText');

    if (
        !barContainer ||
        !percentageText ||
        !percentageFill ||
        !absenceStats ||
        !severityText
    ) {
        console.error('Absence percentage bar elements not found');
        return;
    }

    // Update text content
    percentageText.textContent = `${absencePercentage}%`;
    percentageText.style.color = severity.color;

    // Update stats
    const totalAbsences = absencesData.length;
    const realLessons = timetableData.filter(
        (e) => e.code != 'cancelled'
    ).length;
    absenceStats.textContent = `${totalAbsences} absences out of ${realLessons} total lessons`;

    // Update severity text
    severityText.textContent =
        severity.level.charAt(0).toUpperCase() + severity.level.slice(1);
    severityText.style.color = severity.color;

    // Update progress bar - simple and clean
    percentageFill.style.width = `${Math.min(absencePercentage, 100)}%`;
    percentageFill.style.backgroundColor = severity.color;

    // Show the bar with simple fade-in
    barContainer.style.display = 'block';
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
document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme or default
    applyTheme(currentTheme);

    await fetchDashboardData();

    dashboardGrid.initGrids(); // Initializes both grids, hides them, then shows the correct one

    // Store the initial device type
    previousDeviceType = dashboardGrid.detectDeviceType();

    dashboardGrid.loadDashboardConfig();

    // Load saved layout if available, otherwise load default layout
    await dashboardGrid.loadSavedLayout(previousDeviceType);

    // Initialize available widgets
    loadAvailableWidgets();

    // Initialize the dashboard
    updateAbsencePercentageBar();

    // Add event listener for the edit button
    const editButton = document.getElementById('editToggle');
    if (editButton) {
        editButton.addEventListener('click', () => {
            // Toggle edit mode
            toggleEditMode();

            // Toggle grid static state
            const currentDeviceType = dashboardGrid.detectDeviceType();
            const grid = dashboardGrid.grids[currentDeviceType];
            if (grid) {
                const isStatic = grid.opts.staticGrid;
                dashboardGrid.trigger('editMode', isStatic);
                grid.setStatic(!isStatic);

                // If we're setting the grid to static (exiting edit mode), save the layout
                if (!isStatic) {
                    console.log('Grid set to static, saving layout...');
                    dashboardGrid.saveDashboardConfig();
                }

                editButton.firstElementChild.classList.toggle('hidden');
                editButton.lastElementChild.classList.toggle('hidden');

                // Add visual cues for edit mode
                const gridElement = document.getElementById(
                    `grid-${currentDeviceType}`
                );
                if (gridElement) {
                    gridElement.classList.toggle('editing-mode', isStatic);
                }
            }
        });
    }

    // Add resize event listener
    window.addEventListener('resize', async () => {
        const currentDeviceType = dashboardGrid.detectDeviceType();
        if (currentDeviceType !== previousDeviceType) {
            console.log(
                `Device changed from ${previousDeviceType} to ${currentDeviceType}`
            );
            const previousGrid = document.getElementById(
                `grid-${previousDeviceType}`
            );
            const currentGrid = document.getElementById(
                `grid-${currentDeviceType}`
            );

            if (previousGrid) {
                previousGrid.classList.add('hidden');
            }
            if (currentGrid) {
                currentGrid.classList.remove('hidden');

                // Re-setup drag and drop if in edit mode
                if (isEditMode) {
                    removeGridDropZone(); // Remove from previous device
                    setupGridDropZone(); // Setup for current device
                }

                // Check if the grid for the new device type is empty and load layout if needed
                if (
                    dashboardGrid.grids[currentDeviceType] &&
                    dashboardGrid.grids[currentDeviceType].engine.nodes
                        .length === 0
                ) {
                    console.log(
                        `Loading layout for ${currentDeviceType} as it was empty.`
                    );
                    // Use loadSavedLayout which will load saved layout or fall back to default
                    await dashboardGrid.loadSavedLayout(currentDeviceType);
                } else {
                    // Potentially trigger layout adjustments or reloads if necessary for the new grid
                    // Example: dashboardGrid.grids[currentDeviceType]?.engine.updateEngine();
                }
            }

            previousDeviceType = currentDeviceType;
        }
    });
});

// Add some basic styling for editing mode (optional)
const style = document.createElement('style');
style.textContent = `
  .grid-container.editing-mode {
    border: 2px dashed var(--color-primary);
    padding: 1rem; /* Add padding to make the border visible */
  }
`;
document.head.appendChild(style);

// Add event listener for the logout button
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/user/logout', {
                method: 'POST',
            });
            if (response.ok) {
                // Redirect to login page after successful logout
                window.location.href = '/login';
            } else {
                console.error('Logout failed:', await response.text());
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            alert('An error occurred during logout. Please try again.');
        }
    });
}

// Add event listener for the reload data button
const reloadDataBtn = document.getElementById('reloadDataBtn');
if (reloadDataBtn) {
    reloadDataBtn.addEventListener('click', async () => {
        try {
            // Disable button and show loading state
            reloadDataBtn.disabled = true;
            const originalText = reloadDataBtn.innerHTML;
            reloadDataBtn.innerHTML = `
                <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Reloading...</span>
            `;

            console.log('🔄 Reloading dashboard data (bypassing cache)...');

            // Fetch fresh data without cache
            await fetchDashboardData(true);

            // Update absence percentage bar with fresh data only if data is available
            if (absencesData && timetableData) {
                updateAbsencePercentageBar();
            }

            // Refresh all widgets with new data
            if (window.grid) {
                // Get all widget elements and refresh them
                const widgetElements = document.querySelectorAll(
                    '.grid-stack-item-content'
                );
                widgetElements.forEach(async (element) => {
                    const widgetId = element.getAttribute('data-widget-id');
                    if (
                        widgetId &&
                        window.widgets &&
                        window.widgets[widgetId]
                    ) {
                        try {
                            // Re-render the widget with fresh data
                            await window.widgets[widgetId].render(element, {
                                absencesData,
                                timetableData,
                            });
                        } catch (error) {
                            console.error(
                                `Error refreshing widget ${widgetId}:`,
                                error
                            );
                        }
                    }
                });
            }

            console.log('✅ Dashboard data reloaded successfully');

            // Show success feedback
            reloadDataBtn.classList.remove(
                'bg-emerald-500',
                'hover:bg-emerald-600'
            );
            reloadDataBtn.classList.add('bg-green-500');
            reloadDataBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Reloaded!</span>
            `;

            // Reset button after 2 seconds
            setTimeout(() => {
                reloadDataBtn.disabled = false;
                reloadDataBtn.classList.remove('bg-green-500');
                reloadDataBtn.classList.add(
                    'bg-emerald-500',
                    'hover:bg-emerald-600'
                );
                reloadDataBtn.innerHTML = originalText;
            }, 2000);
        } catch (error) {
            console.error('Error reloading data:', error);

            // Show error state
            reloadDataBtn.classList.remove(
                'bg-emerald-500',
                'hover:bg-emerald-600'
            );
            reloadDataBtn.classList.add('bg-red-500');
            reloadDataBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>Error</span>
            `;

            // Reset button after 3 seconds
            setTimeout(() => {
                reloadDataBtn.disabled = false;
                reloadDataBtn.classList.remove('bg-red-500');
                reloadDataBtn.classList.add(
                    'bg-emerald-500',
                    'hover:bg-emerald-600'
                );
                reloadDataBtn.innerHTML = originalText;
            }, 3000);

            alert('Failed to reload data. Please try again.');
        }
    });
}

// Function to load available widgets for selection
async function loadAvailableWidgets() {
    console.log('Loading available widgets...');
    try {
        // Fetch available widgets from the API
        const response = await fetch('/api/dashboard/widgets');
        const data = await response.json();

        if (data.success) {
            availableWidgets = data.widgets;
            console.log(
                `✅ Loaded ${availableWidgets.length} widgets from database`
            );
        } else {
            console.error('❌ Failed to load widgets:', data.error);
        }

        renderWidgetSelector();
    } catch (error) {
        console.error('❌ Error loading available widgets:', error);
    }
}

// Function to render the widget selector
function renderWidgetSelector() {
    console.log(
        'Rendering widget selector with available widgets:',
        availableWidgets
    );
    const container = document.getElementById('availableWidgets');
    const loading = document.getElementById('widgetSelectorLoading');

    if (!container) {
        console.error('Available widgets container not found');
        return;
    }

    if (loading) {
        loading.classList.add('hidden');
    }
    container.innerHTML = '';

    availableWidgets.forEach((widget) => {
        // Check how many instances of this widget are currently on the dashboard
        const currentDevice = dashboardGrid.detectDeviceType();
        const grid = dashboardGrid.grids[currentDevice];
        const instanceCount = grid
            ? grid.engine.nodes.filter(
                  (node) => node.id && node.id.startsWith(widget.id + '-')
              ).length
            : 0;

        const MAX_WIDGET_INSTANCES = 3;
        const isMaxReached = instanceCount >= MAX_WIDGET_INSTANCES;

        const widgetElement = document.createElement('div');
        widgetElement.className = `widget-item ${
            isMaxReached ? 'widget-item-disabled' : ''
        }`;
        widgetElement.draggable = !isMaxReached;
        widgetElement.dataset.widgetId = widget.id;

        const instanceText =
            instanceCount > 0
                ? ` (${instanceCount}/${MAX_WIDGET_INSTANCES})`
                : '';
        const statusBadge = isMaxReached
            ? '<span class="widget-status-badge">Max reached</span>'
            : '';

        widgetElement.innerHTML = `
            <div class="widget-item-icon">${widget.icon}</div>
            <div class="widget-item-title">${widget.name}${instanceText}</div>
            <div class="widget-item-description">${widget.description}</div>
            ${statusBadge}
        `;

        // Add drag event listeners only if not at max capacity
        if (!isMaxReached) {
            widgetElement.addEventListener('dragstart', handleWidgetDragStart);
            widgetElement.addEventListener('dragend', handleWidgetDragEnd);

            // Add click event for all devices
            widgetElement.addEventListener('click', () => {
                addWidgetToGrid(widget.id);
            });

            // Add keyboard support for accessibility
            widgetElement.setAttribute('tabindex', '0');
            widgetElement.setAttribute('role', 'button');
            widgetElement.setAttribute(
                'aria-label',
                `Add ${widget.title} widget`
            );

            widgetElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addWidgetToGrid(widget.id);
                }
            });
        } else {
            // Add disabled styling and tooltip
            widgetElement.setAttribute(
                'title',
                `Maximum of ${MAX_WIDGET_INSTANCES} ${widget.name} widgets allowed`
            );
            widgetElement.setAttribute('aria-disabled', 'true');
        }

        container.appendChild(widgetElement);
    });

    // Setup search functionality
    setupWidgetSearch();
}

// Function to setup search functionality
function setupWidgetSearch() {
    console.log('Setting up widget search functionality');
    const searchInput = document.getElementById('widgetSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        filterWidgets(searchTerm);
    });
}

// Function to filter widgets based on search term
function filterWidgets(searchTerm) {
    console.log('Filtering widgets with search term:', searchTerm);
    const container = document.getElementById('availableWidgets');
    const emptyState = document.getElementById('widgetSelectorEmpty');

    if (!container) {
        console.error('Available widgets container not found');
        return;
    }

    const widgetItems = container.querySelectorAll('.widget-item');

    let visibleCount = 0;

    widgetItems.forEach((item) => {
        const titleElement = item.querySelector('.widget-item-title');
        const descriptionElement = item.querySelector(
            '.widget-item-description'
        );

        if (!titleElement || !descriptionElement) {
            return;
        }

        const title = titleElement.textContent.toLowerCase();
        const description = descriptionElement.textContent.toLowerCase();

        const matches =
            title.includes(searchTerm) || description.includes(searchTerm);

        if (matches) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // Show/hide empty state
    if (emptyState) {
        if (visibleCount === 0 && searchTerm !== '') {
            emptyState.classList.remove('hidden');
            container.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            container.classList.remove('hidden');
        }
    }
}

// Function to handle widget drag start
function handleWidgetDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.widgetId);
    e.target.classList.add('dragging');

    // Add visual feedback to grid containers
    const currentDevice = dashboardGrid.detectDeviceType();
    const gridElement = document.getElementById(`grid-${currentDevice}`);
    if (gridElement) {
        gridElement.classList.add('drag-over');

        // Add drop zone hint
        const hint = document.createElement('div');
        hint.className = 'drop-zone-hint';
        hint.textContent = 'Drop widget here';
        gridElement.appendChild(hint);
    }
}

// Function to handle widget drag end
function handleWidgetDragEnd(e) {
    e.target.classList.remove('dragging');

    // Remove visual feedback from grid containers
    const currentDevice = dashboardGrid.detectDeviceType();
    const gridElement = document.getElementById(`grid-${currentDevice}`);
    if (gridElement) {
        gridElement.classList.remove('drag-over');

        // Remove drop zone hint
        const hint = gridElement.querySelector('.drop-zone-hint');
        if (hint) {
            hint.remove();
        }
    }
}

// Function to refresh widget selector counts
function refreshWidgetSelector() {
    if (isEditMode && availableWidgets.length > 0) {
        renderWidgetSelector();
    }
}

// Function to add widget to grid
async function addWidgetToGrid(widgetId) {
    console.log('Adding widget to grid:', widgetId);
    try {
        const currentDevice = dashboardGrid.detectDeviceType();
        const grid = dashboardGrid.grids[currentDevice];

        if (!grid) {
            console.error('Grid not found for device:', currentDevice);
            return;
        }

        // Check how many instances of this widget type already exist (max 3 allowed)
        const existingWidgetCount = grid.engine.nodes.filter(
            (node) => node.id && node.id.startsWith(widgetId + '-')
        ).length;

        const MAX_WIDGET_INSTANCES = 3;
        if (existingWidgetCount >= MAX_WIDGET_INSTANCES) {
            const widgetTitle =
                availableWidgets.find((w) => w.id === widgetId)?.title ||
                widgetId;
            showNotification(
                `Maximum of ${MAX_WIDGET_INSTANCES} ${widgetTitle} widgets allowed on dashboard.`,
                'error'
            );
            return;
        }

        // Create widget content
        const widget = await dashboardGrid.createWidget(widgetId);
        if (!widget) {
            console.error('Failed to create widget:', widgetId);
            showNotification(
                'Failed to create widget. Please try again.',
                'error'
            );
            return;
        }

        widgetDimensions = availableWidgets.find(
            (w) => w.id === widgetId
        )?.defaults;

        const currentDeviceType = dashboardGrid.detectDeviceType();
        widgetDimensions = widgetDimensions[currentDeviceType] || {
            w: 2,
            h: 2,
        }; // Fallback to default dimensions

        // Add widget to grid with a unique ID (in case of multiple instances)
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const uniqueId = `${widgetId}-${timestamp}-${randomId}`;
        const gridItem = {
            id: uniqueId,
            content: widget.html,
            w: widgetDimensions.w,
            h: widgetDimensions.h,
            x: 0, // Start at left edge
            y: 0, // Add at the top
        };

        grid.addWidget(gridItem);

        // Execute widget initialization code
        if (widget.widgetId && window[`onLoad${widget.widgetId}`]) {
            window[`onLoad${widget.widgetId}`]();
        }

        // If in edit mode, make sure the remove button is visible for the new widget
        if (isEditMode) {
            // Find the newly added widget and show its remove button
            setTimeout(() => {
                const newWidget = document.querySelector(
                    `[gs-id="${uniqueId}"]`
                );
                if (newWidget) {
                    const removeButton =
                        newWidget.querySelector('.widget-remove-btn');
                    if (removeButton) {
                        removeButton.style.display = 'flex';
                    }
                }
            }, 100);
        }

        // Show success feedback with instance count
        const widgetTitle =
            availableWidgets.find((w) => w.id === widgetId)?.title || widgetId;
        const instanceNumber = existingWidgetCount + 1;
        showNotification(
            `${widgetTitle} widget #${instanceNumber} added successfully!`,
            'success'
        );

        // Refresh widget selector to update instance counts
        refreshWidgetSelector();
    } catch (error) {
        console.error('Error adding widget to grid:', error);
        showNotification('Failed to add widget. Please try again.', 'error');
    }
}

// Function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
        type === 'success'
            ? 'bg-green-500 text-white'
            : type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Function to toggle edit mode
function toggleEditMode() {
    console.log('toggleEditMode called');
    console.log('Document ready state:', document.readyState);
    console.log('DOM available:', !!document.getElementById);

    isEditMode = !isEditMode;
    console.log('isEditMode:', isEditMode);

    const widgetSelector = document.getElementById('widgetSelector');
    console.log('widgetSelector found:', !!widgetSelector);

    // Check if widget selector exists
    if (!widgetSelector) {
        console.error('Widget selector element not found');
        console.log(
            'Available elements with widget in ID:',
            Array.from(document.querySelectorAll('[id*="widget"]')).map(
                (el) => el.id
            )
        );
        return;
    }

    if (isEditMode) {
        console.log('Entering edit mode');
        // Show widget selector
        widgetSelector.classList.remove('hidden');
        widgetSelector.classList.add('show');

        // Load available widgets if not already loaded
        if (availableWidgets.length === 0) {
            console.log('Loading available widgets');
            loadAvailableWidgets();
        } else {
            // Refresh widget selector to update instance counts
            renderWidgetSelector();
        }

        // Enable drag and drop on grid
        setupGridDropZone();

        // Show remove buttons on all widgets
        showRemoveButtons();
    } else {
        console.log('Exiting edit mode');

        // Save dashboard layout before exiting edit mode
        console.log('Saving dashboard layout...');
        dashboardGrid.saveDashboardConfig();

        // Hide widget selector
        widgetSelector.classList.add('hidden');
        widgetSelector.classList.remove('show');

        // Disable drag and drop on grid
        removeGridDropZone();

        // Hide remove buttons on all widgets
        hideRemoveButtons();

        // Show success notification
        if (typeof showNotification === 'function') {
            showNotification('Dashboard layout saved successfully!', 'success');
        }
    }
}

// Function to setup drag and drop on grid
function setupGridDropZone() {
    console.log('Setting up grid drop zone');
    const currentDevice = dashboardGrid.detectDeviceType();
    const gridElement = document.getElementById(`grid-${currentDevice}`);

    if (!gridElement) return;

    gridElement.addEventListener('dragover', handleGridDragOver);
    gridElement.addEventListener('drop', handleGridDrop);
}

// Function to remove drag and drop from grid
function removeGridDropZone() {
    console.log('Removing grid drop zone');
    const currentDevice = dashboardGrid.detectDeviceType();
    const gridElement = document.getElementById(`grid-${currentDevice}`);

    if (!gridElement) return;

    gridElement.removeEventListener('dragover', handleGridDragOver);
    gridElement.removeEventListener('drop', handleGridDrop);
}

// Function to handle grid drag over
function handleGridDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

// Function to handle grid drop
function handleGridDrop(e) {
    e.preventDefault();
    const widgetId = e.dataTransfer.getData('text/plain');
    if (widgetId) {
        addWidgetToGrid(widgetId);
    }
}

// Function to show remove buttons on all widgets
function showRemoveButtons() {
    const removeButtons = document.querySelectorAll('.widget-remove-btn');
    removeButtons.forEach((button) => {
        button.style.display = 'flex';
    });
}

// Function to hide remove buttons on all widgets
function hideRemoveButtons() {
    const removeButtons = document.querySelectorAll('.widget-remove-btn');
    removeButtons.forEach((button) => {
        button.style.display = 'none';
    });
}
