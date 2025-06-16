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

        return { html, widgetId };
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
        mainContainer.innerHTML = '';

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
        }

        const deviceType = this.detectDeviceType();
        document
            .getElementById(`grid-${deviceType}`)
            .classList.remove('hidden');
        return;
    }
}
