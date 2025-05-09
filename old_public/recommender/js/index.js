let rawData;
let recommenderChart = null;

const attendanceWarnings = new Map([
  [
    10,
    {
      message: "Fehlzeiten minimal - Fehlen unbedenklich",
      bgColor: "bg-green-100",
      borderColor: "border-green-400",
      textColor: "text-green-700",
    },
  ],
  [
    9,
    {
      message: "Fehlzeiten sehr gering - Fehlen in Ordnung",
      bgColor: "bg-green-200",
      borderColor: "border-green-500",
      textColor: "text-green-800",
    },
  ],
  [
    8,
    {
      message: "Fehlzeiten leicht - erhöhte Vorsicht",
      bgColor: "bg-yellow-100",
      borderColor: "border-yellow-400",
      textColor: "text-yellow-700",
    },
  ],
  [
    7,
    {
      message: "Fehlzeiten deutlich - Überdenken empfohlen",
      bgColor: "bg-yellow-200",
      borderColor: "border-yellow-500",
      textColor: "text-yellow-800",
    },
  ],
  [
    6,
    {
      message: "Fehlzeiten hoch - Fehlen nicht ratsam",
      bgColor: "bg-orange-100",
      borderColor: "border-orange-400",
      textColor: "text-orange-700",
    },
  ],
  [
    5,
    {
      message: "Fehlzeiten kritisch - Fehlen riskant",
      bgColor: "bg-orange-200",
      borderColor: "border-orange-500",
      textColor: "text-orange-800",
    },
  ],
  [
    4,
    {
      message: "Fehlzeiten extrem - sehr hohe Teilnahme notwendig",
      bgColor: "bg-red-100",
      borderColor: "border-red-400",
      textColor: "text-red-700",
    },
  ],
  [
    3,
    {
      message: "Fehlzeiten maximal - Teilnahme zwingend",
      bgColor: "bg-red-200",
      borderColor: "border-red-500",
      textColor: "text-red-800",
    },
  ],
]);

function getAbsenceReasonIds(data, names) {
  const reasonIds = {};
  data.forEach((r) => {
    if (names.includes(r.name)) {
      reasonIds[r.name] = r.id;
    }
  });
  return reasonIds;
}

function isRealAbsence(absence) {
  let includeIds = Object.values(
    getAbsenceReasonIds(absenceReasonsMap, window.absenceReasons)
  );
  if (window.excludeReasons.includes(absence?.text)) return false;
  if (includeIds.includes(absence?.absenceReasonId)) return true;
  return false;
}

async function loadRecommender() {
  try {
    // Destroy existing chart if it exists
    if (recommenderChart) {
      recommenderChart.destroy();
      recommenderChart = null;
    }

    // Fetch data
    const absenceResponse = await fetch("/api/data/absences");
    rawData = await absenceResponse.json();

    const lessonsResponse = await fetch("/api/data/lessons");
    const lessonsData = await lessonsResponse.json();

    // Filter data based on settings
    const filteredData = rawData.absenceTimes.filter((absence) =>
      isRealAbsence(absence)
    );

    createRecommenderChart(filteredData, lessonsData);
  } catch (error) {
    console.error("Error loading recommender:", error);
  }
}

// This function is called from settings.js when settings are saved
function loadDashboard() {
  loadRecommender();
}

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

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

function createRecommenderChart(absenceData, lessonsData) {
  const ctx = document.getElementById("recommenderChart").getContext("2d");

  // Create containers for progress bar and warnings
  const containers = ["progressContainer", "warningsContainer"];
  containers.forEach((containerId) => {
    if (
      document
        .getElementById("recommenderChart")
        .parentNode.querySelector(`#${containerId}`)
    ) {
      document
        .getElementById("recommenderChart")
        .parentNode.querySelector(`#${containerId}`)
        .remove();
    }
    const container = document.createElement("div");
    container.id = containerId;
    container.className = "mt-4 space-y-2";
    document
      .getElementById("recommenderChart")
      .parentNode.appendChild(container);
  });

  const warningsContainer = document.getElementById("warningsContainer");

  // Get all unique subjects from both absence and lesson data
  const subjects = new Set();

  // Add subjects from absence data
  absenceData.forEach((absence) => subjects.add(absence.subjectName));

  // Add subjects from lessons data
  Object.values(lessonsData.total).forEach((monthData) => {
    Object.keys(monthData).forEach((subject) => subjects.add(subject));
  });
  Object.values(lessonsData.cancelled).forEach((monthData) => {
    Object.keys(monthData).forEach((subject) => subjects.add(subject));
  });

  // Calculate totals for each subject
  const chartData = Array.from(subjects).map((subject) => {
    // Calculate total lessons
    let totalLessons = 0;
    Object.values(lessonsData.total).forEach((monthData) => {
      totalLessons += monthData[subject] || 0;
    });

    // Calculate cancelled lessons
    let cancelledLessons = 0;
    Object.values(lessonsData.cancelled).forEach((monthData) => {
      cancelledLessons += monthData[subject] || 0;
    });

    // Calculate absences
    const absences = absenceData.filter(
      (a) => a.subjectName === subject
    ).length;

    return {
      subject,
      totalWithCancelled: totalLessons + cancelledLessons,
      totalReal: totalLessons,
      absences: absences,
    };
  });

  // Sort subjects by total lessons descending
  chartData.sort((a, b) => b.totalWithCancelled - a.totalWithCancelled);

  // Update recommender title with total counts
  const totalWithCancelled = chartData.reduce(
    (sum, item) => sum + item.totalWithCancelled,
    0
  );
  const totalReal = chartData.reduce((sum, item) => sum + item.totalReal, 0);
  const totalAbsences = chartData.reduce((sum, item) => sum + item.absences, 0);

  document.getElementById(
    "recommenderTitle"
  ).textContent = `Absence Recommender (Total: ${totalWithCancelled}, Real: ${totalReal}, Absences: ${totalAbsences})`;

  // Clear previous warnings
  warningsContainer.innerHTML = "";

  // Add warning messages for each subject
  chartData.forEach((d) => {
    if (!d.subject || !d.totalReal) return; // Skip if subject or totalReal is undefined
    let frac = find_rational((d.totalReal - d.absences) / d.totalReal, 10);
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
    let warning = attendanceWarnings.get(fracDem);
    if (warning) {
      let subjectName;

      if (d.subject?.split("-").length < 2)
        subjectName = capitalizeFirstLetter(d.subject?.toLowerCase());
      else
        subjectName = d.subject
          .split("-")[1]
          ?.replace(/[0-9]/g, "")
          ?.toLowerCase();

      if (subjectName) {
        const warningElement = document.createElement("div");
        warningElement.className = `${warning.bgColor} border ${warning.borderColor} ${warning.textColor} px-4 py-3 rounded relative`;
        warningElement.innerHTML = `<strong>${capitalizeFirstLetter(
          subjectName
        )}</strong>: ${warning.message}`;
        warningsContainer.appendChild(warningElement);
      }
    }
  });

  // Create progress bar
  const progressContainer = document.getElementById("progressContainer");
  const totalAbsenceRate = totalReal > 0 ? totalAbsences / totalReal : 0;
  const maxRate = 1 / 3;
  const percentage = Math.min((totalAbsenceRate / maxRate) * 100, 100);

  // Determine color based on percentage
  let progressColor;
  if (percentage <= 30) progressColor = "bg-green-500";
  else if (percentage <= 60) progressColor = "bg-yellow-500";
  else if (percentage <= 85) progressColor = "bg-orange-500";
  else progressColor = "bg-red-500";

  progressContainer.innerHTML = `
    <div class="w-full bg-gray-200 rounded-full h-4 mb-2">
      <div class="${progressColor} h-4 rounded-full" style="width: ${percentage}%"></div>
    </div>
    <div class="text-sm text-gray-600 text-center">
      Total Absence Rate: ${(totalAbsenceRate * 100).toFixed(1)}% / Maximum: ${(
    maxRate * 100
  ).toFixed(1)}%
    </div>
  `;

  // Filter out invalid data before creating chart
  const validChartData = chartData.filter((d) => d.subject && d.totalReal);

  recommenderChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: validChartData.map((d) => {
        let subjectName;
        if (d.subject?.split("-").length < 2)
          subjectName = capitalizeFirstLetter(d.subject?.toLowerCase());
        else
          subjectName = d.subject
            ?.split("-")[1]
            ?.replace(/[0-9]/g, "")
            ?.toLowerCase();
        if (!subjectName) return d.subject;
        const s = capitalizeFirstLetter(subjectName);
        let frac = find_rational((d.totalReal - d.absences) / d.totalReal, 10);
        if (frac.denominator - frac.numerator > 1) {
          frac.denominator = Math.round(
            frac.denominator / (frac.denominator - frac.numerator)
          );
          frac.numerator = frac.denominator - 1;
        }
        return `${s} (${frac.denominator - frac.numerator}/${
          frac.denominator
        }) ${Math.round((100 / d.totalReal) * d.absences * 10) / 10}%`;
      }),
      datasets: [
        {
          label: "Absences",
          data: validChartData.map((d) => d.absences),
          backgroundColor: "rgba(248, 113, 113, 0.5)",
          borderColor: "rgb(248, 113, 113)",
          borderWidth: 1,
          stack: "stack0",
        },
        {
          label: "Real Lessons",
          data: validChartData.map((d) => d.totalReal),
          backgroundColor: "rgba(99, 102, 241, 0.5)",
          borderColor: "rgb(99, 102, 241)",
          borderWidth: 1,
          stack: "stack0",
        },
        {
          label: "Total Lessons (incl. Cancelled)",
          data: validChartData.map((d) => d.totalWithCancelled),
          backgroundColor: "rgba(156, 163, 175, 0.5)",
          borderColor: "rgb(156, 163, 175)",
          borderWidth: 1,
          stack: "stack0",
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      //maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
      scales: {
        x: {
          stacked: false,
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Lessons",
          },
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: "Subjects",
          },
        },
      },
    },
  });
}

// Initialize settings and recommender on load
window.addEventListener("DOMContentLoaded", () => {
  // Initialize global variables for settings.js
  window.excludeReasons = [];
  window.absenceReasons = [];

  // Load recommender after settings are loaded
  loadSettings();
  loadRecommender();
});

// Add logout function
async function logout() {
  try {
    const response = await fetch("/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (data.success) {
      window.location.href = "/";
    } else {
      console.error("Logout failed");
    }
  } catch (error) {
    console.error("Error during logout:", error);
  }
}
