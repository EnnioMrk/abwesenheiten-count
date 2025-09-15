// Create widget instance with scoped functionality
(function () {
    const widgetElement = document.currentScript.closest(
        '[data-widget="last-x-days"]'
    );
    const chartElement = widgetElement.querySelector('.x-days-chart');
    const titleElement = widgetElement.querySelector('.x-days-title');
    const timespanSelector = widgetElement.querySelector(
        '.x-days-timespan-selector'
    );

    let currentTimespan = 7;
    let chart;

    function updateChart(days) {
        currentTimespan = days;
        const data = analyser.getRecentSubjectAbsences(days);

        // Update title
        titleElement.textContent = `Last ${days} Days`;

        // Prepare data for Chartist
        const chartData = {
            labels: Object.keys(data),
            series: [Object.values(data)],
        };

        // Chart options
        const chartOptions = {
            ...window.globalChartOptions,
            high: Math.max(...Object.values(data)) * 1.1, // Add some padding to the top
            plugins: [window.pluginDynamicBarWidth(Object.values(data).length)],
        };

        // Update or create the chart
        if (chart) {
            chart.update(chartData, chartOptions);
        } else {
            createChart(data, chartData, chartOptions);
        }
    }

    function createChart(data, chartData, chartOptions) {
        // Create the chart
        chart = new window.chartist.BarChart(
            chartElement,
            chartData,
            chartOptions
        );

        // Add click event handler
        chart.on('draw', function (chartData) {
            if (chartData.type === 'bar') {
                chartData.element._node.addEventListener('click', function () {
                    const index = chartData.index;
                    const subject = Object.keys(data)[index];
                    updateMonthlyTrends(subject);
                });
            }
        });

        // Add responsive behavior
        chart.on('created', function () {
            // Chart is created, add any additional styling if needed
        });
    }

    // Initialize chart with default timespan
    const initialData = analyser.getRecentSubjectAbsences(currentTimespan);
    const initialChartData = {
        labels: Object.keys(initialData),
        series: [Object.values(initialData)],
    };
    const initialChartOptions = {
        ...window.globalChartOptions,
        high: Math.max(...Object.values(initialData)) * 1.1,
        plugins: [
            window.pluginDynamicBarWidth(Object.values(initialData).length),
        ],
    };

    createChart(initialData, initialChartData, initialChartOptions);

    // Add dropdown change event listener
    timespanSelector.addEventListener('change', function () {
        const selectedDays = parseInt(this.value);
        updateChart(selectedDays);
    });

    // Handle edit mode
    dashboardGrid.on('editMode', (isEditMode) => {
        if (isEditMode) {
            timespanSelector.classList.remove('hidden');
            timespanSelector.value = currentTimespan.toString();
        } else {
            timespanSelector.classList.add('hidden');
        }
    });
})();
