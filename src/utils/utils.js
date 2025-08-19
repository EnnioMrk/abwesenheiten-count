/*export async function getSchoolYearStart() {
  //check if current month is after june
  const date = new Date();
  let year;
  if (date.getMonth() > 6) {
    year = date.getFullYear();
  } else {
    year = date.getFullYear() - 1;
  }
  const res = await fetch(`https://ferien-api.de/api/v1/holidays/NI/${year}`);
  const data = await res.json();
  return data.filter((h) => h.name.includes("sommerferien"))[0].end;
}*/

export async function getSchoolYearStart() {
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
    return data.filter((h) => h.name[0].text == 'Sommerferien')[0].endDate;
}

export async function getAllLessonCount(data) {
    const totalLessons = {};
    const cancelledLessons = {};

    data.days.forEach((day) => {
        day.gridEntries.forEach((subject) => {
            const subjectName = subject.position2[0]?.current?.shortName;
            if (!/^[EGK]\d/.test(subjectName) && subjectName.length > 3) return;
            if (
                subject.status == 'CANCELLED' ||
                (subject.status == 'CHANGED' &&
                    subject.position1[0].status == 'ADDED' &&
                    subject.position1[0].shortName?.startsWith('NN'))
            ) {
                if (cancelledLessons[subjectName]) {
                    cancelledLessons[subjectName] =
                        cancelledLessons[subjectName] + 1;
                } else {
                    cancelledLessons[subjectName] = 1;
                }
                return;
            }

            if (totalLessons[subjectName]) {
                totalLessons[subjectName] = totalLessons[subjectName] + 1;
            } else {
                totalLessons[subjectName] = 1;
            }
        });
    });

    return { total: totalLessons, cancelled: cancelledLessons };
}

export async function getAllLessonCountAllMonths(data) {
    const totalLessonsByMonth = {};
    const cancelledLessonsByMonth = {};
    const totalLessonsByDay = {};
    const cancelledLessonsByDay = {};

    data.days.forEach((day) => {
        const monthKey = `${day.gridEntries[0]?.duration?.start.slice(0, 7)}`;
        const dateKey = day.gridEntries[0]?.duration?.start.slice(0, 10);

        if (monthKey == undefined || monthKey == 'undefined') return;

        // Initialize month objects
        if (!totalLessonsByMonth[monthKey]) {
            totalLessonsByMonth[monthKey] = {};
        }
        if (!cancelledLessonsByMonth[monthKey]) {
            cancelledLessonsByMonth[monthKey] = {};
        }

        // Initialize day objects
        if (!totalLessonsByDay[dateKey]) {
            totalLessonsByDay[dateKey] = {};
        }
        if (!cancelledLessonsByDay[dateKey]) {
            cancelledLessonsByDay[dateKey] = {};
        }

        day.gridEntries.forEach((subject) => {
            const subjectName = subject.position2[0]?.current?.shortName;
            if (!/^[EGK]\d/.test(subjectName) && subjectName.length > 3) return;

            // Handle cancelled lessons
            if (
                subject.status == 'CANCELLED' ||
                (subject.status == 'CHANGED' &&
                    subject.position1[0].status == 'ADDED' &&
                    subject.position1[0].shortName?.startsWith('NN'))
            ) {
                // Monthly tracking
                if (cancelledLessonsByMonth[monthKey][subjectName]) {
                    cancelledLessonsByMonth[monthKey][subjectName] +=
                        subject.ids.length;
                } else {
                    cancelledLessonsByMonth[monthKey][subjectName] =
                        subject.ids.length;
                }
                // Daily tracking
                if (cancelledLessonsByDay[dateKey][subjectName]) {
                    cancelledLessonsByDay[dateKey][subjectName] +=
                        subject.ids.length;
                } else {
                    cancelledLessonsByDay[dateKey][subjectName] =
                        subject.ids.length;
                }
                return;
            }

            // Handle regular lessons
            // Monthly tracking
            if (totalLessonsByMonth[monthKey][subjectName]) {
                totalLessonsByMonth[monthKey][subjectName] +=
                    subject.ids.length;
            } else {
                totalLessonsByMonth[monthKey][subjectName] = subject.ids.length;
            }
            // Daily tracking
            if (totalLessonsByDay[dateKey][subjectName]) {
                totalLessonsByDay[dateKey][subjectName] += subject.ids.length;
            } else {
                totalLessonsByDay[dateKey][subjectName] = subject.ids.length;
            }
        });
    });

    return {
        total: totalLessonsByMonth,
        cancelled: cancelledLessonsByMonth,
        totalByDay: totalLessonsByDay,
        cancelledByDay: cancelledLessonsByDay,
    };
}
