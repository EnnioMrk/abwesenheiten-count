class DashboardGrid {
    constructor() {
        this.grids = {};
        this.selectedWidgets = new Set();
        this.currentDevice = 'desktop';
        this.dashboardConfig = null;
        this.deviceBreakpoints = {
            mobile: 768, // Small devices like phones
            desktop: 1024, // Medium devices like tablets
            //desktop: 1920, // Large devices like desktops and desktops
        };
        this.gridSettings = {
            float: false,
        };
        this.eventListeners = {};
    }

    // Load dashboard configuration from localStorage
    loadDashboardConfig() {
        const configJson = localStorage.getItem('dashboard-config');
        if (configJson) {
            try {
                this.dashboardConfig = JSON.parse(configJson);
                console.log(
                    'Dashboard configuration loaded:',
                    this.dashboardConfig
                );
            } catch (error) {
                console.error('Error parsing dashboard config:', error);
                this.dashboardConfig = null;
            }
        }
    }

    // Get layout for current device
    getLayoutForCurrentDevice() {
        if (!this.dashboardConfig || !this.dashboardConfig.layouts) {
            return null;
        }

        // Detect device type
        this.currentDevice = this.detectDeviceType();

        // Return layout for current device
        return this.dashboardConfig.layouts[this.currentDevice];
    }

    // Detect current device type based on screen width
    detectDeviceType() {
        const width = window.innerWidth;
        if (width <= this.deviceBreakpoints.mobile) {
            return 'mobile';
        } else {
            return 'desktop';
        }
    }

    async getDefaultLayout(deviceType) {
        const res = await fetch('/api/dashboard/layouts');
        const data = await res.json();
        return data.default[deviceType];
    }

    async createWidget(widgetId) {
        console.log(`Fetching widget ${widgetId}`);
        const result = await fetch(`/widgets/${widgetId}`);
        if (!result.ok) {
            console.error(`Failed to fetch widget ${widgetId}`);
            return null;
        }
        const { html, js } = await result.json();

        widgetId = widgetId
            .split('-')
            .map((e) => e[0]?.toUpperCase() + e.slice(1))
            .join('');

        const script = document.createElement('script');
        script.textContent = `window.onLoad${widgetId} = async ()=>{\n${js}\n}`;
        document.body.appendChild(script);

        //eval(`window.onLoad${widgetId}()`);
        // Evaluate the JavaScript code

        // Wrap widget HTML with container that includes remove button
        const wrappedHtml = `
            <div class="widget-wrapper relative h-full">
                <button class="widget-remove-btn absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 items-center justify-center text-xs font-bold transition-colors duration-200" 
                        onclick="dashboardGrid.removeWidget(this)"
                        title="Remove widget"
                        style="display: none;">
                    ×
                </button>
                ${html}
            </div>
        `;

        return { html: wrappedHtml, widgetId };
    }

    async loadDefaultLayout(deviceType) {
        const defaultLayout = await this.getDefaultLayout(deviceType);

        console.log(defaultLayout);

        if (!defaultLayout) {
            alert('No default layout found');
            return;
        }

        let widgetIds = [];

        //get content for each widget
        for (let item of defaultLayout) {
            const widget = await this.createWidget(item.id);
            if (widget) {
                item.content = widget.html;
                // Generate unique ID for each widget instance (same format as addWidgetToGrid)
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substr(2, 9);
                const uniqueId = `${item.id}-${timestamp}-${randomId}`;
                item.id = uniqueId;
                widgetIds.push(widget.widgetId);
            }
        }

        this.grids[deviceType].load(defaultLayout);

        for (let widgetId of widgetIds) {
            eval(`window.onLoad${widgetId}()`);
        }
        // Create grid
    }

    async updateDashboardLayout() {
        const deviceType = this.detectDeviceType();
        const savedLayout = localStorage.getItem(`grid-${deviceType}`);
        if (savedLayout) {
            try {
                const layout = JSON.parse(savedLayout);

                console.log(layout);

                layout.forEach((item) => {
                    item.content = 'test';
                });

                this.grids[deviceType].load(layout);
            } catch (error) {
                console.error(
                    `Error loading saved layout for ${deviceType}:`,
                    error
                );
                // Load default layout if saved layout is invalid
                this.loadDefaultLayout(deviceType);
            }
        } else {
            // Load default layout if no saved layout exists
            this.loadDefaultLayout(deviceType);
        }
    }

    initGrids() {
        const mainContainer = document.querySelector('main.container');

        // Remove existing grid containers only, preserve other elements like widgetSelector
        const existingGrids = mainContainer.querySelectorAll('[id^="grid-"]');
        existingGrids.forEach((grid) => grid.remove());
        mainContainer.querySelector('#skeletonLoader').remove();

        for (let deviceType of ['mobile', 'desktop']) {
            const gridElement = document.createElement('div');
            gridElement.id = `grid-${deviceType}`;
            gridElement.className = 'hidden grid-container relative grid gap-4';
            mainContainer.appendChild(gridElement);
            let currentDeviceCols = deviceType == 'mobile' ? 1 : 2;

            let gridConfig = {
                column: currentDeviceCols,
                margin: '2rem',
                cellHeight: '400px',
                //sizeToContent: true,
                minWidth: 300,
                disableOneColumnMode: true,
                float: this.gridSettings.float,
                staticGrid: true, // Make grid static by default
                animate: true,
                draggable: {
                    handle: '.grid-stack-item-content',
                    scroll: true,
                    scrollSensitivity: 20,
                    scrollSpeed: 10,
                },
                resizable: {
                    handles: 'all',
                    autoHide: true,
                },
                minRow: 1,
            };

            console.log(gridConfig);

            this.grids[deviceType] = GridStack.init(gridConfig, gridElement);

            // Add event listeners to save layout on changes
            this.grids[deviceType].on(
                'added removed change',
                (event, items) => {
                    // Only save if the grid is not static (i.e., in edit mode)
                    if (!this.grids[deviceType].opts.staticGrid) {
                        console.log(
                            `Grid ${deviceType} changed, saving layout...`
                        );
                        this.saveDashboardConfig();
                    }
                }
            );
        }

        const deviceType = this.detectDeviceType();
        document
            .getElementById(`grid-${deviceType}`)
            .classList.remove('hidden');
        return;
    }

    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    trigger(event, ...args) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach((callback) => {
                callback(...args);
            });
        }
    }

    // Save dashboard configuration to localStorage
    saveDashboardConfig() {
        try {
            if (!this.dashboardConfig) {
                this.dashboardConfig = {
                    layouts: {},
                    selectedWidgets: Array.from(this.selectedWidgets),
                };
            }

            // Update layouts for all devices
            Object.keys(this.grids).forEach((deviceType) => {
                const grid = this.grids[deviceType];
                if (grid) {
                    this.dashboardConfig.layouts[deviceType] =
                        this.getGridLayout(grid);
                }
            });

            // Update selected widgets
            this.dashboardConfig.selectedWidgets = Array.from(
                this.selectedWidgets
            );

            // Save to localStorage
            localStorage.setItem(
                'dashboard-config',
                JSON.stringify(this.dashboardConfig)
            );

            console.log('Dashboard configuration saved:', this.dashboardConfig);
        } catch (error) {
            console.error('Error saving dashboard config:', error);
        }
    }

    // Get current layout from a grid instance
    getGridLayout(grid) {
        try {
            // Use save() method to get the current layout, which is the standard GridStack way
            const layout = grid.save();
            return layout.map((item) => ({
                id: item.id || item.content, // Use id if available, fallback to content
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h,
                content: item.content,
            }));
        } catch (error) {
            console.error('Error getting grid layout:', error);
            return [];
        }
    }

    removeWidget(removeButton) {
        try {
            // Find the grid item element
            const gridItem = removeButton.closest('.grid-stack-item');
            if (!gridItem) {
                console.error('Could not find grid item for remove button');
                return;
            }

            // Get the current device type and grid
            const currentDevice = this.detectDeviceType();
            const grid = this.grids[currentDevice];

            if (!grid) {
                console.error('Grid not found for device:', currentDevice);
                return;
            }

            // Log for debugging
            console.log('Removing widget from grid:', gridItem);

            // Remove the widget from the grid
            grid.removeWidget(gridItem);

            // Save the updated layout
            this.saveDashboardConfig();

            // Show success notification
            if (typeof showNotification === 'function') {
                showNotification('Widget removed successfully!', 'success');
            }

            // Refresh widget selector to update instance counts
            if (typeof refreshWidgetSelector === 'function') {
                refreshWidgetSelector();
            }

            console.log('Widget removed successfully');
        } catch (error) {
            console.error('Error removing widget:', error);
            if (typeof showNotification === 'function') {
                showNotification(
                    'Failed to remove widget. Please try again.',
                    'error'
                );
            }
        }
    }

    async loadSavedLayout(deviceType) {
        // Check if we have a saved layout for this device type
        if (
            this.dashboardConfig &&
            this.dashboardConfig.layouts &&
            this.dashboardConfig.layouts[deviceType]
        ) {
            const savedLayout = this.dashboardConfig.layouts[deviceType];
            console.log(`Loading saved layout for ${deviceType}:`, savedLayout);

            let widgetIds = [];

            // Process each item in the saved layout to get widget content
            for (let item of savedLayout) {
                // Extract the original widget type from the unique ID
                const originalWidgetType = this.extractWidgetType(item.id);
                const widget = await this.createWidget(originalWidgetType);
                if (widget) {
                    item.content = widget.html;
                    // Keep the unique ID for GridStack tracking
                    widgetIds.push(widget.widgetId);
                }
            }

            this.grids[deviceType].load(savedLayout);

            for (let widgetId of widgetIds) {
                eval(`window.onLoad${widgetId}()`);
            }

            return true; // Successfully loaded saved layout
        } else {
            // No saved layout found, load default layout
            console.log(
                `No saved layout found for ${deviceType}, loading default layout`
            );
            await this.loadDefaultLayout(deviceType);
            return false; // Loaded default layout instead
        }
    }

    // Helper function to extract widget type from unique widget ID
    extractWidgetType(uniqueId) {
        // UniqueId format: "widget-type-timestamp-randomId"
        // We need to remove the timestamp and random parts to get the original widget type
        if (typeof uniqueId === 'string' && uniqueId.includes('-')) {
            const parts = uniqueId.split('-');
            // Remove the last two parts (timestamp and randomId) and rejoin
            if (parts.length > 2) {
                // Check if the last two parts are numeric/alphanumeric (timestamp and random)
                const lastPart = parts[parts.length - 1];
                const secondLastPart = parts[parts.length - 2];

                // If last part looks like random string and second last like timestamp
                if (
                    lastPart.match(/^[a-z0-9]+$/i) &&
                    secondLastPart.match(/^\d+$/)
                ) {
                    return parts.slice(0, -2).join('-');
                }
                // Fallback to removing just the last part (for backward compatibility)
                return parts.slice(0, -1).join('-');
            }
        }
        return uniqueId;
    }
}
