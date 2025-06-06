const chartElement = document.getElementById('allTimeChart');
const data = analyser.getAbsencesBySubject();

// Prepare data for Chartist
const chartData = {
    labels: Object.keys(analyser.formatSubjectNames(data)),
    series: [Object.values(data)],
};
// Chart options
const chartOptions = {
    ...window.globalChartOptions,
    high: Math.max(...Object.values(data)) * 1.1, // Add some padding to the top
    plugins: [window.pluginDynamicBarWidth(Object.values(data).length)],
};

// Create the chart
const chart = new window.chartist.BarChart(
    '#allTimeChart',
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
