let absenceChart = null;

// Define the attendance warnings map
const attendanceWarnings = new Map([
    [
        10,
        {
            message: 'Fehlzeiten minimal - Fehlen unbedenklich',
            bgColor: 'bg-green-100',
            borderColor: 'border-green-400',
            textColor: 'text-green-700',
        },
    ],
    [
        9,
        {
            message: 'Fehlzeiten sehr gering - Fehlen in Ordnung',
            bgColor: 'bg-green-200',
            borderColor: 'border-green-500',
            textColor: 'text-green-800',
        },
    ],
    [
        8,
        {
            message: 'Fehlzeiten leicht - erhöhte Vorsicht',
            bgColor: 'bg-yellow-100',
            borderColor: 'border-yellow-400',
            textColor: 'text-yellow-700',
        },
    ],
    [
        7,
        {
            message: 'Fehlzeiten deutlich - Überdenken empfohlen',
            bgColor: 'bg-yellow-200',
            borderColor: 'border-yellow-500',
            textColor: 'text-yellow-800',
        },
    ],
    [
        6,
        {
            message: 'Fehlzeiten hoch - Fehlen nicht ratsam',
            bgColor: 'bg-orange-100',
            borderColor: 'border-orange-400',
            textColor: 'text-orange-700',
        },
    ],
    [
        5,
        {
            message: 'Fehlzeiten kritisch - Fehlen riskant',
            bgColor: 'bg-orange-200',
            borderColor: 'border-orange-500',
            textColor: 'text-orange-800',
        },
    ],
    [
        4,
        {
            message: 'Fehlzeiten extrem - sehr hohe Teilnahme notwendig',
            bgColor: 'bg-red-100',
            borderColor: 'border-red-400',
            textColor: 'text-red-700',
        },
    ],
    [
        3,
        {
            message: 'Fehlzeiten maximal - Teilnahme zwingend',
            bgColor: 'bg-red-200',
            borderColor: 'border-red-500',
            textColor: 'text-red-800',
        },
    ],
]);

document.addEventListener('DOMContentLoaded', () => {
    console.log('Recommender JS loaded');
    showLoadingState();
    fetchAbsenceData();
});

function showLoadingState() {
    const chartContainer = document.getElementById('recommenderChartContainer');
    const recommendationList = document.getElementById('recommendationText');

    // Add loading overlay to chart
    chartContainer.innerHTML = `
    <div class="loading-overlay absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
      <div class="flex flex-col items-center">
        <div class="loading-spinner w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
        <p class="mt-4 text-gray-600 font-medium">Loading chart data...</p>
        <div class="mt-2 w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="shimmer h-full w-full"></div>
        </div>
      </div>
    </div>
    <div class="ct-chart w-full h-[calc(100%-60px)]" id="recommenderChart"></div>
  `;

    // Add loading state to recommendations
    recommendationList.innerHTML = `
    <li class="skeleton-item p-4 rounded-lg">
      <div class="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div class="h-4 bg-gray-200 rounded w-1/2"></div>
    </li>
    <li class="skeleton-item p-4 rounded-lg">
      <div class="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
      <div class="h-4 bg-gray-200 rounded w-1/3"></div>
    </li>
    <li class="skeleton-item p-4 rounded-lg">
      <div class="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
      <div class="h-4 bg-gray-200 rounded w-2/3"></div>
    </li>
  `;
}

function showErrorState(message) {
    const chartContainer = document.getElementById('recommenderChartContainer');
    const recommendationList = document.getElementById('recommendationText');

    // Show error in chart container
    chartContainer.innerHTML = `
    <div class="loading-overlay absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
      <div class="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
        <div class="error-icon text-red-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
        <p class="text-gray-600">${message}</p>
        <button onclick="fetchAbsenceData()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
          Try Again
        </button>
      </div>
    </div>
  `;

    // Show error in recommendations
    recommendationList.innerHTML = `
    <li class="p-4 bg-red-50 rounded-lg border border-red-200">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error loading recommendations</h3>
          <p class="mt-1 text-sm text-red-700">${message}</p>
        </div>
      </div>
    </li>
  `;
}

async function fetchAbsenceData() {
    try {
        // Fetch raw absence data
        const absenceResponse = await fetch('/api/untis/absences/all');
        if (!absenceResponse.ok) {
            throw new Error(
                `HTTP error fetching absences! status: ${absenceResponse.status}`
            );
        }
        const rawAbsenceData = await absenceResponse.json();
        console.log('Raw absence data fetched:', rawAbsenceData);

        // Fetch lesson data
        const lessonResponse = await fetch('/api/untis/lessons/all');
        if (!lessonResponse.ok) {
            throw new Error(
                `HTTP error fetching lessons! status: ${lessonResponse.status}`
            );
        }
        const rawLessonData = await lessonResponse.json();
        console.log('Raw lesson data fetched:', rawLessonData);

        // Check if data is available
        if (
            rawAbsenceData &&
            Object.keys(rawAbsenceData).length > 0 &&
            rawLessonData
        ) {
            // Use the annalyser class for absences
            const analyser = new annalyser(rawAbsenceData);
            analyser.processAbsencesData(rawAbsenceData);
            const absenceCountsBySubject = analyser.getAbsencesBySubject();
            console.log('Processed absence counts:', absenceCountsBySubject);

            // Process lesson data
            const subjects = new Set();
            Object.keys(absenceCountsBySubject).forEach((subject) =>
                subjects.add(subject)
            );
            Object.keys(rawLessonData.total || {}).forEach((subject) =>
                subjects.add(subject)
            );
            Object.keys(rawLessonData.cancelled || {}).forEach((subject) =>
                subjects.add(subject)
            );

            const processedData = Array.from(subjects)
                .map((subject) => {
                    const totalLessons = rawLessonData.total?.[subject] || 0;
                    const cancelledLessons =
                        rawLessonData.cancelled?.[subject] || 0;
                    const realLessons = totalLessons - cancelledLessons;
                    const absences = absenceCountsBySubject[subject] || 0;
                    const validAbsences = Math.min(
                        absences,
                        realLessons > 0 ? realLessons : 0
                    );
                    const attendedLessons = realLessons - validAbsences;

                    return {
                        subject_name: analyser.formatSubjectName(subject),
                        total_lessons: totalLessons,
                        cancelled_lessons: cancelledLessons,
                        real_lessons: realLessons,
                        absences: validAbsences,
                        attended: attendedLessons > 0 ? attendedLessons : 0,
                    };
                })
                .filter((item) => item.total_lessons > 0);

            console.log('Combined processed data for chart:', processedData);

            if (processedData.length > 0) {
                renderChart(processedData);
                generateRecommendations(processedData);
            } else {
                showErrorState('No relevant subject data processed.');
            }
        } else {
            showErrorState('No absence or lesson data available.');
        }
    } catch (error) {
        console.error('Error fetching or processing data:', error);
        showErrorState(
            `Error loading data: ${error.message}. Please check API endpoints or network connection.`
        );
    }
}

// Helper function to clear the chart
function clearChart() {
    if (absenceChart) {
        absenceChart.detach();
        absenceChart = null;
    }
}

function renderChart(data) {
    const chartContainer = document.getElementById('recommenderChartContainer');

    // Clear any existing loading state
    const loadingOverlay = chartContainer.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }

    if (absenceChart) {
        clearChart();
    }

    // Sort data by absence percentage
    data.sort((a, b) => {
        const aAbsencePercentage = (a.absences / a.total_lessons) * 100 || 0;
        const bAbsencePercentage = (b.absences / b.total_lessons) * 100 || 0;
        return bAbsencePercentage - aAbsencePercentage;
    });

    // Prepare data for Chartist horizontal bar chart
    const labels = data.map((item) => item.subject_name);
    const absenceData = data.map((item) => item.absences);
    const attendedData = data.map((item) => item.attended);
    const cancelledData = data.map((item) => item.cancelled_lessons);

    // Create series for stacked horizontal bar chart
    const chartData = {
        labels: labels,
        series: [cancelledData, attendedData, absenceData],
    };

    // Chart options
    const chartOptions = {
        ...window.globalChartOptions,
        stackBars: true,
        horizontalBars: true,
        width: '100%',
        height: undefined, // Let it auto-calculate
        axisX: {
            onlyInteger: true,
            offset: 30,
        },
        axisY: {
            offset: 60, // Reduced from 100
        },
        reverseData: true,
        chartPadding: {
            top: 15,
            right: 20,
            bottom: 40,
            left: 10, // Significantly reduced from 100
        },
        // Responsive options
        responsive: {
            '(max-width: 768px)': {
                chartPadding: {
                    top: 10,
                    right: 15,
                    bottom: 35,
                    left: 5, // Reduced from 80
                },
                axisY: {
                    offset: 50, // Reduced from 70
                },
            },
        },
    };

    // Create the chart
    absenceChart = new window.chartist.BarChart(
        '#recommenderChart',
        chartData,
        chartOptions
    );

    // Style the chart series
    absenceChart.on('draw', function (context) {
        if (context.type === 'bar') {
            // Apply different colors for different series with borders
            if (context.seriesIndex === 0) {
                // Absences - modern coral red with darker border
                context.element.attr({
                    style: 'stroke: #ff6b6b; stroke-width: 30px; fill: none;',
                });
                // Add border by creating a slightly larger background bar
                context.element.parent().elem(
                    'line',
                    {
                        x1: context.x1,
                        x2: context.x2,
                        y1: context.y1,
                        y2: context.y2,
                        style: 'stroke: #e03131; stroke-width: 32px; opacity: 0.8;',
                    },
                    '',
                    true
                );
            } else if (context.seriesIndex === 1) {
                // Attended - vibrant teal with darker border
                context.element.attr({
                    style: 'stroke: #51cf66; stroke-width: 30px; fill: none;',
                });
                context.element.parent().elem(
                    'line',
                    {
                        x1: context.x1,
                        x2: context.x2,
                        y1: context.y1,
                        y2: context.y2,
                        style: 'stroke: #37b24d; stroke-width: 32px; opacity: 0.8;',
                    },
                    '',
                    true
                );
            } else if (context.seriesIndex === 2) {
                // Cancelled - subtle blue-gray with darker border
                context.element.attr({
                    style: 'stroke: #74c0fc; stroke-width: 30px; fill: none;',
                });
                context.element.parent().elem(
                    'line',
                    {
                        x1: context.x1,
                        x2: context.x2,
                        y1: context.y1,
                        y2: context.y2,
                        style: 'stroke: #339af0; stroke-width: 32px; opacity: 0.8;',
                    },
                    '',
                    true
                );
            }
        }
    });

    // Add responsive behavior
    absenceChart.on('created', function () {
        console.log('Horizontal stacked bar chart rendered with Chartist.');

        // Force full width by updating SVG dimensions and positioning
        const svgElement = document.querySelector('#recommenderChart svg');
        const container = document.getElementById('recommenderChart');
        if (svgElement && container) {
            svgElement.setAttribute('width', '100%');
            svgElement.setAttribute('height', '100%');
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';

            // Adjust the chart area to use full width
            const chartRect = svgElement.querySelector('.ct-chart-bar');
            if (chartRect) {
                chartRect.setAttribute('x', '0');
                chartRect.setAttribute('width', '100%');
            }
        }

        // Add legend manually since Chartist doesn't have built-in legend
        addLegend();
    });
}

function addLegend() {
    const chartContainer = document.getElementById('recommenderChartContainer');

    // Remove existing legend if any
    const existingLegend = chartContainer.querySelector('.chart-legend');
    if (existingLegend) {
        existingLegend.remove();
    }

    // Create legend positioned closer to chart
    const legend = document.createElement('div');
    legend.className =
        'chart-legend flex flex-wrap justify-center gap-4 mt-2 mb-2 text-sm';
    legend.innerHTML = `
        <div class="flex items-center">
            <div class="w-4 h-4 mr-2 rounded" style="background-color: #ff6b6b;"></div>
            <span>Absences</span>
        </div>
        <div class="flex items-center">
            <div class="w-4 h-4 mr-2 rounded" style="background-color: #51cf66;"></div>
            <span>Attended</span>
        </div>
        <div class="flex items-center">
            <div class="w-4 h-4 mr-2 rounded" style="background-color: #74c0fc;"></div>
            <span>Cancelled</span>
        </div>
    `;

    // Insert legend right after the chart
    const chartElement = chartContainer.querySelector('#recommenderChart');
    chartElement.parentNode.insertBefore(legend, chartElement.nextSibling);
}

// Function to find the best rational approximation for a value
function find_rational(value, maxdenom) {
    let best = { numerator: 1, denominator: 1, error: Math.abs(value - 1) };
    if (!maxdenom) maxdenom = 10000;
    for (
        let denominator = 1;
        best.error > 0 && denominator <= maxdenom;
        denominator++
    ) {
        let numerator = Math.round(value * denominator);
        let error = Math.abs(value - numerator / denominator);
        if (error >= best.error) continue;
        best.numerator = numerator;
        best.denominator = denominator;
        best.error = error;
    }
    return best;
}

// Function to generate recommendation messages based on absence data
function generateRecommendations(data) {
    const recommendationList = document.getElementById('recommendationText');
    recommendationList.innerHTML = ''; // Clear previous recommendations

    if (!data || data.length === 0) {
        recommendationList.innerHTML =
            '<li class="text-gray-500">No data available for recommendations.</li>';
        return;
    }

    // Sort data by absence percentage (highest first)
    data.sort((a, b) => {
        const percentageA =
            a.real_lessons > 0 ? (a.absences / a.real_lessons) * 100 : 0;
        const percentageB =
            b.real_lessons > 0 ? (b.absences / b.real_lessons) * 100 : 0;
        return percentageB - percentageA;
    });

    data.forEach((item) => {
        const percentage =
            item.real_lessons > 0 ? item.absences / item.real_lessons : 0;
        const attendanceScore = Math.max(0, 1 - percentage);
        //        let frac = find_rational((d.totalReal - d.absences) / d.totalReal, 10);
        let frac = find_rational(
            (item.real_lessons - item.absences) / item.real_lessons,
            10
        );
        if (frac.denominator - frac.numerator > 1) {
            frac.denominator = Math.round(
                frac.denominator / (frac.denominator - frac.numerator)
            );
            frac.numerator = frac.denominator - 1;
        }
        fracDem = frac.denominator - (frac.denominator - frac.numerator) + 1;

        if (frac.denominator - frac.numerator == 0) fracDem = 10;
        if (fracDem < 3) {
            fracDem = 3;
        } else if (fracDem > 10) {
            fracDem = 10;
        }

        const warning = attendanceWarnings.get(fracDem) || {
            message: 'Keine Daten',
            bgColor: 'bg-gray-100',
            borderColor: 'border-gray-400',
            textColor: 'text-gray-700',
        }; // Default fallback

        const listItem = document.createElement('li');
        listItem.className = `border ${warning.borderColor} ${warning.bgColor} ${warning.textColor} px-4 py-3 rounded relative mb-2`;

        // Format the message similar to the old version
        const percentageDisplay = (percentage * 100).toFixed(1);
        const rationalDisplay = `${frac.denominator - frac.numerator}/${
            frac.denominator
        }`;

        listItem.innerHTML = `
      <strong class="font-bold">${item.subject_name}:</strong>
      <span class="block sm:inline"> ${warning.message} <br><strong class="font-bold">${rationalDisplay}</strong> - ${percentageDisplay}% - ${item.absences} von ${item.real_lessons} Schulstunden</span>
    `;
        recommendationList.appendChild(listItem);
    });
}
