/*
"absenceTimes": [
      {
        "absenceId": 242746,
        "klasseId": 3463,
        "klasseName": "12f",
        "subjectId": 3618,
        "subjectName": "E5.2-En2",
        "teacherId": 426,
        "teacherName": "Sdr",
        "absenceReasonId": 116,
        "absenceReasonName": "Krank",
        "excuseStatusId": 1,
        "excuseStatusName": "entschuldigt",
        "excused": true,
        "date": 20240809,
        "startTime": 935,
        "endTime": 1020,
        "missedDays": 0,
        "missedHours": 1,
        "missedMins": 45,
        "counting": true,
        "text": "mail & schriftl Mic"
      },
*/
window.absenceReasons = ["K", "K+E", "undefined"]; //"V", "S"
window.excludeReasons = ["mail", "tel", "abgem"];

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function isRealAbsence(absence) {
  let includeIds = Object.values(
    getAbsenceReasonIds(absenceReasonsMap, window.absenceReasons)
  );
  if (window.excludeReasons.includes(absence?.text)) return false;
  if (includeIds.includes(absence?.absenceReasonId)) return true;
  return false;
}

function getAllSubjectAbsences(data, includeExcusedByMail) {
  let absences = {};
  data.absenceTimes.forEach((absence) => {
    if (!isRealAbsence(absence)) return false;
    if (absences[absence.subjectName]) {
      absences[absence.subjectName] = absences[absence.subjectName] + 1;
    } else {
      absences[absence.subjectName] = 1;
    }
  });
  Object.keys(absences).forEach((a) => {
    if (a.split("-").length < 2) return;

    absences[
      capitalizeFirstLetter(a.split("-")[1].replace(/[0-9]/g, "").toLowerCase())
    ] = absences[a];
    delete absences[a];
  });
  return absences;
}

function getAllAbsencesByMonth(data) {
  const absencesByMonth = {};

  // Get all absences with valid IDs
  const allAbsences = data.absenceTimes.filter((absence) =>
    isRealAbsence(absence)
  );

  if (allAbsences.length === 0) return {};

  // Find earliest and latest dates
  const dates = allAbsences.map((absence) => String(absence.date));
  const earliestDate = dates.reduce((a, b) => (a < b ? a : b));
  const latestDate = dates.reduce((a, b) => (a > b ? a : b));

  // Create date range
  const startYear = parseInt(earliestDate.substring(0, 4));
  const startMonth = parseInt(earliestDate.substring(4, 6));
  const endYear = parseInt(latestDate.substring(0, 4));
  const endMonth = parseInt(latestDate.substring(4, 6));

  // Initialize all months with zero
  for (let year = startYear; year <= endYear; year++) {
    const monthStart = year === startYear ? startMonth : 1;
    const monthEnd = year === endYear ? endMonth : 12;

    for (let month = monthStart; month <= monthEnd; month++) {
      const monthStr = month.toString().padStart(2, "0");
      absencesByMonth[`${year}-${monthStr}`] = 0;
    }
  }

  // Fill in actual absence counts
  allAbsences.forEach((absence) => {
    const date = String(absence.date);
    const yearMonth = `${date.substring(0, 4)}-${date.substring(4, 6)}`;
    absencesByMonth[yearMonth]++;
  });

  // Sort by date
  const sortedMonths = Object.keys(absencesByMonth).sort();
  const sortedAbsencesByMonth = {};
  sortedMonths.forEach((month) => {
    sortedAbsencesByMonth[month] = absencesByMonth[month];
  });

  return sortedAbsencesByMonth;
}

function getSubjectAbsencesByMonth(data, subjectName) {
  const absencesByMonth = {};

  // Get all absence dates for the subject
  const subjectAbsences = data.absenceTimes.filter((absence) => {
    if (!isRealAbsence(absence)) return false;
    let absenceSubject = absence.subjectName;
    if (absenceSubject.split("-").length > 1) {
      absenceSubject = capitalizeFirstLetter(
        absenceSubject.split("-")[1].replace(/[0-9]/g, "").toLowerCase()
      );
    }
    return absenceSubject === subjectName;
  });

  // Find earliest and latest dates
  if (subjectAbsences.length === 0) return {};

  const dates = subjectAbsences.map((absence) => String(absence.date));
  const earliestDate = dates.reduce((a, b) => (a < b ? a : b));
  const latestDate = dates.reduce((a, b) => (a > b ? a : b));

  // Create date range
  const startYear = parseInt(earliestDate.substring(0, 4));
  const startMonth = parseInt(earliestDate.substring(4, 6));
  const endYear = parseInt(latestDate.substring(0, 4));
  const endMonth = parseInt(latestDate.substring(4, 6));

  // Initialize all months with zero
  for (let year = startYear; year <= endYear; year++) {
    const monthStart = year === startYear ? startMonth : 1;
    const monthEnd = year === endYear ? endMonth : 12;

    for (let month = monthStart; month <= monthEnd; month++) {
      const monthStr = month.toString().padStart(2, "0");
      absencesByMonth[`${year}-${monthStr}`] = 0;
    }
  }

  // Fill in actual absence counts
  subjectAbsences.forEach((absence) => {
    const date = String(absence.date);
    const yearMonth = `${date.substring(0, 4)}-${date.substring(4, 6)}`;
    absencesByMonth[yearMonth]++;
  });

  // Sort by date
  const sortedMonths = Object.keys(absencesByMonth).sort();
  const sortedAbsencesByMonth = {};
  sortedMonths.forEach((month) => {
    sortedAbsencesByMonth[month] = absencesByMonth[month];
  });

  return sortedAbsencesByMonth;
}

function getHoursPerSubject(data) {
  let hours = {};
  data.absenceTimes.forEach((absence) => {
    if (hours[absence.subjectName]) {
      hours[absence.subjectName] +=
        absence.missedHours + absence.missedMins / 60;
    } else {
      hours[absence.subjectName] =
        absence.missedHours + absence.missedMins / 60;
    }
  });

  Object.keys(hours).forEach((a) => {
    if (a.split("-") < 2) return;
    hours[
      capitalizeFirstLetter(a.split("-")[1].replace(/[0-9]/g, "").toLowerCase())
    ] = hours[a];
    delete hours[a];
  });

  return hours;
}

function getAbsenceReasonIds(data, names) {
  const reasonIds = {};
  data.forEach((r) => {
    if (names.includes(r.name)) {
      reasonIds[r.name] = r.id;
    }
  });
  return reasonIds;
}

function getRecentAbsences(data, days) {
  const currentDate = new Date();
  const pastDate = new Date();
  pastDate.setDate(currentDate.getDate() - days);

  // Convert date format from data (YYYYMMDD) to Date object for comparison
  return data.absenceTimes
    .filter((absence) => {
      const absenceDate = new Date(
        parseInt(String(absence.date).substring(0, 4)),
        parseInt(String(absence.date).substring(4, 6)) - 1,
        parseInt(String(absence.date).substring(6, 8))
      );
      return absenceDate >= pastDate && absenceDate <= currentDate;
    })
    .filter((absence) => isRealAbsence(absence));
}

function getRecentSubjectAbsences(data, days) {
  const recentAbsences = getRecentAbsences(data, days);
  let absences = {};

  recentAbsences.forEach((absence) => {
    if (!isRealAbsence(absence)) return;

    absences[absence.subjectName] = (absences[absence.subjectName] || 0) + 1;
  });

  Object.keys(absences).forEach((a) => {
    if (a.split("-").length < 2) return;
    absences[
      capitalizeFirstLetter(a.split("-")[1].replace(/[0-9]/g, "").toLowerCase())
    ] = absences[a];
    delete absences[a];
  });

  return absences;
}

async function getSchoolYearStart() {
  //https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-NI&languageIsoCode=DE&validFrom=2023-03-04&validTo=2025-03-04URL_ADDRESS
  const date = new Date();
  let year;
  if (date.getMonth() > 6) {
    year = date.getFullYear();
  } else {
    year = date.getFullYear() - 1;
  }
  const res = await fetch(
    `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-NI&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${year}-12-30`
  );
  const data = await res.json();
  return data.filter((h) => h.name[0].text == "Sommerferien")[0].endDate;
}

function getRealLessonsUntilDay(data, targetDay) {
  // Convert target day to Date object for comparison
  const targetDate = new Date(targetDay);

  // Initialize result object to store lessons by subject
  let totalLessons = 0;

  // Process each day in the timetable data
  if (data?.totalByDay) {
    Object.keys(data.totalByDay).forEach((day) => {
      if (new Date(day) > targetDate) return;
      // Process each lesson in the day
      totalLessons += Object.values(data.totalByDay[day])?.reduce(
        (acc, lessonNum) => (acc += lessonNum),
        0
      );
    });
  }

  return totalLessons;
}

function getAbsencesUntilDay(data, targetDay) {
  const targetDate = new Date(targetDay);
  let totalAbsences = 0;

  if (data?.absenceTimes) {
    data.absenceTimes.forEach((absence) => {
      const absenceDate = new Date(
        parseInt(String(absence.date).substring(0, 4)),
        parseInt(String(absence.date).substring(4, 6)) - 1,
        parseInt(String(absence.date).substring(6, 8))
      );

      if (absenceDate <= targetDate) {
        totalAbsences++;
      }
    });
  }

  return totalAbsences;
}

function getDailyAbsenceTrend(absenceData, timetableData, days = 30) {
  let absencesByDay = {};
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().substring(0, 10);
    absencesByDay[dateString] =
      Math.round(
        (100 / getRealLessonsUntilDay(timetableData, dateString)) *
          getAbsencesUntilDay(absenceData, dateString) *
          1000
      ) / 1000;
  }
  return absencesByDay;
}
