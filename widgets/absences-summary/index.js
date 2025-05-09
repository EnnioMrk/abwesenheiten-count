const summarySection = document.getElementById("summarySection");

function createStatCard(title, countId, trendId, colorClass) {
  const summaryTemplate = document.getElementById("summaryTemplate");
  const card = summaryTemplate.content.cloneNode(true);
  card.querySelector(".summaryCardTitle").textContent = title;
  card.querySelector(".summaryCardCount").id = countId;
  card.querySelector(".summaryCardTrend").id = trendId;
  card
    .querySelector(".summaryCardTrend")
    .classList.add(`text-${colorClass}-600`);
  card
    .querySelector(".summaryCardIcon")
    .classList.add(`text-${colorClass}-500`, `bg-${colorClass}-50`);
  return card;
}

function updateStatCard(countId, trendId, currentCount, previousCount, color) {
  const countElement = document.getElementById(countId);
  const trendElement = document.getElementById(trendId);

  if (countElement) {
    countElement.textContent = currentCount;
  }

  if (trendElement) {
    const percentChange =
      previousCount === 0
        ? 100
        : ((currentCount - previousCount) / previousCount) * 100;
    const isIncrease = percentChange > 0;
    const changeText = Math.abs(percentChange).toFixed(1) + "%";

    trendElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 ${
        isIncrease ? "" : "transform rotate-180"
      }">
        <path fill-rule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clip-rule="evenodd" />
      </svg>
      <span>${changeText} ${isIncrease ? "increase" : "decrease"}</span>
    `;
  }
}

// Add stat cards
await summarySection.appendChild(
  createStatCard("Last 7 Days", "last7DaysCount", "trend7Days", "green")
);
await summarySection.appendChild(
  createStatCard("Last 14 Days", "last14DaysCount", "trend14Days", "blue")
);
await summarySection.appendChild(
  createStatCard("Last 30 Days", "last30DaysCount", "trend30Days", "purple")
);
await summarySection.appendChild(
  createStatCard("All Time", "allTimeCount", "trendAllTime", "red")
);

const last7Days = analyser.filterAbsencesByDays(7);
const last14Days = analyser.filterAbsencesByDays(14);
const last30Days = analyser.filterAbsencesByDays(30);

// Calculate previous period counts for trend comparison
const prev7Days = analyser.filterAbsencesByDays(7, 7);
const prev14Days = analyser.filterAbsencesByDays(14, 14);
const prev30Days = analyser.filterAbsencesByDays(30, 30);
const prevAllTime =
  analyser.absencesData.length > 0 ? analyser.absencesData.slice(0, -1) : [];

// Update stat cards with counts and trends
updateStatCard(
  "last7DaysCount",
  "trend7Days",
  last7Days.length,
  prev7Days.length,
  "green"
);
updateStatCard(
  "last14DaysCount",
  "trend14Days",
  last14Days.length,
  prev14Days.length,
  "blue"
);
updateStatCard(
  "last30DaysCount",
  "trend30Days",
  last30Days.length,
  prev30Days.length,
  "purple"
);
updateStatCard(
  "allTimeCount",
  "trendAllTime",
  analyser.absencesData.length,
  prevAllTime.length,
  "red"
);

const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

function setSummarySectionCols() {
  let cols = Math.round(summarySection.clientWidth / (230 + rem) - 0.1);
  if (cols == 0) cols = 1;
  if (cols == 3) cols = 2;
  if (cols == 4) cols = 2;
  if (cols > 4) cols = 4;
  summarySection.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
}

setTimeout(() => {
  setSummarySectionCols();
}, 100);

window.addEventListener("resize", setSummarySectionCols);
