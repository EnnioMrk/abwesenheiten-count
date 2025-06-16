//let currentDevice = "desktop"; // Default to desktop view

// Create a DashboardGrid instance
const dashboardGrid = new DashboardGrid();

let widgets = [];
let widgetsLoaded = false;
let previousDeviceType; // Variable to track the previous device type

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
        absencesData = analyser.processAbsencesData(absencesJson);

        // Fetch timetable data for the year
        const timetableResponse = await fetch(
            `/api/untis/timetable/year${cacheParam}`
        );
        const timetableJson = await timetableResponse.json();
        analyser.timetableData = timetableJson;
        timetableData = timetableJson;

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
    const totalLessons = timetableData.length;
    absenceStats.textContent = `${totalAbsences} absences out of ${totalLessons} total lessons`;

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

    dashboardGrid.loadDefaultLayout(previousDeviceType); // Load layout for the initial device

    //updateDashboardLayout();

    // Fetch dashboard data and update layout
    //fetchDashboardData();

    // Add event listener for the edit button
    const editButton = document.getElementById('editToggle');
    if (editButton) {
        editButton.addEventListener('click', () => {
            const currentDeviceType = dashboardGrid.detectDeviceType();
            const grid = dashboardGrid.grids[currentDeviceType];
            if (grid) {
                const isStatic = grid.opts.staticGrid; // Corrected property access
                grid.setStatic(!isStatic);
                editButton.firstElementChild.classList.toggle('hidden');
                editButton.lastElementChild.classList.toggle('hidden');
                // Optionally add visual cues for edit mode, e.g., changing button color or adding a border to the grid
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
    window.addEventListener('resize', () => {
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
                // Check if the grid for the new device type is empty and load default layout if needed
                if (
                    dashboardGrid.grids[currentDeviceType] &&
                    dashboardGrid.grids[currentDeviceType].engine.nodes
                        .length === 0
                ) {
                    console.log(
                        `Loading default layout for ${currentDeviceType} as it was empty.`
                    );
                    dashboardGrid.loadDefaultLayout(currentDeviceType);
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
