const summarySection = document.getElementById('summarySection');

function createStatCard(title, countId, trendId, colorClass) {
    const summaryTemplate = document.getElementById('summaryTemplate');
    const card = summaryTemplate.content.cloneNode(true);
    card.querySelector('.summaryCardTitle').textContent = title;
    card.querySelector('.summaryCardCount').id = countId;
    card.querySelector('.summaryCardTrend').id = trendId;
    card.querySelector('.summaryCardTrend').classList.add(
        `text-${colorClass}-600`
    );
    card.querySelector('.summaryCardIcon').classList.add(
        `text-${colorClass}-500`,
        `bg-${colorClass}-50`
    );
    return card;
}

function updateStatCard(
    countId,
    trendId,
    currentCount,
    previousCount,
    color,
    showTrend = true,
    absencePercentage = null
) {
    const countElement = document.getElementById(countId);
    const trendElement = document.getElementById(trendId);

    if (countElement) {
        countElement.textContent = currentCount;
    }

    if (trendElement && showTrend) {
        // Handle special cases for percentage calculation
        let percentChange;
        let displayTrend = true;

        if (currentCount === 0 && previousCount === 0) {
            // Both are 0, don't show any trend
            displayTrend = false;
        } else if (previousCount === 0 && currentCount > 0) {
            // Previous was 0, current is positive - this is a new increase
            percentChange = 100; // or could be Infinity, but 100% is more user-friendly
        } else if (previousCount > 0 && currentCount === 0) {
            // Previous was positive, current is 0 - this is a 100% decrease
            percentChange = -100;
        } else if (previousCount === 0) {
            // Edge case: previous is 0 but current is also 0 (handled above)
            displayTrend = false;
        } else {
            // Normal calculation
            percentChange =
                ((currentCount - previousCount) / previousCount) * 100;
        }

        if (displayTrend && percentChange !== 0) {
            const isIncrease = percentChange > 0;
            const changeText = Math.abs(percentChange).toFixed(1) + '%';

            trendElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 ${
            isIncrease ? '' : 'transform rotate-180'
        }">
          <path fill-rule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clip-rule="evenodd" />
        </svg>
        <span>${changeText} ${isIncrease ? 'increase' : 'decrease'}</span>
      `;
        } else {
            // No change or both values are 0
            trendElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
          <path fill-rule="evenodd" d="M10 2a.75.75 0 01.75.75v7.5h7.5a.75.75 0 010 1.5h-7.5v7.5a.75.75 0 01-1.5 0v-7.5h-7.5a.75.75 0 010-1.5h7.5v-7.5A.75.75 0 0110 2z" clip-rule="evenodd" />
        </svg>
        <span class="text-gray-500">No change</span>
      `;
        }
    } else if (trendElement && !showTrend) {
        // Show severity text for All Time card based on absence percentage
        if (absencePercentage !== null) {
            let severityText = '';
            let severityColor = '';

            if (absencePercentage >= 20) {
                severityText = 'Critical';
                severityColor = 'text-red-600';
            } else if (absencePercentage >= 15) {
                severityText = 'High';
                severityColor = 'text-orange-600';
            } else if (absencePercentage >= 10) {
                severityText = 'Medium';
                severityColor = 'text-yellow-600';
            } else if (absencePercentage >= 5) {
                severityText = 'Low';
                severityColor = 'text-green-600';
            } else {
                severityText = 'Excellent';
                severityColor = 'text-green-700';
            }

            trendElement.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 ${severityColor}">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.343 10.75a.75.75 0 00-1.186.918l1.643 2.121a.75.75 0 001.214-.882l3.236-4.53a.75.75 0 00-.393-1.096z" clip-rule="evenodd" />
                </svg>
                <span class="${severityColor}">${severityText}</span>
            `;
        } else {
            // Hide the trend element if no percentage provided
            trendElement.style.display = 'none';
        }
    }
}

// Add stat cards
summarySection.appendChild(
    createStatCard('Last 7 Days', 'last7DaysCount', 'trend7Days', 'green')
);
summarySection.appendChild(
    createStatCard('Last 14 Days', 'last14DaysCount', 'trend14Days', 'blue')
);
summarySection.appendChild(
    createStatCard('Last 30 Days', 'last30DaysCount', 'trend30Days', 'purple')
);
summarySection.appendChild(
    createStatCard('All Time', 'allTimeCount', 'trendAllTime', 'red')
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

// Calculate absence percentage for All Time severity
const totalAbsencePercentage = analyser.getTotalAbsencePercentage();

// Update stat cards with counts and trends
updateStatCard(
    'last7DaysCount',
    'trend7Days',
    last7Days.length,
    prev7Days.length,
    'green'
);
updateStatCard(
    'last14DaysCount',
    'trend14Days',
    last14Days.length,
    prev14Days.length,
    'blue'
);
updateStatCard(
    'last30DaysCount',
    'trend30Days',
    last30Days.length,
    prev30Days.length,
    'purple'
);
updateStatCard(
    'allTimeCount',
    'trendAllTime',
    analyser.absencesData.length,
    prevAllTime.length,
    'red',
    false, // Don't show trend for All Time - show severity instead
    totalAbsencePercentage // Pass the absence percentage for severity calculation
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

window.addEventListener('resize', setSummarySectionCols);
