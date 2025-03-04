let rawData;
let recommenderChart = null;

const attendanceWarnings = new Map([
  [
    10,
    {
      message: "Fehlzeiten minimal - Schwänzen unbedenklich",
      bgColor: "bg-green-100",
      borderColor: "border-green-400",
      textColor: "text-green-700",
    },
  ],
  [
    9,
    {
      message: "Fehlzeiten sehr gering - Schwänzen in Ordnung",
      bgColor: "bg-green-200",
      borderColor: "border-green-500",
      textColor: "text-green-800",
    },
  ],
  [
    8,
    {
      message: "Fehlzeiten leicht - erhöht Vorsicht",
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
      message: "Fehlzeiten hoch - Schwänzen nicht ratsam",
      bgColor: "bg-orange-100",
      borderColor: "border-orange-400",
      textColor: "text-orange-700",
    },
  ],
  [
    5,
    {
      message: "Fehlzeiten kritisch - Schwänzen riskant",
      bgColor: "bg-orange-200",
      borderColor: "border-orange-500",
      textColor: "text-orange-800",
    },
  ],
  [
    4,
    {
      message: "Fehlzeiten extrem - sehr hoch Teilnahme notwendig",
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

    createRecommenderChart(rawData, lessonsData);
  } catch (error) {
    console.error("Error loading recommender:", error);
  }
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

  // Create a container for warning messages
  const warningsContainer = document.createElement("div");
  warningsContainer.id = "warningsContainer";
  warningsContainer.className = "mt-4 space-y-2";
  document
    .getElementById("recommenderChart")
    .parentNode.appendChild(warningsContainer);

  // Get all unique subjects from both absence and lesson data
  const subjects = new Set();

  // Add subjects from absence data
  absenceData.absenceTimes.forEach((absence) => subjects.add(absence.subject));

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
    const absences = absenceData.absenceTimes.filter(
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
        const frac = find_rational(
          (d.totalReal - d.absences) / d.totalReal,
          10
        );
        return `${s} (${frac.denominator - frac.numerator}/${
          frac.denominator
        })`;
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

// Initialize recommender on load
loadRecommender();

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
