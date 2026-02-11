const chartElement = document.getElementById('absencesTrendChart');

// Function to get cumulative absence percentages for the last 30 days
function getDailyAbsencePercentages(days = 30) {
    const now = new Date();

    // Find earliest date in timetable data to use as start of school period
    let startOfPeriod = new Date(now.getFullYear(), 0, 1); // Default to Jan 1st
    if (analyser.timetableData && analyser.timetableData.length > 0) {
        const sortedTimetable = [...analyser.timetableData].sort(
            (a, b) => a.date - b.date
        );
        let firstDate = sortedTimetable[0].date.toString();
        startOfPeriod = new Date(
            `${firstDate.slice(0, 4)}-${firstDate.slice(
                4,
                6
            )}-${firstDate.slice(6, 8)}`
        );
    }

    const startOfYear = startOfPeriod;
    const dailyData = {};

    // Initialize all days in the range with 0 values
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dailyData[dateKey] = {
            cumulativeAbsences: 0,
            cumulativeLessons: 0,
            percentage: 0,
        };
    }

    // Count cumulative absences from start of year up to each date
    if (analyser.absencesData) {
        Object.keys(dailyData).forEach((dateKey) => {
            const targetDate = new Date(dateKey);

            // Count all absences from start of year up to this date
            const absencesUpToDate = analyser.absencesData.filter((absence) => {
                const absenceDate = new Date(absence.date);
                return absenceDate >= startOfYear && absenceDate <= targetDate;
            });

            dailyData[dateKey].cumulativeAbsences = absencesUpToDate.length;
        });
    }

    // Count cumulative lessons from start of year up to each date
    if (analyser.timetableData) {
        Object.keys(dailyData).forEach((dateKey) => {
            const targetDate = new Date(dateKey);

            // Count all lessons from start of year up to this date
            const lessonsUpToDate = analyser.timetableData.filter((lesson) => {
                let lessonDate = lesson.date.toString();
                const formattedDate = `${lessonDate.slice(
                    0,
                    4
                )}-${lessonDate.slice(4, 6)}-${lessonDate.slice(6, 8)}`;
                const lessonDateObj = new Date(formattedDate);
                return (
                    lessonDateObj >= startOfYear && lessonDateObj <= targetDate
                );
            });

            dailyData[dateKey].cumulativeLessons = lessonsUpToDate.length;
        });
    }

    console.log(dailyData);

    // Calculate cumulative percentages
    Object.keys(dailyData).forEach((dateKey) => {
        const data = dailyData[dateKey];
        if (data.cumulativeLessons > 0) {
            data.percentage =
                (data.cumulativeAbsences / data.cumulativeLessons) * 100;
        }
    });

    return dailyData;
}

// Function to format date labels
function formatDateLabel(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

// Get the data
const dailyAbsenceData = getDailyAbsencePercentages(30);

// Prepare data for Chartist line chart
const chartData = {
    labels: Object.keys(dailyAbsenceData).map((date) => formatDateLabel(date)),
    series: [Object.values(dailyAbsenceData).map((data) => data.percentage)],
};

// Chart options for line chart
const chartOptions = {
    ...window.globalChartOptions,
    low: 0,
    high:
        Math.max(
            ...Object.values(dailyAbsenceData).map((data) => data.percentage)
        ) * 1.2 || 100,
    axisY: {
        onlyInteger: false,
        offset: 50,
        labelInterpolationFnc: function (value) {
            return value.toFixed(1) + '%';
        },
    },
    axisX: {
        labelInterpolationFnc: function (value, index, labels) {
            // Show every 5th label to avoid crowding
            return index % 5 === 0 ? value : null;
        },
    },
    chartPadding: {
        top: 20,
        right: 20,
        bottom: 30,
        left: 60,
    },
    plugins: [],
    // Responsive options
    responsive: {
        '(max-width: 768px)': {
            chartPadding: {
                top: 15,
                right: 15,
                bottom: 25,
                left: 45,
            },
            axisX: {
                labelInterpolationFnc: function (value, index, labels) {
                    // Show every 7th label on mobile
                    return index % 7 === 0 ? value : null;
                },
            },
        },
    },
};

// Create the line chart
const chart = new window.chartist.LineChart(
    '#absencesTrendChart',
    chartData,
    chartOptions
);

// Style the chart
chart.on('draw', function (context) {
    if (context.type === 'line') {
        // Style the line
        context.element.attr({
            style: 'stroke: rgb(248, 113, 113); stroke-width: 3px; fill: none;',
        });
    } else if (context.type === 'point') {
        // Style the points
        context.element.attr({
            style: 'stroke: rgb(248, 113, 113); stroke-width: 4px; fill: rgb(255, 255, 255);',
        });

        // Add hover effect
        context.element._node.addEventListener('mouseenter', function () {
            this.style.fill = 'rgb(248, 113, 113)';
            this.style.transform = 'scale(1.2)';
        });

        context.element._node.addEventListener('mouseleave', function () {
            this.style.fill = 'rgb(255, 255, 255)';
            this.style.transform = 'scale(1)';
        });
    } else if (context.type === 'area') {
        // Add gradient fill under the line
        context.element.attr({
            style: 'fill: rgba(248, 113, 113, 0.1); fill-opacity: 0.8;',
        });
    }
});

// Add responsive behavior
chart.on('created', function () {
    // Chart is created, add any additional styling if needed
    const chartContainer = document.getElementById('absencesTrendChart');
    if (chartContainer) {
        // Add a subtle animation
        chartContainer.style.opacity = '0';
        setTimeout(() => {
            chartContainer.style.transition = 'opacity 0.5s ease-in';
            chartContainer.style.opacity = '1';
        }, 100);
    }
});
