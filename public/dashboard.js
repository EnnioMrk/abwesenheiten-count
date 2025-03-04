let rawData;
let charts = {
  sevenDays: null,
  fourteenDays: null,
  month: null,
  allTime: null,
  type: null,
  overallTrends: null,
};

async function loadDashboard() {
  try {
    // Destroy existing charts
    Object.values(charts).forEach((chart) => {
      if (chart) {
        chart.destroy();
        chart = null;
      }
    });

    // Reset charts object
    charts = {
      sevenDays: null,
      fourteenDays: null,
      month: null,
      allTime: null,
      type: null,
      overallTrends: null,
    };

    const response = await fetch("/api/data/absences");
    rawData = await response.json();

    // Process the data for different time periods
    const data = {
      sevenDays: getRecentSubjectAbsences(rawData, 7),
      fourteenDays: getRecentSubjectAbsences(rawData, 14),
      month: getRecentSubjectAbsences(rawData, 30),
      allTime: getAllSubjectAbsences(rawData),
      overallTrends: getAllAbsencesByMonth(rawData),
    };

    createCharts(data);
    createOverallTrendsChart(data.overallTrends);
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

function createCharts(data) {
  // Calculate totals
  const sevenDaysTotal = Object.values(data.sevenDays).reduce(
    (a, b) => a + b,
    0
  );
  const fourteenDaysTotal = Object.values(data.fourteenDays).reduce(
    (a, b) => a + b,
    0
  );
  const monthTotal = Object.values(data.month).reduce((a, b) => a + b, 0);
  const allTimeTotal = Object.values(data.allTime).reduce((a, b) => a + b, 0);

  // Update titles with totals
  document.getElementById(
    "sevenDaysTitle"
  ).textContent = `Last 7 Days (${sevenDaysTotal})`;
  document.getElementById(
    "fourteenDaysTitle"
  ).textContent = `Last 14 Days (${fourteenDaysTotal})`;
  document.getElementById(
    "monthTitle"
  ).textContent = `Last Month (${monthTotal})`;
  document.getElementById(
    "allTimeTitle"
  ).textContent = `All Time (${allTimeTotal})`;

  // Create charts for different time periods
  charts.sevenDays = createTimeChart(
    "sevenDaysChart",
    data.sevenDays,
    `Last 7 Days (${sevenDaysTotal})`
  );
  charts.fourteenDays = createTimeChart(
    "fourteenDaysChart",
    data.fourteenDays,
    `Last 14 Days (${fourteenDaysTotal})`
  );
  charts.month = createTimeChart(
    "monthChart",
    data.month,
    `Last Month (${monthTotal})`
  );
  charts.allTime = createTimeChart(
    "allTimeChart",
    data.allTime,
    `All Time (${allTimeTotal})`
  );

  // Absence Types Chart
  const typeCtx = document.getElementById("typeChart").getContext("2d");

  let excusedAbscencesNum = rawData.absenceTimes.reduce((acc, curr) => {
    if (curr.excused) return acc + 1;
    else return acc;
  }, 0);

  // Update type title with totals
  document.getElementById(
    "typeTitle"
  ).textContent = `Absence Types (${rawData.absenceTimes.length})`;

  charts.type = new Chart(typeCtx, {
    type: "pie",
    data: {
      labels: ["Entschuldigt", "Unentschuldigt"],
      datasets: [
        {
          data: [
            excusedAbscencesNum,
            rawData.absenceTimes.length - excusedAbscencesNum,
          ],
          backgroundColor: [
            "rgba(99, 102, 241, 0.5)",
            "rgba(248, 113, 113, 0.5)",
          ],
          borderColor: ["rgb(99, 102, 241)", "rgb(248, 113, 113)"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 20,
          bottom: 20,
        },
      },
      scales: {
        y: { beginAtZero: true },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
      },
    },
  });
}

let selectedSubject = null;
let monthlyTrendsChart = null;

function createTimeChart(canvasId, data, label) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          label: label,
          data: Object.values(data),
          backgroundColor: "rgba(99, 102, 241, 0.5)",
          borderColor: "rgb(99, 102, 241)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 20,
          bottom: 20,
        },
      },
      plugins: {
        legend: {
          position: "bottom",
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const subject = Object.keys(data)[index];
          updateMonthlyTrends(subject);
        }
      },
    },
  });
}

function updateMonthlyTrends(subject) {
  console.log(`Updating monthly trends for ${subject}`);
  selectedSubject = subject;
  const monthlyData = getSubjectAbsencesByMonth(rawData, subject);

  // Convert month numbers to names
  const monthNames = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
  };

  const formattedLabels = Object.keys(monthlyData).map((yearMonth) => {
    const [year, month] = yearMonth.split("-");
    return `${monthNames[month]} ${year}`;
  });

  if (monthlyTrendsChart) {
    monthlyTrendsChart.destroy();
  }

  const ctx = document.getElementById("monthlyTrendsChart").getContext("2d");
  monthlyTrendsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: formattedLabels,
      datasets: [
        {
          label: `${subject} Monthly Trends`,
          data: Object.values(monthlyData),
          borderColor: "rgb(99, 102, 241)",
          tension: 0.1,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 20,
          bottom: 40,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: false,
            font: {
              size: 11,
            },
          },
        },
      },
    },
  });
}

function createOverallTrendsChart(monthlyData) {
  const monthNames = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
  };

  const formattedLabels = Object.keys(monthlyData).map((yearMonth) => {
    const [year, month] = yearMonth.split("-");
    return `${monthNames[month]} ${year}`;
  });

  const total = Object.values(monthlyData).reduce((a, b) => a + b, 0);
  document.getElementById(
    "overallTrendsTitle"
  ).textContent = `Overall Monthly Trends (${total})`;

  const ctx = document.getElementById("overallTrendsChart").getContext("2d");
  charts.overallTrends = new Chart(ctx, {
    type: "line",
    data: {
      labels: formattedLabels,
      datasets: [
        {
          label: "Total Absences",
          data: Object.values(monthlyData),
          borderColor: "rgb(99, 102, 241)",
          tension: 0.1,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 20,
          bottom: 40,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: false,
            font: {
              size: 11,
            },
          },
        },
      },
    },
  });
}

// Initialize drag and drop functionality
const chartsGrid = document.getElementById("chartsGrid");
let draggedElement = null;
let draggedOverElement = null;

// Add drag and drop event listeners to all chart containers
chartsGrid.querySelectorAll(".bg-white").forEach((container) => {
  container.addEventListener("dragstart", (e) => {
    draggedElement = container;
    container.style.opacity = "0.5";
    e.dataTransfer.effectAllowed = "move";
  });

  container.addEventListener("dragend", () => {
    draggedElement.style.opacity = "1";
    draggedElement = null;
    draggedOverElement = null;
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    draggedOverElement = container;
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    if (draggedElement !== container) {
      const allContainers = [...chartsGrid.querySelectorAll(".bg-white")];
      const draggedIndex = allContainers.indexOf(draggedElement);
      const droppedIndex = allContainers.indexOf(container);

      if (draggedIndex < droppedIndex) {
        container.parentNode.insertBefore(
          draggedElement,
          container.nextSibling
        );
      } else {
        container.parentNode.insertBefore(draggedElement, container);
      }
    }
  });
});

// Load dashboard when the page loads
loadDashboard();
