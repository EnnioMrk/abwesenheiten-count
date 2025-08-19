const summarySection = document.getElementById('summarySection');

// Pre-create SVG templates to avoid repeated innerHTML updates
const SVG_TEMPLATES = {
    increase: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
        <path fill-rule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clip-rule="evenodd" />
    </svg>`,
    decrease: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 transform rotate-180">
        <path fill-rule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clip-rule="evenodd" />
    </svg>`,
    noChange: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
        <path fill-rule="evenodd" d="M10 2a.75.75 0 01.75.75v7.5h7.5a.75.75 0 010 1.5h-7.5v7.5a.75.75 0 01-1.5 0v-7.5h-7.5a.75.75 0 010-1.5h7.5v-7.5A.75.75 0 0110 2z" clip-rule="evenodd" />
    </svg>`,
    severity: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.343 10.75a.75.75 0 00-1.186.918l1.643 2.121a.75.75 0 001.214-.882l3.236-4.53a.75.75 0 00-.393-1.096z" clip-rule="evenodd" />
    </svg>`,
};

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
            const svgTemplate = isIncrease
                ? SVG_TEMPLATES.increase
                : SVG_TEMPLATES.decrease;
            const trendText = isIncrease ? 'increase' : 'decrease';

            trendElement.innerHTML = `${svgTemplate}<span>${changeText} ${trendText}</span>`;
        } else {
            trendElement.innerHTML = `${SVG_TEMPLATES.noChange}<span class="text-gray-500">No change</span>`;
        }
    } else if (trendElement && !showTrend) {
        // Show severity text for All Time card based on absence percentage
        if (absencePercentage !== null) {
            const severityInfo = getSeverityInfo(absencePercentage);
            trendElement.innerHTML = `${SVG_TEMPLATES.severity.replace(
                'w-4 h-4',
                `w-4 h-4 ${severityInfo.color}`
            )}<span class="${severityInfo.color}">${severityInfo.text}</span>`;
        } else {
            trendElement.style.display = 'none';
        }
    }
}

// Optimize severity calculation into a separate function
function getSeverityInfo(absencePercentage) {
    if (absencePercentage >= 20) {
        return { text: 'Critical', color: 'text-red-600' };
    } else if (absencePercentage >= 15) {
        return { text: 'High', color: 'text-orange-600' };
    } else if (absencePercentage >= 10) {
        return { text: 'Medium', color: 'text-yellow-600' };
    } else if (absencePercentage >= 5) {
        return { text: 'Low', color: 'text-green-600' };
    } else {
        return { text: 'Excellent', color: 'text-green-700' };
    }
}

// Add stat cards using document fragment for better performance
const fragment = document.createDocumentFragment();
fragment.appendChild(
    createStatCard('Last 7 Days', 'last7DaysCount', 'trend7Days', 'green')
);
fragment.appendChild(
    createStatCard('Last 14 Days', 'last14DaysCount', 'trend14Days', 'blue')
);
fragment.appendChild(
    createStatCard('Last 30 Days', 'last30DaysCount', 'trend30Days', 'purple')
);
fragment.appendChild(
    createStatCard('All Time', 'allTimeCount', 'trendAllTime', 'red')
);
summarySection.appendChild(fragment);

// Cache expensive calculations only if not already cached
let dataCache;
if (!window.absencesSummaryCache) {
    window.absencesSummaryCache = {
        last7Days: analyser.filterAbsencesByDays(7),
        last14Days: analyser.filterAbsencesByDays(14),
        last30Days: analyser.filterAbsencesByDays(30),
        prev7Days: analyser.filterAbsencesByDays(7, 7),
        prev14Days: analyser.filterAbsencesByDays(14, 14),
        prev30Days: analyser.filterAbsencesByDays(30, 30),
        prevAllTime:
            analyser.absencesData.length > 0
                ? analyser.absencesData.slice(0, -1)
                : [],
        totalAbsencePercentage: analyser.getTotalAbsencePercentage(),
    };
}
dataCache = window.absencesSummaryCache;

// Update all stat cards directly
updateStatCard(
    'last7DaysCount',
    'trend7Days',
    dataCache.last7Days.length,
    dataCache.prev7Days.length,
    'green'
);

updateStatCard(
    'last14DaysCount',
    'trend14Days',
    dataCache.last14Days.length,
    dataCache.prev14Days.length,
    'blue'
);

updateStatCard(
    'last30DaysCount',
    'trend30Days',
    dataCache.last30Days.length,
    dataCache.prev30Days.length,
    'purple'
);

updateStatCard(
    'allTimeCount',
    'trendAllTime',
    analyser.absencesData.length,
    dataCache.prevAllTime.length,
    'red',
    false,
    dataCache.totalAbsencePercentage
);

const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

// Simple resize handler
function setSummarySectionCols() {
    const width = summarySection.clientWidth;
    if (width === 0) return; // Skip if no width

    let cols = Math.round(width / (230 + rem) - 0.1);
    if (cols == 0) cols = 1;
    if (cols == 3) cols = 2;
    if (cols == 4) cols = 2;
    if (cols > 4) cols = 4;

    summarySection.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
}

// Set initial column layout
setTimeout(() => {
    setSummarySectionCols();
}, 100);

// Add resize listener
window.addEventListener('resize', setSummarySectionCols);

// Cleanup function to remove event listeners
window.cleanupAbsencesSummary = function () {
    window.removeEventListener('resize', setSummarySectionCols);
    // Clear cache
    delete window.absencesSummaryCache;
};

// Auto-cleanup on page unload
window.addEventListener('beforeunload', window.cleanupAbsencesSummary, {
    once: true,
});
